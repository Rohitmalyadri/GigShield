const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PORT = process.env.MOCK_PLATFORM_PORT || 3001;
const INTERVAL = process.env.MOCK_WEBHOOK_INTERVAL_MS || 5000;

// URL of our central RouteSafe Insurance ingestion endpoint
const RouteSafe Insurance_WEBHOOK_URL = 'http://localhost:4000/api/webhooks/platform';

/**
 * Generate mock activity payload for a given worker
 */
function generateActivityPayload(worker) {
  // Defensive check in case platforms is empty
  const platforms = worker.platforms || ['zomato'];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  
  // Add some jitter to GPS based on their city
  let baseLat = 12.9716; // Default bangalore
  let baseLng = 77.5946;
  if(worker.city === 'Mumbai') { baseLat=19.0760; baseLng=72.8777; }
  if(worker.city === 'Delhi')  { baseLat=28.7041; baseLng=77.1025; }

  const latJitter = (Math.random() - 0.5) * 0.01;
  const lngJitter = (Math.random() - 0.5) * 0.01;

  // Add some jitter to completions
  const completionsJitter = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
  let completions_last_hour = 2 + completionsJitter;
  if(completions_last_hour < 0) completions_last_hour = 0;

  return {
    worker_hash: worker.workerHash,
    platform: platform,
    timestamp: new Date().toISOString(),
    status: Math.random() > 0.1 ? "online" : "on_delivery",
    gps: {
      lat: baseLat + latJitter,
      lng: baseLng + lngJitter
    },
    zone: worker.zone,
    completions_last_hour: Math.round(completions_last_hour),
    avg_completions_baseline: 2
  };
}

/**
 * Emit webhooks periodically
 */
function startEmitting() {
  console.log(`[Mock Server] Starting continuous worker activity simulation...`);
  
  setInterval(async () => {
    // Fetch live workers from DB so we include new registrations instantly!
    const activeWorkers = await prisma.worker.findMany({ where: { isActive: true } });

    for (const worker of activeWorkers) {
      if (Math.random() > 0.8) continue; // Randomly skip some ticks to simulate real-world fuzziness

      const payload = generateActivityPayload(worker);
      
      try {
        const response = await fetch(RouteSafe Insurance_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log(`[Event Sent] ${worker.name} on ${payload.platform} -> Status: ${response.status}`);
      } catch (err) {
        console.log(`[Event Failed] Target offline: ${RouteSafe Insurance_WEBHOOK_URL}`);
      }
    }
  }, INTERVAL);
}

// Don't need an express server just to emit ticks.
startEmitting();
