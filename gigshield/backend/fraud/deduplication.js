// ─────────────────────────────────────────────────────────
// LAYER 4 — FRAUD CHECK 1: Canonical Identity Deduplication
// ─────────────────────────────────────────────────────────
// PROBLEM: Many riders work on BOTH Zomato and Swiggy.
// Without this check, a Bangalore flood would generate TWO
// payout claims — one from Swiggy, one from Zomato —
// for the exact same worker in the exact same storm.
//
// SOLUTION — THE CANONICAL ID SYSTEM:
// Both platforms send the SHA-256 hash of the worker's phone
// number as the worker_hash. Since the hash of the same phone
// is always identical, we can detect the duplicate.
//
// This function queries the Claim table to see if a claim
// has already been created for this worker in the same
// disruption time window (within 3 hours).
// If it finds a duplicate → it BLOCKS the second payout.
// ─────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client'); // Database access via ORM

const prisma = new PrismaClient();

/**
 * Checks if a duplicate claim already exists for this worker
 * during the same disruption window.
 *
 * @param {string} workerId - The PostgreSQL UUID of the worker
 * @param {Date} disruptionStartTime - When the disruption started
 *
 * @returns {{ isDuplicate: boolean, reason: string, existingClaimId: string|null }}
 */
async function checkDuplicateClaim(workerId, disruptionStartTime) {

  // Define the time window: look back 3 hours from the disruption start.
  // WHY 3 hours? A single rain event typically lasts 1-3 hours.
  // Any two claims from the same worker within 3 hours = same storm.
  const windowStart = new Date(disruptionStartTime.getTime() - 3 * 60 * 60 * 1000);
  const windowEnd   = new Date(disruptionStartTime.getTime() + 3 * 60 * 60 * 1000);

  // Query PostgreSQL for any existing claim from this worker in the time window.
  // We only count claims that actually passed both gates (not rejected claims).
  const existingClaim = await prisma.claim.findFirst({
    where: {
      workerId: workerId,               // Same worker

      // Only block if the previous claim actually passed both gates
      gate1Passed: true,
      gate2Passed: true,

      // Must fall within the 3-hour disruption window
      disruptionStartTime: {
        gte: windowStart,               // Greater than or equal to window start
        lte: windowEnd                  // Less than or equal to window end
      },

      // Only block approved or pending claims — not already-rejected ones
      payoutStatus: {
        notIn: ['rejected']
      }
    }
  });

  // If a matching claim is found, this is a duplicate — BLOCK IT
  if (existingClaim) {
    return {
      isDuplicate: true,
      reason: `Duplicate claim detected. Existing claim ${existingClaim.id} already covers this worker for this disruption window. ONE payout per disruption event per worker.`,
      existingClaimId: existingClaim.id
    };
  }

  // No duplicate found — this claim is safe to proceed
  return {
    isDuplicate: false,
    reason: 'No duplicate claim found. This is a valid new claim.',
    existingClaimId: null
  };
}

// Export so dualGate.js can import and run this check
module.exports = { checkDuplicateClaim };
