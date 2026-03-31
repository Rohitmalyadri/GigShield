// ─────────────────────────────────────────────────────────
// QR GENERATOR ROUTE — qrGenerator.js
// ─────────────────────────────────────────────────────────
// GET /api/qr/:workerHash
//
// Returns a QR code PNG image.
// The QR encodes a URL pointing to the check-in endpoint.
// When a worker scans this on their phone, it opens:
//   http://[WIFI_IP]:4000/api/checkin/[workerHash]
// ─────────────────────────────────────────────────────────

const express = require('express');
const QRCode  = require('qrcode');     // npm package to generate QR codes
const os      = require('os');         // Built-in Node.js module to get network info

const router = express.Router();

/**
 * Helper: finds this machine's real WiFi IP address.
 * Skips virtual adapters from VMware, VirtualBox, Hyper-V, etc.
 * because phones can't reach those virtual networks.
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  // Names of virtual/internal adapters to skip
  const SKIP_KEYWORDS = ['vmware', 'virtualbox', 'hyper-v', 'vethernet',
                         'loopback', 'pseudo', 'bluetooth', 'vbox'];

  // Priority: prefer adapters with "wi-fi", "wireless", "wlan" in name
  const WIFI_KEYWORDS = ['wi-fi', 'wireless', 'wlan', 'wifi', 'wlp'];

  let bestIP   = null;  // Preferred: actual WiFi adapter
  let fallback = null;  // Fallback: any non-virtual IPv4

  for (const [name, addrs] of Object.entries(interfaces)) {
    const lower   = name.toLowerCase();
    const isVirtual = SKIP_KEYWORDS.some(k => lower.includes(k));
    const isWifi    = WIFI_KEYWORDS.some(k => lower.includes(k));

    // Skip virtual adapters entirely
    if (isVirtual) continue;

    for (const addr of addrs) {
      // Only want real IPv4 non-loopback addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        if (isWifi) {
          bestIP = addr.address;    // Found a WiFi adapter — highest priority
        } else if (!fallback) {
          fallback = addr.address;  // Non-virtual but not WiFi — keep as backup
        }
      }
    }
  }

  const ip = bestIP || fallback || 'localhost';
  console.log(`[QR Generator] Detected local IP: ${ip} (adapter priority applied)`);
  return ip;
}

// ─────────────────────────────────────────────────────────
// ROUTE: GET /api/qr/:workerHash
// Returns a QR code PNG image for the given worker
// ─────────────────────────────────────────────────────────
router.get('/qr/:workerHash', async (req, res) => {
  const { workerHash } = req.params;

  try {
    // Use manual override from .env if set, otherwise auto-detect
    const localIP = process.env.LOCAL_WIFI_IP || getLocalIP();
    const PORT    = process.env.PORT || 4000;
    const checkinUrl = `http://${localIP}:${PORT}/api/checkin/${workerHash}`;

    console.log(`[QR Generator] Generating QR for URL: ${checkinUrl}`);

    // Generate the QR code as a PNG data buffer
    const qrBuffer = await QRCode.toBuffer(checkinUrl, {
      errorCorrectionLevel: 'M',  // Medium error correction (good for demos)
      type:   'png',
      width:  400,                // 400x400 pixels — large enough to be readable
      margin: 2,                  // Small quiet zone border around the code
      color: {
        dark:  '#000000',         // Black squares
        light: '#ffffff'          // White background
      }
    });

    // Send the PNG image as the HTTP response
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');  // Always generate fresh
    res.send(qrBuffer);

  } catch (err) {
    console.error(`[QR Generator] Error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Also expose the raw check-in URL as JSON (useful for the dashboard)
router.get('/qr-url/:workerHash', (req, res) => {
  const { workerHash } = req.params;
  const localIP = getLocalIP();
  const PORT    = process.env.PORT || 4000;
  const url     = `http://${localIP}:${PORT}/api/checkin/${workerHash}`;
  res.json({ success: true, url, localIP });
});

module.exports = router;
