// ─────────────────────────────────────────────────────────
// LAYER 4 — FRAUD CHECK 2: GPS Spoofing Detection
// ─────────────────────────────────────────────────────────
// PROBLEM: A worker could fake their GPS location to appear
// inside a flooded zone while actually sitting at home,
// just to trigger a payout they're not entitled to.
//
// SOLUTION:
// For Phase 2 we implement a "zone consistency check".
// The worker's last known zone (stored in Redis from their
// regular 5-second heartbeat webhooks) must match the
// disruption zone they're claiming for.
//
// If the worker was in zone "110001" (Delhi) 5 minutes ago,
// they cannot suddenly claim they are in zone "560034"
// (Bangalore) during the disruption — that's physically
// impossible. We flag this as a spoofing attempt.
//
// Phase 3 enhancement: cross-reference with cell-tower
// triangulation data for a stronger signal.
// ─────────────────────────────────────────────────────────

/**
 * Checks whether the worker's GPS zone is consistent with
 * their recent historically logged location.
 *
 * @param {object} workerState   - The current activity payload being evaluated
 *   Contains: { zone, gps: { lat, lng }, status }
 *
 * @param {object|null} lastKnownState - The worker's most recent heartbeat
 *   as stored in Redis. Could be null if no history exists yet.
 *   Contains: { zone, gps: { lat, lng }, timestamp }
 *
 * @returns {{ isSpoofed: boolean, reason: string, confidence: string }}
 *   isSpoofed: true if we suspect GPS manipulation
 *   reason: plain English explanation
 *   confidence: "low", "medium", or "high" — how confident we are
 */
function checkGpsSpoofing(workerState, lastKnownState) {

  // If we have no previous location on record (e.g. brand new worker),
  // we CANNOT accuse them of spoofing — give them the benefit of the doubt.
  if (!lastKnownState) {
    return {
      isSpoofed: false,
      reason: 'No previous location data available. Cannot confirm spoofing — allowing claim.',
      confidence: 'low'
    };
  }

  // ZONE CONSISTENCY CHECK:
  // The worker's claimed zone MUST match their recently logged zone.
  const currentZone  = workerState.zone;        // Zone they are claiming to be in
  const previousZone = lastKnownState.zone;     // Zone they were in last heartbeat

  if (currentZone !== previousZone) {

    // Calculate how long ago the last heartbeat was.
    const lastTimestamp    = new Date(lastKnownState.timestamp);
    const now              = new Date();
    const minutesSinceLast = (now - lastTimestamp) / 60000; // Convert ms to minutes

    // If the zone changed within 10 minutes — physically impossible across cities.
    // Bangalore to Mumbai takes hours — a zone change in 10 mins = spoofing.
    if (minutesSinceLast < 10) {
      return {
        isSpoofed: true,
        reason: `Zone changed from ${previousZone} to ${currentZone} in only ${Math.round(minutesSinceLast)} minutes. Physically impossible — GPS spoofing suspected.`,
        confidence: 'high'
      };
    }

    // If it's been over 10 minutes, the zone shift might be legitimate.
    // Flag it as a low-confidence warning but don't block the claim.
    return {
      isSpoofed: false,
      reason: `Zone change detected (${previousZone} → ${currentZone}) but ${Math.round(minutesSinceLast)} mins have passed. Flagged for review but not blocked.`,
      confidence: 'low'
    };
  }

  // Zone is consistent — no spoofing detected
  return {
    isSpoofed: false,
    reason: `GPS zone is consistent with last known location (zone: ${currentZone}).`,
    confidence: 'high'
  };
}

// Export so dualGate.js can import and call this check
module.exports = { checkGpsSpoofing };
