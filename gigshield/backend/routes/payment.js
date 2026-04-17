// ─────────────────────────────────────────────────────────
// PAYMENT ROUTES — routes/payment.js
// ─────────────────────────────────────────────────────────
// Handles the full Razorpay payment lifecycle:
//
//   POST /api/payment/create-order  → Creates Razorpay order + DB record
//   POST /api/payment/verify        → Verifies HMAC signature + updates DB
//   GET  /api/payment/history       → Fetches all payments (newest first)
//   GET  /api/payment/analytics     → Aggregated stats for admin dashboard
// ─────────────────────────────────────────────────────────

const express = require('express');
const crypto  = require('crypto');
const Razorpay = require('razorpay');
const prisma  = require('../prismaClient');

const router = express.Router();

// ── RAZORPAY INSTANCE ─────────────────────────────────────
// Reads your test keys from .env
// RAZORPAY_KEY_ID=rzp_test_XXXX
// RAZORPAY_KEY_SECRET=XXXXXXXXXXXX
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// ─────────────────────────────────────────────────────────
// STEP 1: POST /api/payment/create-order
// ─────────────────────────────────────────────────────────
// Accepts  { amount, currency?, workerHash?, description? }
// amount is in RUPEES — we convert to paise (×100) here.
// Creates a Razorpay order and saves a PENDING row to DB.
// ─────────────────────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const {
    amount,                        // In rupees (e.g. 75 for ₹75)
    currency    = 'INR',
    workerHash  = null,            // Optional: link to a worker
    description = 'RouteSafe Insurance Weekly Premium'
  } = req.body;

  // Validate amount
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid amount. Must be a positive number in rupees.'
    });
  }

  const amountInPaise = Math.round(Number(amount) * 100); // ₹75 → 7500 paise

  try {
    // ── STEP 1a: Create order on Razorpay ─────────────────
    const razorpayOrder = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: currency,
      receipt:  `RouteSafe Insurance_${Date.now()}`,  // Unique receipt ID
      notes: {
        description,
        workerHash: workerHash || 'anonymous'
      }
    });

    // ── STEP 1b: Save PENDING payment record to PostgreSQL ─
    const payment = await prisma.payment.create({
      data: {
        orderId:     razorpayOrder.id,      // e.g. "order_P1234ABCDE"
        amount:      amountInPaise,
        currency:    currency,
        status:      'PENDING',
        workerHash:  workerHash,
        description: description,
      }
    });

    console.log(`[Payment] Order created: ${razorpayOrder.id} — ₹${amount}`);

    // Return what the frontend needs to open the Razorpay checkout
    res.json({
      success:  true,
      orderId:  razorpayOrder.id,
      amount:   amountInPaise,
      currency: currency,
      paymentDbId: payment.id,
      // Key is safe to send — it's the public key ID
      keyId:    process.env.RAZORPAY_KEY_ID,
    });

  } catch (err) {
    console.error(`[Payment] create-order failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ─────────────────────────────────────────────────────────
// STEP 2: POST /api/payment/verify
// ─────────────────────────────────────────────────────────
// Accepts  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies the HMAC-SHA256 signature from Razorpay.
// Updates the Payment record in DB to SUCCESS or FAILED.
// ─────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature'
    });
  }

  // ── STEP 2a: Verify HMAC SHA256 signature ─────────────
  // Razorpay signs: order_id + "|" + payment_id
  // using your KEY_SECRET as the HMAC key
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = expectedSignature === razorpay_signature;
  const newStatus = isValid ? 'SUCCESS' : 'FAILED';

  console.log(`[Payment] Verify ${razorpay_order_id}: ${newStatus}`);

  try {
    // ── STEP 2b: Update payment record in DB ──────────────
    const payment = await prisma.payment.update({
      where:  { orderId: razorpay_order_id },
      data: {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status:    newStatus,
      }
    });

    if (isValid) {
      res.json({
        success:   true,
        status:    'SUCCESS',
        paymentId: razorpay_payment_id,
        amount:    payment.amount / 100,  // Convert back to rupees for display
        message:   '✅ Payment verified and recorded successfully!'
      });
    } else {
      res.status(400).json({
        success: false,
        status:  'FAILED',
        message: '❌ Payment signature verification failed. Possible tampering detected.'
      });
    }

  } catch (err) {
    // If payment record not found (e.g. order never created), still respond
    console.error(`[Payment] verify update failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ─────────────────────────────────────────────────────────
// STEP 6: GET /api/payment/history
// ─────────────────────────────────────────────────────────
// Returns all payments sorted newest first.
// Optional query: ?status=SUCCESS|FAILED|PENDING
//                 ?limit=50
// ─────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  const { status, limit = '100' } = req.query;

  try {
    const payments = await prisma.payment.findMany({
      where:   status ? { status: status.toUpperCase() } : {},
      orderBy: { createdAt: 'desc' },
      take:    Math.min(parseInt(limit), 500),  // Cap at 500 rows
    });

    res.json({
      success: true,
      count:   payments.length,
      payments,
    });

  } catch (err) {
    console.error(`[Payment] history fetch failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ─────────────────────────────────────────────────────────
// STEP 7: GET /api/payment/analytics
// ─────────────────────────────────────────────────────────
// Returns aggregated KPIs for the admin dashboard:
//   totalPayments, totalRevenue, successCount,
//   failedCount, pendingCount, lossRatio
// ─────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const [all, successPayments, failedCount, pendingCount] = await Promise.all([
      prisma.payment.findMany(),
      prisma.payment.findMany({ where: { status: 'SUCCESS' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
    ]);

    const totalPayments  = all.length;
    const successCount   = successPayments.length;
    const totalRevenue   = successPayments.reduce((s, p) => s + p.amount, 0) / 100; // in ₹

    // Loss ratio = failed / total (as percentage)
    const lossRatio = totalPayments > 0
      ? Math.round((failedCount / totalPayments) * 100 * 10) / 10
      : 0;

    // Daily breakdown for the last 14 days
    const dailyMap = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dailyMap[key] = { date: key, success: 0, failed: 0, revenue: 0 };
    }
    all.forEach(p => {
      const key = new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (dailyMap[key]) {
        if (p.status === 'SUCCESS') { dailyMap[key].success++; dailyMap[key].revenue += p.amount / 100; }
        if (p.status === 'FAILED')  dailyMap[key].failed++;
      }
    });

    res.json({
      success: true,
      analytics: {
        totalPayments,
        successCount,
        failedCount,
        pendingCount,
        totalRevenue,
        lossRatio,
        successRate: totalPayments > 0
          ? Math.round((successCount / totalPayments) * 100 * 10) / 10
          : 0,
        dailyBreakdown: Object.values(dailyMap),
      }
    });

  } catch (err) {
    console.error(`[Payment] analytics failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
