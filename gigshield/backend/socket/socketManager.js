// ─────────────────────────────────────────────────────────
// SOCKET MANAGER — socketManager.js
// ─────────────────────────────────────────────────────────
// This is the central WebSocket broadcast hub.
// EVERY real-time event in GigShield goes through here.
//
// How it works:
//   1. server.js calls initSocket(httpServer) on startup
//   2. Any other file imports { broadcast } from here
//   3. broadcast('event_name', { data }) → all dashboards update instantly
//
// The benefit: we call broadcast() once and it reaches:
//   - The React Mission Control dashboard
//   - Any future mobile apps or monitoring tools
//   - All browser tabs open on the dashboard
// ─────────────────────────────────────────────────────────

// Import Socket.io server
const { Server } = require('socket.io');

// This variable holds the active socket.io instance.
// It starts as null and gets set when initSocket() is called.
let io = null;

/**
 * Initialize Socket.io on the existing HTTP server.
 * Must be called ONCE from server.js on startup.
 *
 * @param {http.Server} httpServer - The Node.js HTTP server
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    // Allow cross-origin requests from the React dashboard
    // running on a different port (5173)
    cors: {
      origin: '*',   // Allow any origin (restrict to 5173 in production)
      methods: ['GET', 'POST']
    }
  });

  // Log when a new browser tab or app connects
  io.on('connection', (socket) => {
    console.log(`[Socket] 🟢 Client connected: ${socket.id}`);

    // Log when a client disconnects (tab closed, etc.)
    socket.on('disconnect', () => {
      console.log(`[Socket] 🔴 Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket] WebSocket server initialized');
  return io;
}

/**
 * Broadcast an event to ALL connected clients simultaneously.
 * Use this everywhere in the codebase to push real-time updates.
 *
 * @param {string} eventName - One of the 8 event names from Section 8
 * @param {object} data      - Event-specific payload data
 *
 * Standard payload shape (include narration if available):
 * {
 *   event:     'gate1_result',
 *   timestamp: '2026-03-26T14:00:00Z',
 *   data:      { ...event data... },
 *   narration: 'Plain English explanation from the AI'
 * }
 */
function broadcast(eventName, data) {
  if (!io) {
    // Socket not initialized yet — this should not happen in normal operation
    console.warn(`[Socket] Cannot broadcast "${eventName}" — socket not initialized`);
    return;
  }

  // Inject a timestamp into every broadcast automatically
  const payload = {
    event:     eventName,
    timestamp: new Date().toISOString(),
    ...data           // Spread the caller's data (includes narration, etc.)
  };

  // Emit to ALL connected clients
  io.emit(eventName, payload);

  console.log(`[Socket] 📡 Broadcast: "${eventName}" → ${io.engine.clientsCount} client(s)`);
}

/**
 * Get the socket.io instance (for advanced usage).
 * Most code should just use broadcast() instead.
 */
function getIO() {
  return io;
}

module.exports = { initSocket, broadcast, getIO };
