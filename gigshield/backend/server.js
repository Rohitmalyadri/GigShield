// ─────────────────────────────────────────────────────────
//  RouteSafe Insurance Backend — server.js
//  The main entry point for the Express server.
//  It loads environment variables, connects to PostgreSQL
//  via Prisma, connects to Redis, and starts listening for
//  incoming HTTP requests.
// ─────────────────────────────────────────────────────────

// Load all variables from the .env file into process.env
require('dotenv').config();

const express           = require('express');
const cors              = require('cors');
const http              = require('http');
// Use the shared Prisma singleton — prevents multiple PrismaClient instances
const prisma            = require('./prismaClient');
const redis             = require('redis');

// Import our custom route files
const apiRoutes         = require('./routes/api');
const qrCheckinRoutes   = require('./routes/qrCheckin');
const qrGeneratorRoutes = require('./routes/qrGenerator');
const paymentRoutes     = require('./routes/payment');     // Razorpay payment routes
const riskRoutes        = require('./routes/risk');        // Dynamic Risk Protection Engine

// Import the WebSocket manager
const { initSocket }    = require('./socket/socketManager');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Mount all routes
app.use('/api',          apiRoutes);
app.use('/api',          qrCheckinRoutes);       // GET  /api/checkin/:workerHash
app.use('/api',          qrGeneratorRoutes);      // GET  /api/qr/:workerHash
app.use('/api/payment',  paymentRoutes);          // POST /api/payment/create-order, /verify | GET /history
app.use('/api/risk',     riskRoutes);             // GET  /api/risk/score/:id, POST /simulate, /evaluate
app.use('/api',          riskRoutes);             // POST /api/compensation/calculate, GET /api/analytics/dashboard

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'RouteSafe Insurance engine running', version: 'Phase 4' });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅  PostgreSQL connected via Prisma');

    const redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.error('❌  Redis connection error:', err.message);
    });
    await redisClient.connect();
    console.log('✅  Redis connected');

    const PORT = process.env.PORT || 4000;

    // CHANGED: create an http.Server that wraps our Express app.
    // Socket.io needs the raw http.Server to attach to — not the Express app directly.
    const httpServer = http.createServer(app);

    // Attach Socket.io to the http server
    initSocket(httpServer);
    console.log('✅  WebSocket (Socket.io) initialized');

    // Start listening — note: httpServer.listen(), NOT app.listen()
    httpServer.listen(PORT, () => {
      console.log(`🚀  RouteSafe Insurance server running on http://localhost:${PORT}`);
      console.log(`📡  Environment: ${process.env.NODE_ENV}`);
      console.log(`🔌  WebSockets ready at ws://localhost:${PORT}`);

      // Start the Zero-Day Anomaly Poller
      const { startAnomalyPoller } = require('./ingestion/anomalyPoller');
      startAnomalyPoller();
    });

  } catch (error) {
    console.error('❌  Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
