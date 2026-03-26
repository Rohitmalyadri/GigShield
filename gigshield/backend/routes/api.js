const express = require('express');
const { handlePlatformWebhook } = require('../ingestion/webhookReceiver');
const { processDualGate } = require('../triggers/dualGate');
const { calculateWeeklyPremium } = require('../risk/premiumCalculator');
const { executePayoutForClaim } = require('../payout/payoutEngine');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

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

    // upsert: creates the policy if missing, or returns the existing one
    const policy = await prisma.policy.upsert({
      where: {
        // Prisma needs a unique field to upsert on — we use a compound trick
        // (NOTE: full compound unique constraint added in Phase 2 migration)
        id: 'placeholder'
      },
      update: {},
      create: {
        workerId: worker.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        premiumAmount: premiumAmount,
        premiumPaid: true,
        coverageActive: true
      }
    }).catch(async () => {
      // If upsert fails (no existing), just create a fresh policy
      return await prisma.policy.create({
        data: {
          workerId: worker.id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          premiumAmount: premiumAmount,
          premiumPaid: true,
          coverageActive: true
        }
      });
    });

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

module.exports = router;
