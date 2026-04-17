const prisma = require('../prismaClient');  // shared singleton

/**
 * Handle incoming platform webhooks (activity & suspension)
 * Layer 1 Input
 */
const handlePlatformWebhook = async (req, res) => {
  const payload = req.body;
  
  try {
    // 1. If it's a zone suspension event
    if (payload.event_type === 'zone_suspension') {
      console.log(`[Ingestion] Received Zone Suspension from ${payload.platform} for zone ${payload.zone}`);
      
      const newEvent = await prisma.disruptionEvent.create({
        data: {
          zone: payload.zone,
          eventType: payload.event_type,
          severity: 'severe',
          confirmedByApi: true,
          apiSource: payload.platform,
          startTime: new Date(payload.timestamp),
          endTime: new Date(new Date(payload.timestamp).getTime() + payload.estimated_duration_minutes * 60000)
        }
      });
      return res.status(200).json({ success: true, eventId: newEvent.id });
    }

    // 2. If it's a regular worker activity update
    if (payload.worker_hash && payload.status) {
      // We just log it for now. In Phase 2, this updates Redis.
      console.log(`[Ingestion] Worker heartbeat received: ${payload.worker_hash.substring(0, 8)}`);
      return res.status(200).json({ success: true, message: "Activity logged" });
    }

    res.status(400).json({ success: false, error: 'Unknown payload type' });
  } catch (error) {
    console.error(`[Ingestion Error] ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = {
  handlePlatformWebhook
};
