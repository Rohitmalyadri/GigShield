const express = require('express');
const { handlePlatformWebhook } = require('../ingestion/webhookReceiver');
const { processDualGate } = require('../triggers/dualGate');
const { calculateWeeklyPremium } = require('../risk/premiumCalculator');
const { executePayoutForClaim } = require('../payout/payoutEngine');
// BUG FIX: Use the singleton Prisma client instead of creating a new instance.
// Multiple PrismaClient instances exhaust the PostgreSQL connection pool.
const prisma = require('../prismaClient');

const router = express.Router();

// ─────────────────────────────────────────────────────────
// ROUTE: Receive platform webhooks (Layer 1 Ingestion)
// POST /api/webhooks/platform
// ─────────────────────────────────────────────────────────
router.post('/webhooks/platform', handlePlatformWebhook);

// ─────────────────────────────────────────────────────────
// ROUTE: Get all workers with their current premiums
// GET /api/workers
// This endpoint powers the dashboard worker list.
// ─────────────────────────────────────────────────────────
router.get('/workers', async (req, res) => {
  try {
    // Fetch all workers from PostgreSQL via Prisma
    const workers = await prisma.worker.findMany({
      orderBy: { createdAt: 'desc' } // Most recently added first
    });

    // For each worker, calculate their current weekly premium
    const workersWithPremiums = workers.map(worker => ({
      ...worker,
      // Calculate the premium fresh from the earnings history using ML
      calculatedPremium: calculateWeeklyPremium(
        worker.weeklyEarningsHistory,
        worker.zone,                 // New parameter for python ML script
        worker.zoneRiskScore,
        worker.seasonalMultiplier
      )
    }));

    res.json({ success: true, count: workers.length, workers: workersWithPremiums });
  } catch (err) {
    console.error(`[API Error] /api/workers: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Get all claims (for the dashboard)
// GET /api/claims
// ─────────────────────────────────────────────────────────
router.get('/claims', async (req, res) => {
  try {
    const claims = await prisma.claim.findMany({
      orderBy: { createdAt: 'desc' } // Most recent claims first
    });
    res.json({ success: true, count: claims.length, claims });
  } catch (err) {
    console.error(`[API Error] /api/claims: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Simulate a disruption — THE DEMO ENDPOINT
// POST /api/simulate-disruption
// ─────────────────────────────────────────────────────────
// This is the most important endpoint for the demo.
// One single POST call triggers the entire pipeline:
//   Layer 1 → Layer 2 → Layer 3 (Gate 1 + Gate 2 + Dual Gate)
// It then writes the result as a Claim in PostgreSQL.
//
// Example body to trigger a SUCCESSFUL claim for Ravi:
// {
//   "workerHash": "<sha256 of 9876543210>",
//   "zone": "560034",
//   "rainfall_mm_hr": 42,
//   "workerStatus": "online",
//   "onlineMinutes": 60,
//   "completions_last_hour": 0,
//   "hoursLost": 2
// }
// ─────────────────────────────────────────────────────────
router.post('/simulate-disruption', async (req, res) => {
  const {
    workerHash,              // SHA-256 hash of the worker's phone number
    zone,                    // Pin code of the disruption zone
    rainfall_mm_hr,          // Simulated rainfall amount in mm/hr
    workerStatus,            // "online", "offline", or "on_delivery"
    onlineMinutes,           // How long the worker was online (for Gate 2)
    completions_last_hour,   // Worker's actual delivery count this hour
    hoursLost                // How many hours the disruption lasted
  } = req.body;

  try {
    // ── STEP 1: Look up the worker in the database ─────
    const worker = await prisma.worker.findUnique({
      where: { workerHash }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: `No worker found with this hash. Did you run the seed script?`
      });
    }

    console.log(`[Simulation] Starting disruption simulation for zone ${zone}...`);

    // ── STEP 2: Compose the Gate 1 weather data object ─
    // In production this comes from OpenWeatherMap.
    // In this simulation, we construct it from the request body.
    const weatherData = {
      rain_1h: rainfall_mm_hr || 0, // renamed to our normalized format
      weather: [{ main: rainfall_mm_hr >= 35 ? 'Rain' : 'Clear' }]
    };

    // ── STEP 3: Compose the Gate 2 worker state object ─
    // In production this comes from Redis (live worker heartbeat).
    // In this simulation, we construct it from the request body.
    const workerState = {
      worker_hash: worker.workerHash,
      status: workerStatus || 'online',
      zone: zone,
      onlineMinutes: onlineMinutes || 60,
      completions_last_hour: completions_last_hour !== undefined
        ? completions_last_hour
        : 0,
      avg_completions_baseline: 4.2 // fixed baseline for Phase 1
    };

    // ── STEP 4: Check if a policy exists for this worker this week ─
    // We need a policy record to link the claim to.
    // For Phase 1, if no policy exists we auto-create one.
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of the 7-day policy week

    // Calculate premium for this worker using our Layer 2 ML formula
    const premiumAmount = calculateWeeklyPremium(
      worker.weeklyEarningsHistory,
      worker.zone,           // Add zone to fetch ML risk score
      worker.zoneRiskScore,
      worker.seasonalMultiplier
    );

    // BUG FIX: The original upsert used id:'placeholder' which silently fails in Prisma.
    // Correct approach: findFirst for this worker's current week, create if missing.
    let policy = await prisma.policy.findFirst({
      where: {
        workerId:      worker.id,
        weekStartDate: weekStart,
        coverageActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!policy) {
      policy = await prisma.policy.create({
        data: {
          workerId:       worker.id,
          weekStartDate:  weekStart,
          weekEndDate:    weekEnd,
          premiumAmount:  premiumAmount,
          premiumPaid:    true,
          coverageActive: true
        }
      });
    }

    // ── STEP 5: Run the Dual Gate ──────────────────────
    const result = await processDualGate(
      worker.id,             // Worker's PostgreSQL UUID
      policy.id,             // Policy UUID for this week
      workerState,           // Activity data (for Gate 2)
      weatherData,           // Weather data (for Gate 1)
      zone,                  // Disruption zone pin code
      hoursLost || 2,        // Hours of income lost
      worker.weeklyEarningsHistory // For payout calculation
    );

    // ── STEP 6: Auto-trigger payout if claim was approved ──
    let payoutResult = null;
    if (result.payoutStatus === 'approved' && result.claimId) {
      // Fetch the newly created claim from the database
      const claim = await prisma.claim.findUnique({ where: { id: result.claimId } });
      if (claim) {
        // Execute the payout immediately (Razorpay Test Mode or simulation)
        payoutResult = await executePayoutForClaim(claim, worker);
        console.log(`[Simulation] Payout triggered: ${payoutResult?.transactionId}`);
      }
    }

    // ── STEP 7: Return the full decision to the caller ─
    res.json({
      success: true,
      simulation: {
        worker: { name_hint: `Zone: ${worker.zone}`, city: worker.city },
        weatherData,
        workerState,
        premiumAmount: `₹${premiumAmount}/week`,
        hoursLost: hoursLost || 2,
        gateDecision: result,
        // Include payout info if an approved claim was paid out
        ...(payoutResult && { payout: payoutResult })
      }
    });

  } catch (err) {
    console.error(`[Simulation Error] ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Register a new worker
// POST /api/register
// Body: { name, phone, city, zone, platforms }
// Creates a worker + auto-creates their first week policy
// ─────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, phone, city, zone, platforms } = req.body;

  if (!phone || !city || !zone || !platforms?.length) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Hash the phone number (SHA-256) — same as what the QR uses
    const crypto = require('crypto');
    const workerHash = crypto.createHash('sha256').update(phone.trim()).digest('hex');

    // Check if worker already registered
    const existing = await prisma.worker.findUnique({ where: { workerHash } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'This phone number is already registered.',
        workerHash: existing.workerHash
      });
    }

    // Generate realistic 12-week earnings history based on city
    const baseEarnings = { Bangalore: 9500, Mumbai: 7200, Delhi: 3800 };
    const base = baseEarnings[city] || 6000;
    const weeklyEarningsHistory = Array.from({ length: 12 }, () =>
      Math.round(base * (0.8 + Math.random() * 0.4))
    );

    // Zone risk scores per city
    const zoneRisk = { Bangalore: 1.1, Mumbai: 1.4, Delhi: 0.8 };

    // Create the worker in PostgreSQL
    const worker = await prisma.worker.create({
      data: {
        workerHash,
        name:               name?.trim() || 'Delivery Partner',
        platforms,          // e.g. ['zomato', 'swiggy']
        zone,
        city,
        weeklyEarningsHistory,
        zoneRiskScore:      zoneRisk[city] || 1.0,
        seasonalMultiplier: 1.0,
        isActive:           false
      }
    });

    // Calculate their first week premium
    const premiumAmount = calculateWeeklyPremium(
      weeklyEarningsHistory, zone, worker.zoneRiskScore, worker.seasonalMultiplier
    );

    // Auto-create their first policy for the current week
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const policy = await prisma.policy.create({
      data: {
        workerId:       worker.id,
        weekStartDate:  weekStart,
        weekEndDate:    weekEnd,
        premiumAmount,
        premiumPaid:    true,
        coverageActive: true
      }
    });

    console.log(`[Register] New worker registered: ${city} / ${zone} — ₹${premiumAmount}/wk`);

    res.json({
      success: true,
      worker: {
        id:             worker.id,
        workerHash:     worker.workerHash,
        name:           worker.name,
        city:           worker.city,
        zone:           worker.zone,
        platforms:      worker.platforms,
        weeklyPremium:  premiumAmount
      },
      policy: {
        id:             policy.id,
        weekStartDate:  weekStart,
        weekEndDate:    weekEnd,
        premiumAmount,
        coverageActive: true
      },
      qrUrl: `/api/qr/${workerHash}`
    });

  } catch (err) {
    console.error(`[Register Error] ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Get all policies with worker info
// GET /api/policies
// ─────────────────────────────────────────────────────────
router.get('/policies', async (req, res) => {
  try {
    const policies = await prisma.policy.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        worker: true,    // Join the worker record
        claims: true     // Also include related claims
      }
    });

    // Enrich with derived fields
    const enriched = policies.map(p => ({
      ...p,
      isExpired:   new Date(p.weekEndDate) < new Date(),
      claimsCount: p.claims.length,
      claimsPaid:  p.claims.filter(c => c.payoutStatus === 'approved' || c.payoutStatus === 'simulated').length,
      totalPaidOut: p.claims.reduce((s, c) => s + (c.payoutAmount || 0), 0)
    }));

    res.json({ success: true, count: policies.length, policies: enriched });
  } catch (err) {
    console.error(`[API Error] /api/policies: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Preview premium before registering
// GET /api/premium-preview?city=Bangalore&zone=560034
// ─────────────────────────────────────────────────────────
router.get('/premium-preview', (req, res) => {
  const { city, zone } = req.query;
  const zoneRisk  = { Bangalore: 1.1, Mumbai: 1.4, Delhi: 0.8 };
  const base      = { Bangalore: 9500, Mumbai: 7200, Delhi: 3800 };
  const baseEarns = base[city] || 6000;
  const fakeHistory = Array.from({ length: 12 }, () =>
    Math.round(baseEarns * (0.85 + Math.random() * 0.3))
  );
  const premium = calculateWeeklyPremium(
    fakeHistory, zone, zoneRisk[city] || 1.0, 1.0
  );
  res.json({ success: true, estimatedPremium: premium, city, zone });
});

// ─────────────────────────────────────────────────────────
// ROUTE: Start a shift (mobile app "Start Shift" button)
// POST /api/start-shift
// Body: { workerHash }
// Marks worker active + broadcasts worker_online event
// ─────────────────────────────────────────────────────────
router.post('/start-shift', async (req, res) => {
  const { workerHash } = req.body;
  if (!workerHash) {
    return res.status(400).json({ success: false, error: 'workerHash is required' });
  }

  try {
    const worker = await prisma.worker.findUnique({ where: { workerHash } });
    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    // Mark as active
    await prisma.worker.update({
      where: { workerHash },
      data: { isActive: true }
    });

    // Broadcast via WebSocket
    const { broadcast } = require('../socket/socketManager');
    broadcast('worker_online', {
      data: {
        workerHash: worker.workerHash,
        city: worker.city,
        zone: worker.zone,
        platforms: worker.platforms,
        message: `Worker in ${worker.city} (zone ${worker.zone}) is now online`
      }
    });

    console.log(`[Start Shift] Worker ${worker.city}/${worker.zone} is now ONLINE`);

    res.json({
      success: true,
      worker: {
        id: worker.id,
        workerHash: worker.workerHash,
        city: worker.city,
        zone: worker.zone,
        isActive: true
      }
    });
  } catch (err) {
    console.error(`[Start Shift Error] ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Get a single worker's full profile
// GET /api/worker/:workerHash
// Returns worker + policies + claims for the mobile app
// ─────────────────────────────────────────────────────────
router.get('/worker/:workerHash', async (req, res) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: { workerHash: req.params.workerHash },
      include: {
        policies: { orderBy: { createdAt: 'desc' }, take: 5 },
        claims:   { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    // Calculate premium
    const premium = calculateWeeklyPremium(
      worker.weeklyEarningsHistory,
      worker.zone,
      worker.zoneRiskScore,
      worker.seasonalMultiplier
    );

    // Calculate earnings stats
    const earnings = worker.weeklyEarningsHistory || [];
    const avgWeekly = earnings.length > 0
      ? Math.round(earnings.reduce((s, v) => s + v, 0) / earnings.length)
      : 0;
    const avgHourly = Math.round(avgWeekly / 42); // ~42 working hours/week

    res.json({
      success: true,
      worker: {
        ...worker,
        calculatedPremium: premium,
        avgWeeklyEarnings: avgWeekly,
        avgHourlyEarnings: avgHourly,
        activePolicy: worker.policies[0] || null,
        recentClaims: worker.claims
      }
    });
  } catch (err) {
    console.error(`[API Error] /api/worker/:hash: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ROUTE: Aggregated analytics for the dashboard
// GET /api/analytics
// Returns pre-computed KPIs: total premiums, lossRatio,
// claims by city, approval rate, trend data.
// ─────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const [policies, claims] = await Promise.all([
      prisma.policy.findMany({ include: { worker: true, claims: true } }),
      prisma.claim.findMany({ orderBy: { createdAt: 'asc' } })
    ]);

    const totalPremiums = policies.reduce((s, p) => s + (p.premiumAmount || 0), 0);
    const approvedClaims = claims.filter(c => c.payoutStatus === 'approved');
    const totalPaidOut  = approvedClaims.reduce((s, c) => s + (c.payoutAmount || 0), 0);
    const lossRatio     = totalPremiums > 0 ? (totalPaidOut / totalPremiums) * 100 : 0;

    // City breakdown
    const cityMap = {};
    policies.forEach(p => {
      const city = p.worker?.city || 'Unknown';
      if (!cityMap[city]) cityMap[city] = { city, premiums: 0, paidOut: 0, claims: 0 };
      cityMap[city].premiums += p.premiumAmount || 0;
      cityMap[city].paidOut  += p.totalPaidOut  || 0;
      cityMap[city].claims   += p.claims.length;
    });

    res.json({
      success: true,
      analytics: {
        totalPremiums,
        totalPaidOut,
        lossRatio: Math.round(lossRatio * 10) / 10,
        totalClaims:    claims.length,
        approvedClaims: approvedClaims.length,
        approvalRate:   claims.length > 0 ? (approvedClaims.length / claims.length) * 100 : 0,
        activePolicies: policies.filter(p => p.coverageActive && new Date(p.weekEndDate) > new Date()).length,
        cityBreakdown:  Object.values(cityMap),
      }
    });
  } catch (err) {
    console.error(`[API Error] /api/analytics: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
