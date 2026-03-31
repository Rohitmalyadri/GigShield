// ─────────────────────────────────────────────────────────
// SCENARIO ENGINE — scenarioEngine.js
// ─────────────────────────────────────────────────────────
// Asks the AI to autonomously CREATE a disruption scenario
// based on which workers are currently online.
// The AI picks the zone, the rainfall amount, and the story.
// Then it runs the actual dualGate pipeline automatically.
// This is what makes the demo completely autonomous.
// ─────────────────────────────────────────────────────────

require('dotenv').config();

// Import our LLM wrapper (Gemini → Ollama fallback)
const { askLLM } = require('./llmClient');

// Import the Dual Gate pipeline to run after generating the scenario
const { processDualGate } = require('../triggers/dualGate');

// Import Prisma so we can look up workers and create policies
const { PrismaClient } = require('@prisma/client');
const { calculateWeeklyPremium } = require('../risk/premiumCalculator');

const prisma = new PrismaClient();

// A hardcoded scenario to use if the AI returns bad/no JSON
const FALLBACK_SCENARIO = {
  zone:          '560034',             // Ravi's zone (Bangalore)
  city:          'Bangalore',
  rainfall_mm_hr: 42,                  // Definitely above the 35mm threshold
  event_description: 'Heavy rainfall detected in Koramangala, Bangalore.',
  estimated_hours_lost: 2
};

/**
 * Asks the AI to generate a disruption scenario and then runs
 * the full 5-layer pipeline for each affected worker.
 *
 * @param {object[]} activeWorkers - List of workers currently online
 *   Each worker: { workerHash, zone, city, id, weeklyEarningsHistory,
 *                  zoneRiskScore, seasonalMultiplier }
 *
 * @returns {object} The generated scenario + pipeline results
 */
async function generateDisruption(activeWorkers) {
  // If no workers are online, we can't generate a disruption for anyone
  if (!activeWorkers || activeWorkers.length === 0) {
    console.log('[Scenario Engine] No active workers — skipping disruption generation');
    return null;
  }

  // ── STEP 1: Build the prompt for the AI ───────────────
  // Describe the system and give the AI context about which workers are online
  const workerList = activeWorkers.map(w =>
    `- ${w.city} (zone: ${w.zone})`
  ).join('\n');

  const prompt = `
You are the risk intelligence engine for GigShield — an AI-powered parametric insurance platform for Indian food delivery riders (Zomato/Swiggy).

The following delivery workers are currently online and active:
${workerList}

Your job is to generate a realistic weather disruption event that would impact ONE of these zones.

Rules:
- Rainfall must be between 38 and 65 mm/hr (must exceed 35mm threshold)
- Pick one of the zones listed above
- Make it realistic for the Indian monsoon season
- The estimated_hours_lost must be between 1 and 3

Respond with valid JSON only. No markdown. No explanation. No code fences. Just the raw JSON object.

Required format:
{
  "zone": "the pin code",
  "city": "city name",
  "rainfall_mm_hr": number,
  "event_description": "One sentence describing the event",
  "estimated_hours_lost": number
}
`.trim();

  // ── STEP 2: Ask the AI ─────────────────────────────────
  let scenario = FALLBACK_SCENARIO; // start with fallback, override if AI succeeds

  try {
    const rawResponse = await askLLM(prompt);

    // Clean the response — remove any markdown code fences if AI added them
    const cleaned = rawResponse
      .replace(/```json\n?/g, '') // remove ```json
      .replace(/```\n?/g, '')     // remove closing ```
      .trim();

    // Parse the JSON — this will throw if the AI returned malformed JSON
    const parsed = JSON.parse(cleaned);

    // Validate that the required fields exist
    if (parsed.zone && parsed.rainfall_mm_hr && parsed.estimated_hours_lost) {
      scenario = parsed;
      console.log(`[Scenario Engine] AI generated disruption: ${scenario.city} — ${scenario.rainfall_mm_hr}mm/hr`);
    } else {
      // JSON is valid but missing required fields — use fallback
      console.warn('[Scenario Engine] AI JSON missing required fields. Using fallback scenario.');
    }
  } catch (err) {
    // AI responded but JSON parse failed — use fallback
    console.warn(`[Scenario Engine] Could not parse AI response: ${err.message}. Using fallback scenario.`);
  }

  // ── STEP 3: Find workers in the affected zone ──────────
  const affectedWorkers = activeWorkers.filter(w => w.zone === scenario.zone);

  if (affectedWorkers.length === 0) {
    // AI picked a zone with no active workers — use the first worker's zone
    console.log('[Scenario Engine] No workers in AI-selected zone. Using first active worker zone.');
    const firstWorker = activeWorkers[0];
    scenario.zone = firstWorker.zone;
    scenario.city = firstWorker.city;
    affectedWorkers.push(firstWorker);
  }

  console.log(`[Scenario Engine] Disruption affects ${affectedWorkers.length} worker(s) in zone ${scenario.zone}`);

  // ── STEP 4: Run the full 5-layer pipeline ─────────────
  const results = [];

  for (const worker of affectedWorkers) {
    // Build the weather data object for Gate 1
    const weatherData = {
      rain_1h: scenario.rainfall_mm_hr,
      weather: [{ main: 'Rain' }]
    };

    // Build the worker state for Gate 2
    const workerState = {
      worker_hash:            worker.workerHash,
      status:                 'online',
      zone:                   worker.zone,
      onlineMinutes:          75, // Worker has been online 75 minutes
      completions_last_hour:  0,  // No deliveries due to rain
      avg_completions_baseline: 4.2
    };

    // Create/find a policy for this worker
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const premiumAmount = calculateWeeklyPremium(
      worker.weeklyEarningsHistory,
      worker.zone,
      worker.zoneRiskScore,
      worker.seasonalMultiplier
    );

    const policy = await prisma.policy.create({
      data: {
        workerId:     worker.id,
        weekStartDate: weekStart,
        weekEndDate:   weekEnd,
        premiumAmount: premiumAmount,
        premiumPaid:   true,
        coverageActive: true
      }
    });

    // Run the Dual Gate pipeline
    const gateResult = await processDualGate(
      worker.id,
      policy.id,
      workerState,
      weatherData,
      scenario.zone,
      scenario.estimated_hours_lost,
      worker.weeklyEarningsHistory
    );

    results.push({ worker: worker.city, zone: worker.zone, gateResult });
  }

  // Return everything so the caller (qrCheckin.js) can broadcast results
  return { scenario, results };
}

module.exports = { generateDisruption };
