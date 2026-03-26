// ─────────────────────────────────────────────────────────
// LAYER 5 — PAYOUT INSTRUCTION ENGINE
// ─────────────────────────────────────────────────────────
// When a Claim reaches "approved" status, this module is
// responsible for actually paying out the worker.
//
// PHASE 3 IMPLEMENTATION:
//   - Connects to Razorpay Test Mode
//   - Simulates an instant payout to the worker's UPI/IMPS
//   - Logs the transaction to the underwriter ledger
//   - Updates the Claim record with "paid" status
//
// To use real Razorpay payouts, set in your .env:
//   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
//   RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXX
// ─────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Simulates a Razorpay payout in Test Mode.
 * In production, this calls the real Razorpay API.
 *
 * @param {object} claim   - Claim record from PostgreSQL
 * @param {object} worker  - Worker record from PostgreSQL
 * @returns {object} Transaction result with UTR number and status
 */
async function executePayoutForClaim(claim, worker) {

  // Only process claims that are approved and haven't been paid yet
  if (claim.payoutStatus !== 'approved') {
    return {
      success: false,
      reason: `Cannot pay claim with status: ${claim.payoutStatus}. Only "approved" claims are payable.`
    };
  }

  if (claim.payoutAmount <= 0) {
    return {
      success: false,
      reason: 'Claim has a zero payout amount — nothing to transfer.'
    };
  }

  // ── RAZORPAY INTEGRATION ──────────────────────────────
  let transactionId = null;
  let payoutStatus  = 'simulated';

  // Check if real Razorpay credentials are configured
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id') {
    
    try {
      // Import Razorpay SDK (npm install razorpay is needed)
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      // Create a payout (Razorpay X feature — requires X account)
      const payoutResponse = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: worker.razorpayFundAccountId || 'fa_mock001',
        amount: Math.round(claim.payoutAmount * 100), // Razorpay uses paise (1/100th rupee)
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: claim.id,
        narration: `GigShield Payout - Disruption on ${new Date(claim.disruptionStartTime).toDateString()}`
      });

      transactionId = payoutResponse.id;
      payoutStatus  = 'paid';
      console.log(`[Payout] ✅ Real Razorpay payout created: ${transactionId}`);

    } catch (err) {
      console.warn(`[Payout] Razorpay API call failed: ${err.message}. Falling back to simulation.`);
      payoutStatus = 'simulated';
    }
  }

  // ── SIMULATION MODE ───────────────────────────────────
  // If no Razorpay credentials are set, we simulate the payout.
  // This is perfect for the hackathon demo — it still writes the
  // full transaction to the underwriter ledger.
  if (payoutStatus === 'simulated') {
    // Generate a fake but realistic-looking UTR (Unique Transaction Reference) number
    const utrNumber = `UTR${Date.now()}${Math.floor(Math.random() * 100000)}`;
    transactionId = utrNumber;
    console.log(`[Payout] 🔵 Simulated payout for claim ${claim.id}: UTR ${utrNumber}`);
  }

  // ── UPDATE THE CLAIM RECORD ───────────────────────────
  await prisma.claim.update({
    where: { id: claim.id },
    data:  { payoutStatus: payoutStatus }  // "paid" or "simulated"
  });

  // ── LOG TO UNDERWRITER LEDGER ─────────────────────────
  const logEntry = {
    timestamp:     new Date().toISOString(),
    claimId:       claim.id,
    workerId:      claim.workerId,
    zone:          worker.zone,
    payoutAmount:  `₹${claim.payoutAmount}`,
    transactionId: transactionId,
    payoutStatus:  payoutStatus,
    disruptionType: claim.disruptionType,
    hoursLost:     claim.hoursLost
  };

  console.log(`[Underwriter Ledger] Transaction recorded:`, JSON.stringify(logEntry, null, 2));

  return {
    success:       true,
    transactionId: transactionId,
    payoutStatus:  payoutStatus,
    payoutAmount:  claim.payoutAmount,
    ledgerEntry:   logEntry
  };
}

module.exports = { executePayoutForClaim };
