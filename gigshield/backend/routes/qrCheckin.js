// ─────────────────────────────────────────────────────────
// QR CHECK-IN ROUTE — qrCheckin.js
// ─────────────────────────────────────────────────────────
// GET /api/checkin/:workerHash
//
// This is the URL encoded in the QR code. When a phone
// scans the QR and opens this URL it:
//   1. Marks the worker as online in PostgreSQL
//   2. Broadcasts 'worker_online' via WebSocket → dashboard updates
//   3. Narrates the moment using the AI narrator
//   4. Starts a 150-second countdown to auto-generate a disruption
//   5. Returns a mobile-friendly HTML confirmation page
// ─────────────────────────────────────────────────────────

const express             = require('express');
const { PrismaClient }    = require('@prisma/client');
const { broadcast }       = require('../socket/socketManager');
const { narrateEvent }    = require('../llm/narratorEngine');
const { generateDisruption } = require('../llm/scenarioEngine');

const router = express.Router();
const prisma = new PrismaClient();

// How long after check-in to auto-generate a disruption (from .env, default 150s)
const SCENARIO_DELAY_MS = parseInt(process.env.SCENARIO_DELAY_SECONDS || '150') * 1000;

// ─────────────────────────────────────────────────────────
// ROUTE: GET /api/checkin/:workerHash
// ─────────────────────────────────────────────────────────
router.get('/checkin/:workerHash', async (req, res) => {
  const { workerHash } = req.params;

  try {
    // ── STEP 1: Look up the worker ──────────────────────
    const worker = await prisma.worker.findUnique({
      where: { workerHash }
    });

    if (!worker) {
      // Worker not found — return a clean error page (not a crash)
      return res.status(404).send(buildErrorPage('Worker not found. Please contact GigShield support.'));
    }

    // ── STEP 2: Mark the worker as online ──────────────
    await prisma.worker.update({
      where: { workerHash },
      data:  { isActive: true }  // Toggle to online
    });

    console.log(`[Check-in] Worker checked in: ${worker.city} (zone ${worker.zone})`);

    // ── STEP 3: Get AI to narrate this moment ──────────
    // We do this FIRST (don't await in main flow) so the phone screen loads fast
    let narration = `A delivery worker has just gone online in ${worker.city}. GigShield coverage is now active.`;
    narrateEvent('worker_online', { city: worker.city, zone: worker.zone }).then(text => {
      narration = text;
    }).catch(() => {});  // Fail silently — use fallback string above

    // ── STEP 4: Broadcast 'worker_online' to dashboard ─
    await broadcast('worker_online', {
      data: {
        workerHash: workerHash.substring(0, 12) + '...',  // Don't broadcast full hash
        zone:       worker.zone,
        city:       worker.city,
        platforms:  worker.platforms,
        isActive:   true
      },
      narration
    });

    // ── STEP 5: Return the mobile confirmation page ─────
    // Send immediately so the phone screen shows confirmation right away
    res.send(buildConfirmationPage(worker));

    // ── STEP 6: Schedule auto-disruption after delay ───
    // This runs AFTER the phone response is already sent
    console.log(`[Check-in] Disruption scheduled in ${SCENARIO_DELAY_MS / 1000}s...`);

    setTimeout(async () => {
      console.log(`[Check-in] Timer fired — generating autonomous disruption for ${worker.city}...`);

      try {
        // Get all currently active workers for the scenario engine
        const activeWorkers = await prisma.worker.findMany({
          where: { isActive: true }
        });

        // Ask the AI to generate and auto-run a disruption
        const result = await generateDisruption(activeWorkers);

        if (result) {
          // Narrate the disruption scenario
          const disruptionNarration = await narrateEvent('disruption_generated', {
            city:          result.scenario.city,
            zone:          result.scenario.zone,
            rainfall_mm_hr: result.scenario.rainfall_mm_hr
          });

          // Broadcast the disruption event to the dashboard
          await broadcast('disruption_generated', {
            data:      result.scenario,
            narration: disruptionNarration
          });

          console.log(`[Check-in] Autonomous disruption complete: ${result.scenario.city}`);
        }
      } catch (err) {
        console.error(`[Check-in] Auto-disruption failed: ${err.message}`);
      }
    }, SCENARIO_DELAY_MS); // Wait 150 seconds after QR scan

  } catch (err) {
    console.error(`[Check-in] Error: ${err.message}`);
    res.status(500).send(buildErrorPage(err.message));
  }
});

// ─────────────────────────────────────────────────────────
// HELPER: Build the mobile confirmation HTML page
// Clean design that fits a phone screen
// ─────────────────────────────────────────────────────────
function buildConfirmationPage(worker) {
  const weeklyPremium = (worker.weeklyEarningsHistory || [])
    .reduce((s, v) => s + v, 0) / (worker.weeklyEarningsHistory?.length || 1) * 0.0075;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GigShield — You're Protected</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border-radius: 20px;
      padding: 36px 28px;
      max-width: 360px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,.5);
    }
    .shield { font-size: 56px; margin-bottom: 16px; }
    .status {
      display: inline-block;
      background: rgba(34,197,94,.15);
      color: #22c55e;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: .5px;
      margin-bottom: 24px;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .city { color: #94a3b8; font-size: 14px; margin-bottom: 28px; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #334155;
      font-size: 14px;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-value { font-weight: 600; color: #f1f5f9; }
    .footer {
      margin-top: 28px;
      font-size: 12px;
      color: #475569;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="shield">🛡️</div>
    <div class="status">● YOU ARE PROTECTED</div>
    <h1>Coverage Active</h1>
    <p class="city">${worker.city} — Zone ${worker.zone}</p>

    <div class="detail-row">
      <span class="detail-label">Platforms</span>
      <span class="detail-value">${(worker.platforms || []).join(', ')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Weekly Premium</span>
      <span class="detail-value">₹${Math.round(weeklyPremium)}/week</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Coverage</span>
      <span class="detail-value">Income disruption</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value" style="color:#22c55e">Online ✓</span>
    </div>

    <p class="footer">
      GigShield is now monitoring your zone in real time.<br>
      If a disruption is detected, your payout is automatic.<br>
      No action required from you.
    </p>
  </div>
</body>
</html>`;
}

function buildErrorPage(message) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px">
  <div><div style="font-size:48px;margin-bottom:16px">⚠️</div><h2>Check-in Failed</h2><p style="color:#94a3b8;margin-top:8px">${message}</p></div>
  </body></html>`;
}

module.exports = router;
