// ─────────────────────────────────────────────────────────
// LAYER 3+4 — DUAL GATE + FRAUD VALIDATION (Updated)
// ─────────────────────────────────────────────────────────
// Now wired with the full 5-layer pipeline:
//   STEP 1: Gate 1 (rainfall trigger)
//   STEP 2: Gate 2 (worker activity proxy)
//   STEP 3: Deduplication (no double payouts)
//   STEP 4: GPS Spoofing check
//   STEP 5: Create Claim in PostgreSQL
// ─────────────────────────────────────────────────────────

const { PrismaClient }       = require('@prisma/client');
const { evaluateGate1 }      = require('./gate1');              // Layer 3: Environmental trigger
const { evaluateGate2 }      = require('./gate2');              // Layer 3: Activity proxy
const { checkDuplicateClaim }= require('../fraud/deduplication'); // Layer 4: Double-payout guard
const { checkGpsSpoofing }   = require('../fraud/gpsSpoofing');   // Layer 4: GPS fraud guard

const prisma = new PrismaClient();

/**
 * Calculates the payout amount using the Wage Mirror formula.
 * Formula: hourlyRate × hoursLost × 0.75 (75% income protection cap)
 */
function calculatePayoutAmount(earningsHistory, hoursLost) {
  // Average weekly earnings across the trailing 12 weeks
  const avgWeeklyEarnings =
    earningsHistory.reduce((sum, val) => sum + val, 0) / earningsHistory.length;

  // Worker works 6 days × 8 hours = 48 hours per week
  const hourlyRate = avgWeeklyEarnings / 48;

  // Apply the 75% cap and round to 2 decimal places
  return Math.round(hourlyRate * hoursLost * 0.75 * 100) / 100;
}

/**
 * Master pipeline function: runs all gates and fraud checks,
 * then creates (or blocks) a Claim record in PostgreSQL.
 */
async function processDualGate(
  workerId,
  policyId,
  workerState,
  weatherData,
  disruptionZone,
  hoursLost,
  earningsHistory,
  lastKnownState = null  // Previous heartbeat from Redis (optional for Phase 1)
) {
  // ── STEP 1: Gate 1 — Environmental Trigger ─────────────
  const gate1Result = evaluateGate1(weatherData);
  console.log(`[Gate 1] triggered=${gate1Result.triggered} — ${gate1Result.reason}`);

  // ── STEP 2: Gate 2 — Activity Proxy ────────────────────
  const gate2Result = evaluateGate2(workerState, disruptionZone);
  console.log(`[Gate 2] validated=${gate2Result.validated} — ${gate2Result.reason}`);

  // Record the start time before we do any async operations
  const disruptionStartTime = new Date();
  const disruptionEndTime   = new Date(disruptionStartTime.getTime() + hoursLost * 60 * 60 * 1000);

  // If either gate fails, create a rejected claim and stop early
  const bothPassed = gate1Result.triggered && gate2Result.validated;
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
        disruptionStartTime,
        disruptionEndTime,
        hoursLost
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
  console.log(`[Fraud Layer] Deduplication: isDuplicate=${dedupResult.isDuplicate} — ${dedupResult.reason}`);

  if (dedupResult.isDuplicate) {
    // A payout was already issued for this worker in this storm window
    return {
      success: false,
      bothPassed: true,
      payoutStatus: 'duplicate_rejected',
      fraudReason: dedupResult.reason,
      existingClaimId: dedupResult.existingClaimId
    };
  }

  // ── STEP 4: Fraud Check 2 — GPS Spoofing ───────────────
  const gpsResult = checkGpsSpoofing(workerState, lastKnownState);
  console.log(`[Fraud Layer] GPS check: isSpoofed=${gpsResult.isSpoofed} — ${gpsResult.reason}`);

  if (gpsResult.isSpoofed) {
    // Do not pay out if GPS is inconsistent with last known location
    return {
      success: false,
      bothPassed: true,
      payoutStatus: 'fraud_rejected_gps',
      fraudReason: gpsResult.reason
    };
  }

  // ── STEP 5: All checks passed — create an approved Claim ─
  const payoutAmount = calculatePayoutAmount(earningsHistory, hoursLost);

  const claim = await prisma.claim.create({
    data: {
      workerId, policyId,
      disruptionType:   'heavy_rainfall',
      gate1Passed:      true,
      gate2Passed:      true,
      fraudCheckPassed: true,        // All fraud checks cleared
      payoutAmount:     payoutAmount,
      payoutStatus:     'approved',  // Ready to send to the payout layer
      disruptionStartTime,
      disruptionEndTime,
      hoursLost
    }
  });

  console.log(`[Dual Gate] ✅ Claim APPROVED: ${claim.id} — ₹${payoutAmount}`);

  return {
    success: true,
    claimId: claim.id,
    bothPassed: true,
    payoutAmount,
    payoutStatus: 'approved',
    gate1: gate1Result,
    gate2: gate2Result,
    fraudCheck: {
      deduplication: dedupResult.reason,
      gpsSpoofing:   gpsResult.reason
    }
  };
}

module.exports = { processDualGate };
