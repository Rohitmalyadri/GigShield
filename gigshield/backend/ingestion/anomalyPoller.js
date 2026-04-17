// ─────────────────────────────────────────────────────────
// LAYER 3 (EXTENSION) — ANOMALY POLLER (Node.js)
// ─────────────────────────────────────────────────────────
// This module runs periodically (every 60 seconds) and
// collects the current worker states from Prisma, then
// calls the Python anomaly detector to check if a
// Zero-Day event is happening in any zone.
//
// When an anomaly IS detected, it:
//   1. Creates a new DisruptionEvent record in PostgreSQL
//   2. Logs it prominently so the underwriter can review it
//   3. (Phase 3+): Triggers an alert notification
// ─────────────────────────────────────────────────────────

const { execSync }   = require('child_process');
const path           = require('path');
// BUG FIX: Use the shared Prisma singleton — this poller runs every 60s;
// creating a new PrismaClient each time would leak connections rapidly.
const prisma = require('../prismaClient');

// Path to our Python anomaly detector script
const ANOMALY_SCRIPT = path.join(__dirname, '..', 'risk', 'ml', 'anomalyDetector.py');

// How frequently to poll for anomalies (every 60 seconds in production; 15s for demo)
const POLL_INTERVAL_MS = process.env.ANOMALY_POLL_INTERVAL_MS || 60000;

/**
 * Runs the Python anomaly detector for a specific zone.
 * Calls: py anomalyDetector.py '<json>'
 * Returns the parsed JSON result.
 */
function runAnomalyDetection(zone, workers) {
  try {
    // Build the JSON payload to hand to Python
    const payload = JSON.stringify({ zone, workers });

    // Execute the script and capture stdout as JSON
    const stdout = execSync(
      `py "${ANOMALY_SCRIPT}" '${payload.replace(/'/g, '"')}'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    return JSON.parse(stdout.trim());
  } catch (err) {
    console.warn(`[Anomaly Poller] Python script failed for zone ${zone}: ${err.message}`);
    return { anomaly: false, reason: 'Script error', confidence: 'none' };
  }
}

/**
 * Main polling function. Fetches all active workers from the DB,
 * groups them by zone, and runs anomaly detection on each zone.
 */
async function pollForAnomalies() {
  console.log('[Anomaly Poller] Running zone scan...');

  try {
    // Fetch all workers from the database
    const workers = await prisma.worker.findMany({
      where: { isActive: true }
    });

    if (workers.length === 0) {
      console.log('[Anomaly Poller] No active workers found. Skipping scan.');
      return;
    }

    // Group workers by zone pin code
    const zoneGroups = {};
    workers.forEach(worker => {
      if (!zoneGroups[worker.zone]) zoneGroups[worker.zone] = [];

      // Build a mock worker state for each worker
      // In Phase 3+, this will come from live Redis heartbeat cache
      zoneGroups[worker.zone].push({
        worker_hash: worker.workerHash,
        // Simulate 20% chance of a worker being "offline"
        status: Math.random() > 0.2 ? 'online' : 'offline',
        gps: {
          // Slightly randomise the GPS around the zone's approximate centre
          lat: worker.zone === '560034' ? 12.935 + (Math.random()-0.5)*0.05 :
               worker.zone === '400053' ? 19.136 + (Math.random()-0.5)*0.05 :
               28.630 + (Math.random()-0.5)*0.05,
          lng: worker.zone === '560034' ? 77.624 + (Math.random()-0.5)*0.05 :
               worker.zone === '400053' ? 72.827 + (Math.random()-0.5)*0.05 :
               77.217 + (Math.random()-0.5)*0.05
        }
      });
    });

    // Scan each zone independently
    for (const [zone, zoneWorkers] of Object.entries(zoneGroups)) {
      const result = runAnomalyDetection(zone, zoneWorkers);

      if (result.anomaly) {
        // ------ ANOMALY DETECTED! ------
        console.warn(`\n⚠️  [ZERO-DAY ANOMALY] Zone ${zone} — ${result.reason}`);

        // Write a DisruptionEvent to the database for this anomaly
        await prisma.disruptionEvent.create({
          data: {
            zone:          zone,
            eventType:     'zero_day_anomaly',
            severity:      result.confidence === 'high' ? 'severe' : 'moderate',
            confirmedByApi: false,    // Not confirmed by external API yet (needs manual review)
            apiSource:     'zero_day_ml',
            startTime:     new Date(),
            endTime:       new Date(Date.now() + 3 * 60 * 60 * 1000) // Assume 3-hour event
          }
        });

        console.log(`[Anomaly Poller] DisruptionEvent written to DB for zone ${zone}`);
      } else {
        console.log(`[Anomaly Poller] Zone ${zone}: Normal (${result.reason})`);
      }
    }
  } catch (err) {
    console.error(`[Anomaly Poller] ERROR: ${err.message}`);
  }
}

/**
 * Start the anomaly polling process.
 * Call this from server.js at startup.
 */
function startAnomalyPoller() {
  console.log(`[Anomaly Poller] Starting — scanning every ${POLL_INTERVAL_MS / 1000}s`);
  
  // Run once immediately on startup so we don't wait 60s for first scan
  pollForAnomalies();

  // Then run on a fixed interval
  setInterval(pollForAnomalies, POLL_INTERVAL_MS);
}

module.exports = { startAnomalyPoller };
