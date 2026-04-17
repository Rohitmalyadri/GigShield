// ─────────────────────────────────────────────────────────
// DECISION ENGINE — services/decisionEngine.js
// ─────────────────────────────────────────────────────────
// Maps Risk Score → Operating Mode → Action Plan.
//
//  0–30   → NORMAL      — Standard operations, no intervention
//  31–60  → INCENTIVE   — Bonus per order to keep workers active
//  61–80  → PROTECTION  — Minimum guaranteed earnings per shift
//  81–100 → CRITICAL    — Pause zone or heavily restrict deliveries
//
// This module is the single source of truth for all business
// decisions derived from the risk score. Used by:
//   - /api/risk/simulate
//   - /api/compensation/calculate
//   - Broadcast via Socket.io to the dashboard
// ─────────────────────────────────────────────────────────

'use strict';

// ── MODE DEFINITIONS ──────────────────────────────────────
// Each mode defines thresholds, actions, and parameters.
const DECISION_MODES = {
  NORMAL: {
    label:          'Normal Operations',
    emoji:          '✅',
    color:          'green',
    scoreRange:     [0, 30],
    bonusPerOrder:  0,
    guaranteedMin:  0,
    downtimeRate:   0,          // ₹/hour if no orders come in
    zoneActive:     true,
    workerAction:   'Continue standard deliveries',
    companyAction:  'No financial intervention required',
    description:    'Zone is operating normally. No risk payouts triggered.',
  },

  INCENTIVE: {
    label:          'Incentive Mode',
    emoji:          '🚀',
    color:          'amber',
    scoreRange:     [31, 60],
    bonusPerOrder:  15,         // ₹15 bonus per successfully completed order
    guaranteedMin:  0,
    downtimeRate:   0,
    zoneActive:     true,
    workerAction:   'Deliver as normal — earn bonus per order',
    companyAction:  'Pay ₹15 bonus per completed order in affected zone',
    description:    'Moderate risk. Incentives keep workers engaged without blanket payouts.',
  },

  PROTECTION: {
    label:          'Protection Mode',
    emoji:          '🛡️',
    color:          'orange',
    scoreRange:     [61, 80],
    bonusPerOrder:  10,         // ₹10 per order (reduced — base guarantee applies)
    guaranteedMin:  200,        // ₹200 minimum guaranteed per shift
    downtimeRate:   50,         // ₹50/hr if worker is online but gets no orders
    zoneActive:     true,
    workerAction:   'Stay online — minimum earnings guaranteed regardless of order count',
    companyAction:  'Pay minimum ₹200/shift + ₹10/order + ₹50/hr downtime compensation',
    description:    'High risk. Workers protected with income guarantee. Business risk is absorb from premium pool.',
  },

  CRITICAL: {
    label:          'Critical Mode',
    emoji:          '🚨',
    color:          'red',
    scoreRange:     [81, 100],
    bonusPerOrder:  0,
    guaranteedMin:  150,        // Reduced guarantee (zone is paused)
    downtimeRate:   75,         // ₹75/hr downtime (workers are told to stand down)
    zoneActive:     false,      // Zone is PAUSED — no new orders accepted
    workerAction:   'Stand down. Zone is paused. You will receive downtime compensation.',
    companyAction:  'Pause zone. Pay ₹75/hr for all active workers. Alert operations team.',
    description:    'Extreme risk. Zone delivery paused. Downtime pay only. Loss ratio safeguard active.',
  },
};

/**
 * Map a numeric risk score to a Decision Mode string.
 * @param {number} riskScore - 0 to 100
 * @returns {string} 'NORMAL' | 'INCENTIVE' | 'PROTECTION' | 'CRITICAL'
 */
function getDecisionMode(riskScore) {
  if (riskScore <= 30) return 'NORMAL';
  if (riskScore <= 60) return 'INCENTIVE';
  if (riskScore <= 80) return 'PROTECTION';
  return 'CRITICAL';
}

/**
 * Build a full decision object from a risk score.
 * Includes mode config + financial parameters + business explanation.
 *
 * @param {number} riskScore   - 0–100
 * @param {string} zoneId      - For context
 * @param {object} poolStatus  - Current premium pool state { lossRatio }
 * @returns {object}           - Full decision with parameters and recommendations
 */
function makeDecision(riskScore, zoneId = 'unknown', poolStatus = {}) {
  const mode = getDecisionMode(riskScore);
  const config = { ...DECISION_MODES[mode] };

  // ── FINANCIAL SAFEGUARD ────────────────────────────────────
  // If the shared risk pool loss ratio > 0.8, downgrade compensation
  // to prevent the pool from running dry. This is the core
  // financial sustainability mechanism.
  const lossRatio = poolStatus.lossRatio || 0;
  let safeguardApplied = false;

  if (lossRatio > 0.8 && mode !== 'NORMAL') {
    safeguardApplied = true;
    // Reduce payouts proportionally to how far over the 80% threshold we are
    const reductionFactor = Math.max(0.3, 1 - (lossRatio - 0.8) * 2);
    config.bonusPerOrder  = Math.round(config.bonusPerOrder  * reductionFactor);
    config.guaranteedMin  = Math.round(config.guaranteedMin  * reductionFactor);
    config.downtimeRate   = Math.round(config.downtimeRate   * reductionFactor);
    config.description   += ` ⚠️ SAFEGUARD: payouts reduced to ${Math.round(reductionFactor * 100)}% due to loss ratio ${(lossRatio * 100).toFixed(0)}%.`;
  }

  // If CRITICAL and loss ratio is catastrophic (>0.95), switch to INCENTIVE only
  if (lossRatio > 0.95 && mode === 'CRITICAL') {
    config.guaranteedMin = 0;
    config.downtimeRate  = 0;
    config.bonusPerOrder = 10;
    config.description  += ' 🚨 POOL EXHAUSTION RISK: only per-order bonuses active.';
  }

  return {
    zoneId,
    riskScore,
    mode,
    ...config,
    safeguardApplied,
    lossRatioAtDecision: lossRatio,
    decidedAt: new Date().toISOString(),
  };
}

/**
 * Log a decision to console in a structured format.
 * In production this would write to an audit log / time-series DB.
 */
function logDecision(decision) {
  console.log(
    `[Decision Engine] Zone ${decision.zoneId} | ` +
    `Score: ${decision.riskScore} | Mode: ${decision.emoji} ${decision.mode} | ` +
    `${decision.safeguardApplied ? '⚠️ SAFEGUARD ACTIVE' : 'No safeguard'}`
  );
}

module.exports = {
  DECISION_MODES,
  getDecisionMode,
  makeDecision,
  logDecision,
};
