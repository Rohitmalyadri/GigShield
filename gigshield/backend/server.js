// ─────────────────────────────────────────────────────────
//  GigShield Backend — server.js
//  The main entry point for the Express server.
//  It loads environment variables, connects to PostgreSQL
//  via Prisma, connects to Redis, and starts listening for
//  incoming HTTP requests.
// ─────────────────────────────────────────────────────────

// Load all variables from the .env file into process.env
// This must be the VERY FIRST thing that runs so all other
// code can access the environment variables safely.
require('dotenv').config();

// Import the Express framework — this is what lets us
// build an HTTP server and define routes (URL endpoints).
const express = require('express');

// Import the CORS middleware.
// CORS stands for Cross-Origin Resource Sharing.
// Without this, a browser on port 3000 cannot call an API
// on a different port — it gets blocked by security rules.
const cors = require('cors');

// Import the PrismaClient — this is the object that talks
// to PostgreSQL on our behalf. It translates our JS code
// into SQL queries automatically.
const { PrismaClient } = require('@prisma/client');

// Import the Redis client library.
// Redis is used as a fast in-memory store for things like
// caching, rate limiting, and session data.
const redis = require('redis');

// Create a new Prisma instance. This object is what we use
// throughout the app to query the database.
const prisma = new PrismaClient();

// Create the Express application. Think of this as the
// "engine" of our web server.
const app = express();

// Tell Express to automatically parse incoming JSON bodies.
// Without this, req.body would be undefined when a client
// sends JSON data.
app.use(express.json());

// Enable CORS for all routes so the React dashboard (which
// runs on a different port) can call this API without
// Import our custom API routes (Layer 1 Ingestion)
const apiRoutes = require('./routes/api');

// Enable CORS for all routes...
app.use(cors());

// Mount the API routes
app.use('/api', apiRoutes);

// ─────────────────────────────────────────────────────────
//  HEALTH CHECK ROUTE
//  GET /  →  returns a JSON status message.
// ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'GigShield engine running' });
});

// ─────────────────────────────────────────────────────────
//  SERVER STARTUP FUNCTION
//  We wrap startup in an async function so we can use
//  'await' to wait for database and Redis connections
//  before we start accepting requests.
// ─────────────────────────────────────────────────────────
async function startServer() {
  try {
    // Connect to PostgreSQL via Prisma.
    // This sends a test query to make sure the database is
    // reachable and the credentials in .env are correct.
    await prisma.$connect();
    console.log('✅  PostgreSQL connected via Prisma');

    // Create a Redis client using the REDIS_URL from .env.
    // By default this is redis://localhost:6379
    const redisClient = redis.createClient({
      url: process.env.REDIS_URL,
    });

    // Listen for Redis connection errors.
    // If Redis is down, this logs the error but does NOT
    // crash the server — the rest of the app still runs.
    redisClient.on('error', (err) => {
      console.error('❌  Redis connection error:', err.message);
    });

    // Actually connect to Redis. Without this line the
    // client exists but is not yet connected.
    await redisClient.connect();
    console.log('✅  Redis connected');

    // Read the PORT from .env (defaults to 3000 if missing).
    // process.env pulls from the variables we loaded at the
    // very top of this file with dotenv.
    const PORT = process.env.PORT || 3000;

    // Start the HTTP server and begin listening for requests
    // on the specified port.
    app.listen(PORT, () => {
      // This callback runs once the server is ready.
      console.log(`🚀  GigShield server running on http://localhost:${PORT}`);
      console.log(`📡  Environment: ${process.env.NODE_ENV}`);

      // Start the Zero-Day Anomaly Poller — runs every 60 seconds
      // and scans all zones for mass rider dropoffs using Python ML
      const { startAnomalyPoller } = require('./ingestion/anomalyPoller');
      startAnomalyPoller();
    });
  } catch (error) {
    // If anything goes wrong during startup (e.g. wrong DB
    // password, database not running), log the error and
    // exit so the problem is visible immediately.
    console.error('❌  Startup failed:', error.message);
    process.exit(1);
  }
}

// Call the startup function to kick everything off.
startServer();
