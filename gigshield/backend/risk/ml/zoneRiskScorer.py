# ─────────────────────────────────────────────────────────
# LAYER 2 (UPDATE) — PYTHON ML RISK SCORER
# ─────────────────────────────────────────────────────────
# This script calculates a dynamic risk multiplier for a given
# zone pin code using a mock scikit-learn model.
#
# In Phase 1, we used a flat 1.0 multiplier for all zones.
# In Phase 2, we dynamically score zones based on historical
# disruption frequency (e.g., flood-prone zones pay higher
# premiums, safe zones get discounts).
#
# Usage: python zoneRiskScorer.py <pin_code>
# Returns: <float_multiplier_value>
# ─────────────────────────────────────────────────────────

import sys
import json
import logging
import warnings

# Use a standard fallback multiplier if anything goes wrong
FALLBACK_MULTIPLIER = 1.0

# Configure logging to only show critical errors to stderr, 
# reserving stdout purely for the final output number that Node.js reads
logging.basicConfig(level=logging.ERROR, stream=sys.stderr)

# Suppress scikit-learn warnings about lacking feature names in mock models
warnings.filterwarnings("ignore")

try:
    # We must have scikit-learn installed to use this script.
    # If the hackathon environment lacks it, we fallback to hardcoded logic to prevent crashes.
    from sklearn.linear_model import LinearRegression
    import numpy as np

    # ── MOCK HISTORICAL TRAINING DATA ────────────────────
    # Features: [elevation_meters, historical_floods_last_year, avg_rainfall_mm]
    # We pretend we fetched this data for specific Indian zones.
    training_data_X = np.array([
        [900, 1, 80],  # Bangalore (560034) - High elevation, rare severe floods, moderate rain
        [10,  4, 250],   # Mumbai (400053)    - Low elevation, frequent floods, heavy rain
        [210, 0, 40]   # Delhi (110001)     - Med elevation, no floods, low rain
    ])

    # Target multipliers (what the model learns to predict)
    # Bangalore = 1.0x (standard), Mumbai = 1.4x (high risk), Delhi = 0.8x (low risk discount)
    training_data_Y = np.array([1.0, 1.4, 0.8])

    # ── TRAIN THE MODEL ──────────────────────────────────
    # A simple linear model to demonstrate ML integration
    model = LinearRegression()
    model.fit(training_data_X, training_data_Y)

    # ── GET ZONE RISK ────────────────────────────────────
    # Our simple lookup table mapping pin codes to their geographical features
    zone_features = {
        "560034": [900, 1, 80],   # Bangalore (Koramangala)
        "400053": [10,  4, 250],  # Mumbai (Andheri)
        "110001": [210, 0, 40]    # Delhi (Connaught Place)
    }

    def get_risk_multiplier(pin_code):
        if pin_code in zone_features:
            features = np.array([zone_features[pin_code]])
            # Predict the multiplier using our trained model
            prediction = model.predict(features)[0]
            # Ensure the multiplier stays within reasonable bounds (0.5x to 2.0x)
            return max(0.5, min(2.0, round(prediction, 2)))
        else:
            # Unknown zone gets the standard base rate
            return FALLBACK_MULTIPLIER

except ImportError:
    # ── FALLBACK MODE ────────────────────────────────────
    # If the user hasn't run `pip install scikit-learn numpy` yet,
    # we use a hardcoded fallback instead of crashing their demo.
    logging.warning("scikit-learn is not installed. Using mocked fallback logic.")
    
    def get_risk_multiplier(pin_code):
        mock_scores = {
            "560034": 1.0,  # Bangalore
            "400053": 1.4,  # Mumbai
            "110001": 0.8   # Delhi
        }
        return mock_scores.get(pin_code, FALLBACK_MULTIPLIER)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        logging.error("Missing zone pin_code argument. Usage: python zoneRiskScorer.py <pin_code>")
        print(FALLBACK_MULTIPLIER)
        sys.exit(1)

    input_zone = sys.argv[1].strip()
    
    try:
        # Calculate and print ONLY the final number.
        # Node.js `child_process.execSync` will read this exact string output.
        multiplier = get_risk_multiplier(input_zone)
        print(multiplier)
    except Exception as e:
        logging.error(f"Failed to calculate risk for zone {input_zone}: {e}")
        # Always print a valid number fallback so the Node.js server doesn't crash
        print(FALLBACK_MULTIPLIER)
