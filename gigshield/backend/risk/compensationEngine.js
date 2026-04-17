// ─────────────────────────────────────────────────────────
// COMPENSATION ENGINE — risk/compensationEngine.js
// ─────────────────────────────────────────────────────────
// Determines WHICH workers are eligible for compensation
// and HOW MUCH they receive, given:
//   - Their activity metrics (hours online, orders done)
//   - The current zone decision mode
//   - The shared premium pool health (loss ratio)
//
// Eligibility Rules (Step 3):
//   ✅ Active hours >= 2
//   ✅ Completed orders >= minimumOrders (mode-dependent)
//   ✅ Risk score >= 60 (protection/critical modes only)
//
// Compensation Types:
//   BONUS      → per-order bonus (incentive mode)
//   GUARANTEE  → minimum guaranteed earnings (protection)
//   DOWNTIME   → hourly rate for no-order periods (critical)
// ─────────────────────────────────────────────────────────

'use strict';

const prisma = require('../prismaClient');
const { makeDecision } = require('./decisionEngine');

// ── ELIGIBILITY THRESHOLDS ────────────────────────────────
const ELIGIBILITY = {
  minActiveHours:         2,    // Must be online at least 2 hours
  minOrdersForBonus:      1,    // At least 1 order to claim bonus
  minOrdersForGuarantee:  0,    // 0 — can claim guarantee even with no orders
  minRiskScoreForPayout:  60,   // Only PROTECTION/CRITICAL modes trigger payouts
};

/**
 * Check if a worker meets the eligibility criteria for compensation.
 *
 * @param {object} activity     - WorkerActivity record
 * @param {number} riskScore    - Current zone risk score
 * @param {string} mode         - NORMAL | INCENTIVE | PROTECTION | CRITICAL
 * @returns {{ eligible: boolean, reason: string }}
 */
function checkEligibility(activity, riskScore, mode) {
  // Rule 1: Must have been active for at least 2 hours
  if (activity.activeHours < ELIGIBILITY.minActiveHours) {
    return {
      eligible: false,
      reason: `Active hours (${activity.activeHours}h) below minimum (${ELIGIBILITY.minActiveHours}h)`
    };
  }

  // Rule 2: BONUS mode requires at least 1 completed order
  if (mode === 'INCENTIVE' && activity.completedOrders < ELIGIBILITY.minOrdersForBonus) {
    return {
      eligible: false,
      reason: 'No completed orders — bonus requires at least 1 delivery'
    };
  }

  // Rule 3: PROTECTION/CRITICAL require risk score >= 60
  if (['PROTECTION', 'CRITICAL'].includes(mode) && riskScore < ELIGIBILITY.minRiskScoreForPayout) {
    return {
      eligible: false,
      reason: `Risk score (${riskScore}) below payout threshold (${ELIGIBILITY.minRiskScoreForPayout})`
    };
  }

  // Rule 4: NORMAL mode — no payout
  if (mode === 'NORMAL') {
    return { eligible: false, reason: 'No payout in NORMAL mode' };
  }

  return { eligible: true, reason: 'All eligibility criteria met' };
}

/**
 * Calculate the compensation amount for an eligible worker.
 *
 * @param {object} activity   - Worker's activity during the risk window
 * @param {object} decision   - Decision object from makeDecision()
 * @returns {{ amount: number, type: string, breakdown: object }}
 */
function calculateAmount(activity, decision) {
  const { mode, bonusPerOrder, guaranteedMin, downtimeRate } = decision;

  let amount = 0;
  let type   = 'BONUS';
  const breakdown = {};

  if (mode === 'INCENTIVE') {
    // Per-order bonus only
    const bonus = activity.completedOrders * bonusPerOrder;
    amount = bonus;
    type   = 'BONUS';
    breakdown.orders      = activity.completedOrders;
    breakdown.bonusRate   = bonusPerOrder;
    breakdown.totalBonus  = bonus;
  }

  else if (mode === 'PROTECTION') {
    // Base earnings (what they actually earned from orders)
    // We estimate ₹60 per order as average delivery payout on Zomato/Swiggy
    const estimatedEarned = activity.completedOrders * 60;

    // Guarantee tops up to guaranteedMin
    const guaranteeTopUp  = Math.max(0, guaranteedMin - estimatedEarned);

    // Per-order bonus on top
    const bonus           = activity.completedOrders * bonusPerOrder;

    amount = guaranteeTopUp + bonus;
    type   = activity.completedOrders === 0 ? 'DOWNTIME' : 'GUARANTEE';

    breakdown.estimatedEarned = estimatedEarned;
    breakdown.guaranteeTopUp  = guaranteeTopUp;
    breakdown.perOrderBonus   = bonus;
    breakdown.total           = amount;
  }

  else if (mode === 'CRITICAL') {
    // Zone is paused — only downtime compensation
    const downtimePay = activity.activeHours * downtimeRate;
    amount = downtimePay;
    type   = 'DOWNTIME';
    breakdown.activeHours  = activity.activeHours;
    breakdown.hourlyRate   = downtimeRate;
    breakdown.totalDowntime = downtimePay;
  }

  // Floor at 0 — never negative
  amount = Math.max(0, Math.round(amount * 100) / 100);

  return { amount, type, breakdown };
}

/**
 * Main function: Calculate compensation for ALL eligible workers in a zone.
 *
 * @param {string} zoneId     - Zone pin code
 * @param {number} riskScore  - Current risk score for this zone
 * @param {object[]} activities - Array of WorkerActivity objects with worker data
 * @param {boolean} persist   - Save Compensation records to DB (default true)
 *
 * @returns {{ eligible: object[], ineligible: object[], totalPayout: number, decision: object }}
 */
async function calculateZoneCompensation(zoneId, riskScore, activities, persist = true) {
  // Get pool health for the safeguard
  const pool = await prisma.premiumPool.findFirst({ orderBy: { createdAt: 'desc' } });
  const poolStatus = { lossRatio: pool ? pool.lossRatio : 0 };

  // Get the full decision for this zone
  const decision = makeDecision(riskScore, zoneId, poolStatus);

  const eligible   = [];
  const ineligible = [];

  for (const activity of activities) {
    const { eligible: isEligible, reason } = checkEligibility(activity, riskScore, decision.mode);

    if (!isEligible) {
      ineligible.push({
        workerId:  activity.workerId,
        workerName: activity.worker?.name || 'Unknown',
        reason,
      });
      continue;
    }

    // Calculate payout
    const { amount, type, breakdown } = calculateAmount(activity, decision);

    const compensationRecord = {
      workerId:   activity.workerId,
      workerName: activity.worker?.name || 'Unknown',
      zoneId,
      amount,
      type,
      riskScore,
      reason:     `${decision.mode} mode — ${decision.description}`,
      breakdown,
    };

    // Persist to DB
    if (persist && amount > 0) {
      const saved = await prisma.compensation.create({
        data: {
          workerId:  activity.workerId,
          zoneId,
          amount,
          type,
          riskScore,
          status:   'PENDING',
          reason:   compensationRecord.reason,
        }
      });
      compensationRecord.compensationId = saved.id;
    }

    eligible.push(compensationRecord);
  }

  const totalPayout = eligible.reduce((s, e) => s + e.amount, 0);

  // ── Update premium pool after computing payouts ──────────
  if (persist && totalPayout > 0) {
    await updatePremiumPool(totalPayout);
  }

  return {
    zoneId,
    riskScore,
    decision,
    eligible,
    ineligible,
    summary: {
      totalEligible:   eligible.length,
      totalIneligible: ineligible.length,
      totalPayout:     Math.round(totalPayout * 100) / 100,
      mode:            decision.mode,
    }
  };
}

/**
 * Update the Shared Risk Pool with new payout.
 * Recalculates the loss ratio after each compensation event.
 *
 * If loss ratio > 0.8, logs a critical warning.
 */
async function updatePremiumPool(payoutAmount) {
  const existing = await prisma.premiumPool.findFirst({ orderBy: { createdAt: 'desc' } });

  const totalCollected = existing?.totalCollected || 0;
  const totalPayout    = (existing?.totalPayout  || 0) + payoutAmount;
  const lossRatio      = totalCollected > 0 ? totalPayout / totalCollected : 0;

  if (existing) {
    await prisma.premiumPool.update({
      where: { id: existing.id },
      data:  { totalPayout, lossRatio }
    });
  } else {
    await prisma.premiumPool.create({
      data:  { totalCollected: 0, totalPayout, lossRatio }
    });
  }

  if (lossRatio > 0.8) {
    console.warn(`[Compensation] ⚠️ LOSS RATIO ALERT: ${(lossRatio * 100).toFixed(1)}% — safeguards active`);
  }

  return { totalCollected, totalPayout, lossRatio };
}

/**
 * Add premium collected to the pool (called when a payment is verified).
 */
async function addPremiumToPool(premiumAmount) {
  const existing = await prisma.premiumPool.findFirst({ orderBy: { createdAt: 'desc' } });

  if (existing) {
    const totalCollected = existing.totalCollected + premiumAmount;
    const lossRatio = totalCollected > 0 ? existing.totalPayout / totalCollected : 0;
    return prisma.premiumPool.update({
      where: { id: existing.id },
      data:  { totalCollected, lossRatio }
    });
  } else {
    return prisma.premiumPool.create({
      data: { totalCollected: premiumAmount, totalPayout: 0, lossRatio: 0 }
    });
  }
}

module.exports = {
  calculateZoneCompensation,
  checkEligibility,
  calculateAmount,
  updatePremiumPool,
  addPremiumToPool,
  ELIGIBILITY,
};
