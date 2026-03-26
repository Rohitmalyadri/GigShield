# ─────────────────────────────────────────────────────────
# LAYER 3 (EXTENSION) — ZERO-DAY ANOMALY DETECTOR
# ─────────────────────────────────────────────────────────
# PURPOSE:
# Traditional parametric insurance only pays out when a
# KNOWN trigger fires (heavy rain, cyclone, etc.).
# But what about the UNKNOWN? What if a massive pothole
# event, a political shutdown, or an unclassified hazard
# suddenly knocks 80% of riders OFFLINE in a 5km zone?
#
# This is the Zero-Day detector. It doesn't ask "did it rain?"
# It asks a smarter question:
#   "Are an abnormal number of workers going offline in the
#    same zone at the same time, compared to their baseline?"
#
# HOW IT WORKS:
#   1. We receive a JSON array of worker states for a zone.
#   2. We calculate the offline rate: offline_workers / total_workers
#   3. We use DBSCAN (a clustering algorithm) to check if
#      the offline workers are geographically CLUSTERED
#      (e.g., all within 2km of each other) rather than
#      scattered randomly (e.g., people just taking breaks).
#   4. If offline_rate > 0.80 AND workers are clustered:
#      → Flag as "Zero-Day Anomaly Detected"
#      → This triggers a manual review / new archetype creation
#
# Usage: py anomalyDetector.py '<json_payload>'
# Returns JSON: { "anomaly": true/false, "reason": "...", "confidence": "..." }
# ─────────────────────────────────────────────────────────

import sys
import json
import logging
import warnings

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.ERROR, stream=sys.stderr)

# Constants — tuned to the problem domain
OFFLINE_RATE_THRESHOLD  = 0.80   # 80%+ offline workers = anomaly
MIN_CLUSTERED_WORKERS   = 3      # At least 3 workers must be in the cluster
CLUSTER_RADIUS_KM       = 5.0    # Workers within 5km count as "same area"

def haversine_distance_km(lat1, lng1, lat2, lng2):
    """Calculate the straight-line distance between two GPS points in km."""
    import math
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def detect_anomaly(worker_states):
    """
    Core detection function.
    
    Args:
        worker_states: list of dicts, each with:
            { status: str, gps: { lat: float, lng: float }, zone: str }
    
    Returns:
        dict with keys: anomaly (bool), reason (str), confidence (str),
                        offline_rate (float), clustered_count (int)
    """
    if not worker_states or len(worker_states) < 3:
        return {
            "anomaly": False,
            "reason": "Insufficient worker data (need at least 3 workers in zone)",
            "confidence": "low",
            "offline_rate": 0,
            "clustered_count": 0
        }

    total_workers   = len(worker_states)
    offline_workers = [w for w in worker_states if w.get("status") == "offline"]
    offline_rate    = len(offline_workers) / total_workers

    # ── CHECK 1: Is the offline rate above the threshold? ──
    if offline_rate < OFFLINE_RATE_THRESHOLD:
        return {
            "anomaly": False,
            "reason": f"Normal offline rate: {round(offline_rate * 100, 1)}% (threshold: {int(OFFLINE_RATE_THRESHOLD * 100)}%)",
            "confidence": "high",
            "offline_rate": round(offline_rate, 3),
            "clustered_count": 0
        }

    # ── CHECK 2: Are the offline workers geographically clustered? ──
    # Extract GPS coordinates of offline workers (skip those missing GPS)
    offline_coords = [
        (w["gps"]["lat"], w["gps"]["lng"])
        for w in offline_workers
        if "gps" in w and "lat" in w["gps"] and "lng" in w["gps"]
    ]

    if len(offline_coords) < MIN_CLUSTERED_WORKERS:
        return {
            "anomaly": False,
            "reason": f"High offline rate ({round(offline_rate*100,1)}%) but insufficient GPS data to confirm clustering",
            "confidence": "low",
            "offline_rate": round(offline_rate, 3),
            "clustered_count": 0
        }

    # Try to use DBSCAN for clustering if sklearn is available
    try:
        from sklearn.cluster import DBSCAN
        import numpy as np

        # Convert coordinates to radians for haversine metric
        coords_rad = np.radians(offline_coords)

        # eps = cluster radius in radians (5km / Earth radius in km)
        eps_rad = CLUSTER_RADIUS_KM / 6371.0

        db = DBSCAN(eps=eps_rad, min_samples=MIN_CLUSTERED_WORKERS, algorithm='ball_tree', metric='haversine')
        labels = db.fit_predict(coords_rad)

        # Count workers that belong to a cluster (label != -1 means clustered)
        clustered_count = sum(1 for label in labels if label != -1)

    except ImportError:
        # Fallback: simple pairwise distance check without sklearn
        clustered_count = 0
        for i, (lat1, lng1) in enumerate(offline_coords):
            nearby = sum(
                1 for j, (lat2, lng2) in enumerate(offline_coords)
                if i != j and haversine_distance_km(lat1, lng1, lat2, lng2) <= CLUSTER_RADIUS_KM
            )
            if nearby >= MIN_CLUSTERED_WORKERS - 1:
                clustered_count += 1

    # ── FINAL VERDICT ──────────────────────────────────────
    if clustered_count >= MIN_CLUSTERED_WORKERS:
        return {
            "anomaly": True,
            "reason": (
                f"ZERO-DAY ANOMALY DETECTED: {round(offline_rate*100,1)}% offline rate "
                f"with {clustered_count} workers clustered within {CLUSTER_RADIUS_KM}km. "
                f"Unclassified disruptive event suspected in this zone."
            ),
            "confidence": "high" if clustered_count >= 5 else "medium",
            "offline_rate": round(offline_rate, 3),
            "clustered_count": clustered_count
        }
    else:
        return {
            "anomaly": False,
            "reason": f"High offline rate ({round(offline_rate*100,1)}%) but workers are not geographically clustered (random breaks)",
            "confidence": "medium",
            "offline_rate": round(offline_rate, 3),
            "clustered_count": clustered_count
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        logging.error("Missing JSON payload. Usage: py anomalyDetector.py '<json>'")
        print(json.dumps({"anomaly": False, "reason": "No input provided", "confidence": "none"}))
        sys.exit(1)

    try:
        # Parse the JSON payload passed as a command-line argument
        payload = json.loads(sys.argv[1])
        worker_states = payload.get("workers", [])

        result = detect_anomaly(worker_states)

        # Print the result as JSON so Node.js can parse it
        print(json.dumps(result))

    except json.JSONDecodeError as e:
        logging.error(f"Invalid JSON input: {e}")
        print(json.dumps({"anomaly": False, "reason": "Invalid JSON payload", "confidence": "none"}))
