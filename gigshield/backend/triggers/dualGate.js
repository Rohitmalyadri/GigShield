// ─────────────────────────────────────────────────────────
// LAYER 3+4 — DUAL GATE + FRAUD VALIDATION + LIVE BROADCASTS
// ─────────────────────────────────────────────────────────
// Full 5-layer pipeline with real-time WebSocket events:
//   STEP 1: Gate 1 (rainfall trigger)          → broadcasts gate1_result
//   STEP 2: Gate 2 (worker activity proxy)     → broadcasts gate2_result
//   STEP 3: Deduplication (no double payouts)  → broadcasts fraud_result
//   STEP 4: GPS Spoofing check                 → broadcasts fraud_result
//   STEP 5: Create Claim in PostgreSQL         → broadcasts payout_fired
// ─────────────────────────────────────────────────────────

// BUG FIX: Use the shared Prisma singleton — no separate PrismaClient here.
const prisma                  = require('../prismaClient');
const { evaluateGate1 }       = require('./gate1');
const { evaluateGate2 }       = require('./gate2');
const { checkDuplicateClaim } = require('../fraud/deduplication');
const { checkGpsSpoofing }    = require('../fraud/gpsSpoofing');

const { broadcast }    = require('../socket/socketManager');
const { narrateEvent } = require('../llm/narratorEngine');

/**
 * Calculates the payout amount using the Wage Mirror formula.
 * Rule: no payout can exceed 75% of the worker's lost income.
 */
function calculatePayoutAmount(earningsHistory, hoursLost) {
  const avgWeeklyEarnings =
    earningsHistory.reduce((sum, val) => sum + val, 0) / earningsHistory.length;
  const hourlyRate = avgWeeklyEarnings / 48; // 6 days × 8 hours per week
  return Math.round(hourlyRate * hoursLost * 0.75 * 100) / 100;
}

/**
 * Broadcast an event immediately, then get narration in the background.
 * Uses a stagger offset (ms) so multiple simultaneous calls don't all
 * hit Gemini at the same time — preventing rate limit 429 errors.
 * This is fully fire-and-forget — it NEVER blocks the main pipeline.
 */
let _narrationQueue = Promise.resolve(); // Ensures calls go one-at-a-time

async function broadcastWithNarration(eventName, data) {
  // Broadcast the event immediately — no waiting
  broadcast(eventName, { data });

  // Queue narration so calls happen sequentially (prevents 429 spam)
  _narrationQueue = _narrationQueue.then(async () => {
    try {
      const narration = await narrateEvent(eventName, data);
      broadcast('llm_narration', {
        data: { forEvent: eventName, text: narration }
      });
    } catch (err) {
      console.warn(`[DualGate] Narration skipped for ${eventName}: ${err.message}`);
    }
  });
  // Note: we do NOT await _narrationQueue — it runs freely in background
}

/**
 * Master pipeline: runs all gates, fraud checks, creates the Claim,
 * and broadcasts every decision to the Mission Control dashboard.
 */
async function processDualGate(
  workerId,
  policyId,
  workerState,
  weatherData,
  disruptionZone,
  hoursLost,
  earningsHistory,
  lastKnownState = null
) {
  // ── STEP 1: Gate 1 — Environmental Trigger ─────────────
  const gate1Result = evaluateGate1(weatherData);
  console.log(`[Gate 1] triggered=${gate1Result.triggered} — ${gate1Result.reason}`);

  // Broadcast Gate 1 result to the live dashboard feed
  broadcastWithNarration('gate1_result', {
    triggered:     gate1Result.triggered,
    rainfall_mm_hr: weatherData.rain_1h || 0,
    zone:          disruptionZone,
    reason:        gate1Result.reason
  });

  // ── STEP 2: Gate 2 — Activity Proxy ────────────────────
  const gate2Result = evaluateGate2(workerState, disruptionZone);
  console.log(`[Gate 2] validated=${gate2Result.validated} — ${gate2Result.reason}`);

  // Broadcast Gate 2 result
  broadcastWithNarration('gate2_result', {
    validated:    gate2Result.validated,
    onlineMinutes: workerState.onlineMinutes || 0,
    zone:         disruptionZone,
    reason:       gate2Result.reason
  });

  const disruptionStartTime = new Date();
  const disruptionEndTime   = new Date(disruptionStartTime.getTime() + hoursLost * 60 * 60 * 1000);
  const bothPassed          = gate1Result.triggered && gate2Result.validated;

  // If either gate failed — create a rejected claim and stop
  if (!bothPassed) {
    const claim = await prisma.claim.create({
      data: {
        workerId, policyId,
        disruptionType:   gate1Result.triggered ? 'heavy_rainfall' : 'none',
        gate1Passed:      gate1Result.triggered,
        gate2Passed:      gate2Result.validated,
        fraudCheckPassed: false,
        payoutAmount:     0,
        payoutStatus:     'rejected',
        disruptionStartTime, disruptionEndTime, hoursLost
      }
    });
    return {
      success: true, claimId: claim.id,
      bothPassed: false, payoutAmount: 0, payoutStatus: 'rejected',
      gate1: gate1Result, gate2: gate2Result,
      fraudCheck: { skipped: true, reason: 'Gates failed — fraud check not needed' }
    };
  }

  // ── STEP 3: Fraud Check 1 — Deduplication ──────────────
  const dedupResult = await checkDuplicateClaim(workerId, disruptionStartTime);
  console.log(`[Fraud] Dedup: isDuplicate=${dedupResult.isDuplicate} — ${dedupResult.reason}`);

  if (dedupResult.isDuplicate) {
    // Broadcast fraud block to dashboard
    broadcastWithNarration('fraud_result', {
      passed:    false,
      checkType: 'deduplication',
      reason:    dedupResult.reason
    });
    return {
      success: false, bothPassed: true,
      payoutStatus: 'duplicate_rejected',
      fraudReason: dedupResult.reason,
      existingClaimId: dedupResult.existingClaimId
    };
  }

  // ── STEP 4: Fraud Check 2 — GPS Spoofing ───────────────
  const gpsResult = checkGpsSpoofing(workerState, lastKnownState);
  console.log(`[Fraud] GPS: isSpoofed=${gpsResult.isSpoofed} — ${gpsResult.reason}`);

  if (gpsResult.isSpoofed) {
    broadcastWithNarration('fraud_result', {
      passed:    false,
      checkType: 'gps_spoofing',
      reason:    gpsResult.reason
    });
    return {
      success: false, bothPassed: true,
      payoutStatus: 'fraud_rejected_gps',
      fraudReason: gpsResult.reason
    };
  }

  // Fraud cleared — broadcast that check passed
  broadcastWithNarration('fraud_result', {
    passed:    true,
    checkType: 'all_checks',
    reason:    'Deduplication and GPS checks passed'
  });

  // ── STEP 5: All checks passed — create Approved Claim ───
  const payoutAmount = calculatePayoutAmount(earningsHistory, hoursLost);

  const claim = await prisma.claim.create({
    data: {
      workerId, policyId,
      disruptionType:   'heavy_rainfall',
      gate1Passed:      true,
      gate2Passed:      true,
      fraudCheckPassed: true,
      payoutAmount,
      payoutStatus:     'approved',
      disruptionStartTime, disruptionEndTime, hoursLost
    }
  });

  console.log(`[Dual Gate] ✅ Claim APPROVED: ${claim.id} — ₹${payoutAmount}`);

  // Broadcast the payout firing to the dashboard
  broadcastWithNarration('payout_fired', {
    amount:        payoutAmount,
    claimId:       claim.id,
    zone:          disruptionZone,
    hoursLost,
    // city is looked up from workerState zone — dashboard will resolve it
  });

  return {
    success: true, claimId: claim.id,
    bothPassed: true, payoutAmount,
    payoutStatus: 'approved',
    gate1: gate1Result, gate2: gate2Result,
    fraudCheck: {
      deduplication: dedupResult.reason,
      gpsSpoofing:   gpsResult.reason
    }
  };
}

module.exports = { processDualGate };
