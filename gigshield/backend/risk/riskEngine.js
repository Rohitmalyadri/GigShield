// ─────────────────────────────────────────────────────────
// RISK SCORING ENGINE — services/riskEngine.js
// ─────────────────────────────────────────────────────────
// Calculates a composite Risk Score (0–100) for any zone.
//
// Formula (configurable weights):
//   Risk Score =
//     (weatherScore    * 0.40) +
//     (workerShortage  * 0.30) +
//     (demandSurge     * 0.20) +
//     (regulatoryRisk  * 0.10)
//
// All inputs are normalized to 0–100 before weighting.
// The score and each component is stored in ZoneRisk.
// ─────────────────────────────────────────────────────────

'use strict';

const prisma = require('../prismaClient');

// ── DEFAULT WEIGHTS (sum must equal 1.0) ─────────────────
const DEFAULT_WEIGHTS = {
  weather:    0.40,
  shortage:   0.30,
  demand:     0.20,
  regulatory: 0.10,
};

// ── ZONE CITY MAP ──────────────────────────────────────────
const ZONE_CITY = {
  '560034': 'Bangalore', '560001': 'Bangalore', '560008': 'Bangalore',
  '400053': 'Mumbai',    '400001': 'Mumbai',    '400012': 'Mumbai',
  '110001': 'Delhi',     '110002': 'Delhi',     '110020': 'Delhi',
};

/**
 * Normalize a raw value into the 0–100 scale.
 * @param {number} value  - Raw input
 * @param {number} min    - Expected minimum
 * @param {number} max    - Expected maximum
 * @returns {number}      - Normalized 0–100
 */
function normalize(value, min = 0, max = 100) {
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

/**
 * Convert rainfall (mm/hr) to a 0–100 weather severity score.
 * Thresholds based on IMD (India Meteorological Department) standards:
 *   <15mm/hr  → light rain (low risk)
 *   15–35     → moderate
 *   35–65     → heavy ⚠️ (Gate 1 triggers at 35)
 *   65–100    → very heavy
 *   >100      → extremely heavy (max score)
 */
function rainfallToScore(mm_hr) {
  if (mm_hr <= 0)   return 0;
  if (mm_hr <= 15)  return normalize(mm_hr, 0, 15) * 0.2;   // 0–20
  if (mm_hr <= 35)  return 20 + normalize(mm_hr, 15, 35) * 0.3; // 20–50
  if (mm_hr <= 65)  return 50 + normalize(mm_hr, 35, 65) * 0.3; // 50–80
  return Math.min(100, 80 + normalize(mm_hr, 65, 120) * 0.2);   // 80–100
}

/**
 * Calculate worker shortage score (0–100).
 * If fewer workers are online than capacity, shortage increases.
 * @param {number} activeWorkers   - Workers currently online
 * @param {number} zoneCapacity    - Normal expected workers for this zone
 */
function workerShortageScore(activeWorkers, zoneCapacity = 10) {
  if (zoneCapacity <= 0) return 0;
  const shortage = Math.max(0, zoneCapacity - activeWorkers);
  return normalize(shortage, 0, zoneCapacity);
}

/**
 * Calculate demand surge score (0–100).
 * Compares current orders against baseline.
 * @param {number} currentOrders  - Orders placed this hour
 * @param {number} baselineOrders - Normal hourly order volume for the zone
 */
function demandSurgeScore(currentOrders, baselineOrders = 20) {
  if (baselineOrders <= 0) return 0;
  const ratio = currentOrders / baselineOrders;   // 1.0 = normal, 2.0 = double
  if (ratio <= 1.0) return 0;                     // No surge
  return Math.min(100, (ratio - 1.0) * 100);      // 100% over baseline → score 100
}

/**
 * Convert regulatory flags to a 0–100 score.
 * @param {object} flags  - { curfew, lockdown, floodAlert, strike }
 */
function regulatoryScore(flags = {}) {
  let score = 0;
  if (flags.curfew)     score += 80;
  if (flags.lockdown)   score += 70;
  if (flags.floodAlert) score += 50;
  if (flags.strike)     score += 30;
  return Math.min(100, score);
}

// ─────────────────────────────────────────────────────────
// MAIN SCORING FUNCTION
// ─────────────────────────────────────────────────────────
/**
 * Calculates the composite Risk Score for a zone.
 *
 * @param {string} zoneId          - Zone pin code
 * @param {object} inputs          - Raw sensor/API inputs
 *   @param {number} inputs.rainfall_mm_hr    - Rainfall intensity (default 0)
 *   @param {number} inputs.activeWorkers     - Workers online now (default 5)
 *   @param {number} inputs.zoneCapacity      - Normal worker count (default 10)
 *   @param {number} inputs.currentOrders     - Orders this hour (default 20)
 *   @param {number} inputs.baselineOrders    - Normal hourly orders (default 20)
 *   @param {object} inputs.regulatoryFlags   - Curfew/lockdown/flood flags
 * @param {object} weights         - Override default weights (optional)
 * @param {boolean} persist        - Save to DB (default true)
 *
 * @returns {object} Full scored result with components and decision mode
 */
async function calculateRiskScore(zoneId, inputs = {}, weights = {}, persist = true) {
  const W = { ...DEFAULT_WEIGHTS, ...weights };

  // ── STEP 1: Compute each component score (all 0–100) ─────
  const weatherScore   = rainfallToScore(inputs.rainfall_mm_hr || 0);
  const shortageScore  = workerShortageScore(inputs.activeWorkers ?? 5, inputs.zoneCapacity ?? 10);
  const demandScore    = demandSurgeScore(inputs.currentOrders ?? 20, inputs.baselineOrders ?? 20);
  const regulatoryScr  = regulatoryScore(inputs.regulatoryFlags || {});

  // ── STEP 2: Apply weights and sum ──────────────────────────
  const riskScore = Math.min(100, Math.round(
    (weatherScore  * W.weather)    +
    (shortageScore * W.shortage)   +
    (demandScore   * W.demand)     +
    (regulatoryScr * W.regulatory)
  ));

  // ── STEP 3: Determine decision mode ────────────────────────
  const decisionMode = getDecisionMode(riskScore);

  const result = {
    zoneId,
    city:           ZONE_CITY[zoneId] || 'Unknown',
    riskScore,
    decisionMode,
    components: {
      weatherScore:   Math.round(weatherScore),
      workerShortage: Math.round(shortageScore),
      demandSurge:    Math.round(demandScore),
      regulatoryRisk: Math.round(regulatoryScr),
    },
    weights: W,
    inputs, // echo back for transparency
    timestamp: new Date().toISOString(),
  };

  // ── STEP 4: Persist to DB ──────────────────────────────────
  if (persist) {
    await prisma.zoneRisk.create({
      data: {
        zoneId,
        city:          result.city,
        riskScore,
        weatherScore:  result.components.weatherScore,
        workerShortage: result.components.workerShortage,
        demandSurge:   result.components.demandSurge,
        regulatoryRisk: result.components.regulatoryRisk,
        decisionMode,
      }
    });
  }

  return result;
}

/**
 * Get the latest stored risk score for a zone from the database.
 * Falls back to a real-time calculation using cached zone defaults.
 */
async function getLatestZoneRisk(zoneId) {
  const record = await prisma.zoneRisk.findFirst({
    where:   { zoneId },
    orderBy: { timestamp: 'desc' },
  });
  return record;
}

/**
 * Get risk scores for all zones (latest per zone).
 */
async function getAllZoneRisks() {
  // Get distinct zones and their latest risk records
  const zones = await prisma.zoneRisk.findMany({
    orderBy: { timestamp: 'desc' },
  });

  // Deduplicate — keep only the most recent per zoneId
  const seen = new Set();
  return zones.filter(z => {
    if (seen.has(z.zoneId)) return false;
    seen.add(z.zoneId);
    return true;
  });
}

module.exports = {
  calculateRiskScore,
  getLatestZoneRisk,
  getAllZoneRisks,
  // Expose helpers for unit testing
  rainfallToScore,
  workerShortageScore,
  demandSurgeScore,
  regulatoryScore,
  normalize,
};

// ── Import from Decision Engine (avoids circular dependency) ─
// Note: getDecisionMode is defined in decisionEngine but we need
// it here → inline the logic directly to avoid circular require.
function getDecisionMode(riskScore) {
  if (riskScore <= 30) return 'NORMAL';
  if (riskScore <= 60) return 'INCENTIVE';
  if (riskScore <= 80) return 'PROTECTION';
  return 'CRITICAL';
}
