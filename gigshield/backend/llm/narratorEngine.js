// ─────────────────────────────────────────────────────────
// NARRATOR ENGINE — narratorEngine.js
// ─────────────────────────────────────────────────────────
// This is GigShield's voice. Every time something important
// happens in the backend (Gate 1 fires, payout lands, etc.)
// this module asks the AI to narrate it in plain English —
// the kind of explanation that would make sens to both
// the delivery worker AND the insurance judge watching.
// ─────────────────────────────────────────────────────────

require('dotenv').config();

const { askLLM } = require('./llmClient');

// ── FALLBACK NARRATIONS ────────────────────────────────────
// Pre-written narrations for each event type.
// These are used if the AI call fails, ensuring the demo
// NEVER silently breaks or shows an empty narrator panel.
const FALLBACK_NARRATIONS = {
  worker_online: (d) =>
    `${d.city} — a delivery worker has just gone online and their coverage has been activated for this week. GigShield is now monitoring their zone in real time.`,

  disruption_generated: (d) =>
    `Our AI has detected heavy rainfall of ${d.rainfall_mm_hr}mm per hour in ${d.city}. This exceeds the parametric threshold of 35mm per hour. The claim evaluation pipeline has been triggered automatically.`,

  gate1_result: (d) =>
    d.triggered
      ? `Gate 1 confirmed. Rainfall of ${d.rainfall_mm_hr}mm/hr in zone ${d.zone} has exceeded the environmental trigger threshold. This is a qualifying disruption event.`
      : `Gate 1 check complete. Current rainfall of ${d.rainfall_mm_hr}mm/hr is below the 35mm/hr threshold. No disruption event is triggered at this time.`,

  gate2_result: (d) =>
    d.validated
      ? `Gate 2 confirmed. The worker was actively online for ${d.onlineMinutes} minutes inside the disrupted zone during the event. Their income loss is verified.`
      : `Gate 2 check failed. The worker did not meet the minimum activity requirements during the disruption window. The claim has been rejected.`,

  fraud_result: (d) =>
    d.passed
      ? `Fraud validation complete. No duplicate claims were detected and the worker's location is consistent with their zone. The claim is cleared for payout.`
      : `Fraud check blocked this claim. ${d.reason || 'A duplicate claim was detected within the 3-hour disruption window.'}`,

  payout_fired: (d) =>
    `Payout of ₹${d.amount} has been credited to the worker's platform wallet. This covers ${d.hoursLost} hours of lost income at 75% of their average hourly rate — zero paperwork, zero waiting.`,

  llm_narration: (d) =>
    d.text || 'GigShield AI is processing the latest event.',

  anomaly_detected: (d) =>
    `Zero-day anomaly detected in zone ${d.zone}. ${d.clusteredCount} workers went offline simultaneously within a 5km radius. This pattern does not match any known weather event — a manual review has been flagged.`
};

/**
 * Generates a plain English narration for a system event.
 *
 * @param {string} eventType - One of the 8 event types (see Section 8)
 * @param {object} data - Event-specific data to include in the narration
 * @returns {string} 2-3 sentence narration in plain English
 */
async function narrateEvent(eventType, data) {

  // ── BUILD THE PROMPT ──────────────────────────────────
  // Each event type gets a specific prompt tailored to make
  // the narration relevant and accurate.
  let prompt = '';

  switch (eventType) {
    case 'worker_online':
      prompt = `
A food delivery worker has just scanned their GigShield QR code and started their shift in ${data.city || 'an Indian city'}.
Their weekly insurance coverage of ₹${data.premium || '45'} has been activated.
Write 2 sentences narrating this moment, as if you are an insurance AI announcing this to judges watching a demo.
Talk to the room — not to the worker.
Respond in plain English only. Maximum 2 sentences. No bullet points. No markdown. No technical jargon.`.trim();
      break;

    case 'disruption_generated':
      prompt = `
GigShield AI has autonomously generated a disruption scenario:
- City: ${data.city || 'Bangalore'}
- Rainfall: ${data.rainfall_mm_hr || 42}mm per hour (threshold is 35mm)
- Zone: ${data.zone || '560034'}
Write 2 sentences narrating this moment for judges watching a demo. Explain what is about to happen next.
Respond in plain English only. Maximum 2 sentences. No bullet points. No markdown. No technical jargon.`.trim();
      break;

    case 'gate1_result':
      prompt = `
GigShield's Environmental Gate has just evaluated a disruption.
Result: ${data.triggered ? 'PASSED' : 'FAILED'}
Reason: ${data.reason || `Rainfall was ${data.rainfall_mm_hr}mm/hr`}
Write 1-2 sentences narrating this gate decision for judges.
Be dramatic if it passed, matter-of-fact if it failed.
Respond in plain English only. No bullet points. No markdown. No jargon.`.trim();
      break;

    case 'gate2_result':
      prompt = `
GigShield's Activity Gate has evaluated the worker's behaviour during the disruption.
Result: ${data.validated ? 'PASSED' : 'FAILED'}
Reason: ${data.reason || 'Worker was online during the disruption window'}
Write 1-2 sentences narrating this decision for judges.
Respond in plain English only. No bullet points. No markdown. No jargon.`.trim();
      break;

    case 'fraud_result':
      prompt = `
GigShield's fraud detection layer has completed its checks.
Result: ${data.passed ? 'CLEARED' : 'BLOCKED'}
Check type: ${data.checkType || 'deduplication'}
Write 1-2 sentences narrating why this matters for fair insurance.
Respond in plain English only. No bullet points. No markdown. No jargon.`.trim();
      break;

    case 'payout_fired':
      prompt = `
A GigShield payout has just been processed.
Amount: ₹${data.amount}
Worker city: ${data.city || 'Bangalore'}
Hours of income protected: ${data.hoursLost || 2}
Transaction ID: ${data.transactionId || 'UTR12345'}
Write 2-3 sentences narrating this final payout as a celebratory conclusion for judges watching a demo.
Emphasize speed (under 3 minutes), zero paperwork, and real income protection.
Respond in plain English only. No bullet points. No markdown. No jargon.`.trim();
      break;

    case 'anomaly_detected':
      prompt = `
GigShield's Zero-Day detector has found something unusual.
${data.clusteredCount || 3} workers went offline simultaneously in zone ${data.zone}.
This does not match any known weather trigger — it may be a new type of disruption.
Write 2 sentences explaining what a Zero-Day anomaly means for parametric insurance.
Respond in plain English only. No bullet points. No markdown. No jargon.`.trim();
      break;

    default:
      // Unknown event type — no prompt, just use fallback
      prompt = '';
  }

  // ── ASK THE AI ────────────────────────────────────────
  if (prompt) {
    try {
      const narration = await askLLM(prompt);
      // Clean up any stray markdown characters the AI might have put in
      const cleaned = narration
        .replace(/[*_#`]/g, '')    // Remove markdown characters
        .replace(/\n+/g, ' ')     // Collapse newlines into spaces
        .trim();
      return cleaned;
    } catch (err) {
      console.warn(`[Narrator] AI narration failed for ${eventType}: ${err.message}. Using fallback.`);
    }
  }

  // ── FALLBACK ──────────────────────────────────────────
  // If AI failed or event type unknown, return pre-written narration
  const fallback = FALLBACK_NARRATIONS[eventType];
  if (fallback) {
    return typeof fallback === 'function' ? fallback(data) : fallback;
  }

  return 'GigShield is monitoring and processing this event.';
}

module.exports = { narrateEvent };
