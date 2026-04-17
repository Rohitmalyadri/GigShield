// ─────────────────────────────────────────────────────────
// RISK & COMPENSATION API ROUTES — routes/risk.js
// ─────────────────────────────────────────────────────────
//
// GET  /api/risk/score/:zoneId         → Latest stored risk score
// GET  /api/risk/zones                 → All zones with latest scores
// POST /api/risk/simulate              → Calculate score from inputs (no DB)
// POST /api/risk/evaluate              → Full evaluation + store + decision
// POST /api/compensation/calculate     → Eligible workers + payout amounts
// GET  /api/analytics/dashboard        → Full admin KPI dashboard
// GET  /api/risk/history/:zoneId       → Risk score history for a zone
// ─────────────────────────────────────────────────────────

'use strict';

const express  = require('express');
const prisma   = require('../prismaClient');
const { calculateRiskScore, getLatestZoneRisk, getAllZoneRisks } = require('../risk/riskEngine');
const { makeDecision, DECISION_MODES, logDecision }               = require('../risk/decisionEngine');
const { calculateZoneCompensation, addPremiumToPool }             = require('../risk/compensationEngine');
const { broadcast }                                               = require('../socket/socketManager');

const router = express.Router();

// ─────────────────────────────────────────────────────────
// GET /api/risk/score/:zoneId
// Returns the most recent risk record for a zone.
// ─────────────────────────────────────────────────────────
router.get('/score/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  try {
    const record = await getLatestZoneRisk(zoneId);
    if (!record) {
      return res.json({
        success: true,
        zoneId,
        message: 'No risk evaluation found for this zone. Use POST /api/risk/evaluate first.',
        riskScore: null,
      });
    }
    res.json({ success: true, ...record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/risk/zones
// Returns latest risk score for every zone that has been evaluated.
// ─────────────────────────────────────────────────────────
router.get('/zones', async (req, res) => {
  try {
    const zones = await getAllZoneRisks();
    res.json({ success: true, count: zones.length, zones });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/risk/history/:zoneId
// Returns last N risk records for a zone (for trend charts).
// ─────────────────────────────────────────────────────────
router.get('/history/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  const { limit = '20' } = req.query;
  try {
    const records = await prisma.zoneRisk.findMany({
      where:   { zoneId },
      orderBy: { timestamp: 'desc' },
      take:    Math.min(parseInt(limit), 100)
    });
    res.json({ success: true, zoneId, count: records.length, history: records.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/risk/simulate
// Calculates risk score from inputs WITHOUT saving to DB.
// Perfect for demo / hackathon "what-if" scenarios.
//
// Body: {
//   zoneId, rainfall_mm_hr, activeWorkers, zoneCapacity,
//   currentOrders, baselineOrders, regulatoryFlags, weights?
// }
// ─────────────────────────────────────────────────────────
router.post('/simulate', async (req, res) => {
  const {
    zoneId         = '560034',
    rainfall_mm_hr = 0,
    activeWorkers  = 5,
    zoneCapacity   = 10,
    currentOrders  = 20,
    baselineOrders = 20,
    regulatoryFlags = {},
    weights        = {},
  } = req.body;

  try {
    // persist = false → calculate only, don't write to DB
    const result = await calculateRiskScore(zoneId, {
      rainfall_mm_hr, activeWorkers, zoneCapacity,
      currentOrders, baselineOrders, regulatoryFlags,
    }, weights, false);

    // Get pool health for safeguard info
    const pool = await prisma.premiumPool.findFirst({ orderBy: { createdAt: 'desc' } });
    const decision = makeDecision(result.riskScore, zoneId, { lossRatio: pool?.lossRatio || 0 });

    logDecision(decision);

    res.json({
      success:  true,
      simulated: true,
      ...result,
      decision,
    });

  } catch (err) {
    console.error('[Risk] simulate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/risk/evaluate
// Full evaluation: calculate + save + broadcast to dashboard.
// Use this for production/scheduled calls.
// ─────────────────────────────────────────────────────────
router.post('/evaluate', async (req, res) => {
  const { zoneId = '560034', ...inputs } = req.body;

  try {
    const result = await calculateRiskScore(zoneId, inputs, {}, true);

    const pool = await prisma.premiumPool.findFirst({ orderBy: { createdAt: 'desc' } });
    const decision = makeDecision(result.riskScore, zoneId, { lossRatio: pool?.lossRatio || 0 });

    logDecision(decision);

    // Broadcast to admin dashboard via Socket.io
    await broadcast('zone_risk_updated', {
      data:      { ...result, decision },
      narration: `Zone ${zoneId} risk score updated to ${result.riskScore}. Mode: ${decision.mode}.`
    });

    res.json({ success: true, ...result, decision });

  } catch (err) {
    console.error('[Risk] evaluate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/compensation/calculate
// ─────────────────────────────────────────────────────────
// Calculate compensation for all eligible workers in a zone.
//
// Body: {
//   zoneId, riskScore,
//   workers: [{
//     workerId, workerName, activeHours, completedOrders
//   }]
//   persist?: true   ← set false to dry-run without writing DB
// }
// ─────────────────────────────────────────────────────────
router.post('/compensation/calculate', async (req, res) => {
  const { zoneId = '560034', riskScore, workers = [], persist = true } = req.body;

  if (riskScore === undefined || riskScore === null) {
    return res.status(400).json({
      success: false,
      error: 'riskScore is required. Call /api/risk/simulate first to get a score.'
    });
  }

  try {
    // Enrich worker input with mock activity objects
    const activities = workers.map(w => ({
      workerId:       w.workerId || 'mock-' + Math.random().toString(36).substr(2, 6),
      activeHours:    w.activeHours    ?? 3,
      completedOrders: w.completedOrders ?? 2,
      worker:         { name: w.workerName || 'Unknown Worker' }
    }));

    // If no workers provided, auto-fetch from DB for the zone
    let activitiesInput = activities;
    if (activities.length === 0) {
      const dbWorkers = await prisma.worker.findMany({
        where: { zone: zoneId, isActive: true }
      });
      activitiesInput = dbWorkers.map(w => ({
        workerId:        w.id,
        activeHours:     3,     // Mock: 3 hours active (demo)
        completedOrders: 2,     // Mock: 2 orders (demo)
        worker:          { name: w.name }
      }));
    }

    const result = await calculateZoneCompensation(zoneId, riskScore, activitiesInput, persist);

    res.json({ success: true, ...result });

  } catch (err) {
    console.error('[Compensation] calculate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/analytics/dashboard
// ─────────────────────────────────────────────────────────
// Returns all KPIs for the admin analytics dashboard:
//   - Insurance: premiums, payouts, loss ratio
//   - Zones: risk scores, current modes
//   - Workers: active count, compensation history
//   - Payments: Razorpay totals
// ─────────────────────────────────────────────────────────
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const [
      pool,
      workers,
      compensations,
      zoneRisks,
      payments,
      policies,
      claims,
    ] = await Promise.all([
      prisma.premiumPool.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.worker.findMany(),
      prisma.compensation.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      getAllZoneRisks(),
      prisma.payment.findMany(),
      prisma.policy.findMany(),
      prisma.claim.findMany(),
    ]);

    // ── Insurance metrics ──────────────────────────────────
    const totalPremiums      = policies.reduce((s, p) => s + (p.premiumAmount || 0), 0);
    const approvedClaims     = claims.filter(c => c.payoutStatus === 'approved');
    const totalInsurancePaid = approvedClaims.reduce((s, c) => s + (c.payoutAmount || 0), 0);
    const insuranceLossRatio = totalPremiums > 0
      ? Math.round((totalInsurancePaid / totalPremiums) * 100 * 10) / 10
      : 0;

    // ── Compensation metrics ───────────────────────────────
    const paidCompensations = compensations.filter(c => c.status === 'PAID');
    const totalCompPaid     = paidCompensations.reduce((s, c) => s + c.amount, 0);
    const compByType        = { BONUS: 0, GUARANTEE: 0, DOWNTIME: 0 };
    compensations.forEach(c => { if (compByType[c.type] !== undefined) compByType[c.type] += c.amount; });

    // ── Payment (Razorpay) metrics ─────────────────────────
    const successPayments = payments.filter(p => p.status === 'SUCCESS');
    const razorpayRevenue = successPayments.reduce((s, p) => s + p.amount / 100, 0);

    // ── High-risk zones ────────────────────────────────────
    const highRiskZones = zoneRisks.filter(z => z.riskScore > 60);

    // ── Zone mode summary ──────────────────────────────────
    const modeSummary = { NORMAL: 0, INCENTIVE: 0, PROTECTION: 0, CRITICAL: 0 };
    zoneRisks.forEach(z => { if (modeSummary[z.decisionMode] !== undefined) modeSummary[z.decisionMode]++; });

    res.json({
      success: true,
      dashboard: {
        // Workers
        totalWorkers:     workers.length,
        activeWorkers:    workers.filter(w => w.isActive).length,

        // Insurance pool
        pool: {
          totalCollected: pool?.totalCollected || 0,
          totalPayout:    pool?.totalPayout    || 0,
          lossRatio:      pool?.lossRatio      || 0,
          healthStatus:   (pool?.lossRatio || 0) < 0.6 ? 'HEALTHY'
                        : (pool?.lossRatio || 0) < 0.8 ? 'MONITOR' : 'CRITICAL'
        },

        // Insurance (claims-based)
        insurance: {
          totalPremiums,
          totalPaidOut:   totalInsurancePaid,
          lossRatio:      insuranceLossRatio,
          totalClaims:    claims.length,
          approvedClaims: approvedClaims.length,
        },

        // Compensation (dynamic risk engine)
        compensation: {
          total:         compensations.length,
          totalPaid:     totalCompPaid,
          byType:        compByType,
          pending:       compensations.filter(c => c.status === 'PENDING').length,
          recent:        compensations.slice(0, 10),
        },

        // Razorpay payments
        payments: {
          total:          payments.length,
          successCount:   successPayments.length,
          revenue:        razorpayRevenue,
          failedCount:    payments.filter(p => p.status === 'FAILED').length,
        },

        // Zone risk
        zones: {
          total:         zoneRisks.length,
          highRisk:      highRiskZones.length,
          modeSummary,
          list:          zoneRisks,
        },

        generatedAt: new Date().toISOString(),
      }
    });

  } catch (err) {
    console.error('[Analytics] dashboard error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/risk/pool/add-premium
// Manually add a premium amount to the pool (for demo/testing).
// In production this is called from the payment verify webhook.
// ─────────────────────────────────────────────────────────
router.post('/pool/add-premium', async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, error: 'amount (₹) required' });
  }
  try {
    const pool = await addPremiumToPool(Number(amount));
    res.json({ success: true, pool });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/risk/modes
// Returns the full decision mode configuration for the frontend.
// ─────────────────────────────────────────────────────────
router.get('/modes', (req, res) => {
  res.json({
    success: true,
    modes:   DECISION_MODES,
  });
});

module.exports = router;
