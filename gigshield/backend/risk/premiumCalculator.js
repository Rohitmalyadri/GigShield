const { execSync } = require('child_process');
const path = require('path');

// Calculate the weekly premium for a worker based on the Wage Mirror Principle
// Formula: (avg(12-week earnings) * 0.75%) * zoneRiskScore * seasonalMultiplier
function calculateWeeklyPremium(earningsHistory, zone = null, fallbackRiskScore = 1.0, seasonalMultiplier = 1.0) {
  if (!earningsHistory || earningsHistory.length === 0) return 0; 

  const totalEarnings = earningsHistory.reduce((sum, val) => sum + val, 0);
  const avgEarnings = totalEarnings / earningsHistory.length;
  const basePremium = avgEarnings * 0.0075;

  // ── PHASE 2 ML INTEGRATION ─────────────────────────────────
  let dynamicRiskScore = fallbackRiskScore;
  
  // If a zone pin code is provided, call the Python ML script to get the dynamic multiplier
  if (zone) {
    try {
      // Construct the absolute path to the python script
      const scriptPath = path.join(__dirname, 'ml', 'zoneRiskScorer.py');
      
      // Execute the Python script synchronously (acceptable for hackathon MVP)
      // We use "py" for Windows as requested, but grab stdout
      const stdout = execSync(`py "${scriptPath}" ${zone}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      
      // Parse the output as a float
      const parsedScore = parseFloat(stdout.trim());
      if (!isNaN(parsedScore)) {
        dynamicRiskScore = parsedScore;
      }
    } catch (err) {
      // If python is missing or the script fails, it gracefully falls back to the database default
      console.warn(`[ML Fallback] Could not fetch risk score for zone ${zone}. Using fallback ${fallbackRiskScore}.`);
    }
  }

  // Multiply the base premium by the risk score and season multiplier
  const finalPremium = basePremium * dynamicRiskScore * seasonalMultiplier;

  // Round the final premium calculation to 2 decimal places to represent standard currency
  return Math.round(finalPremium * 100) / 100;
}

// Export the function so it can be called later by our triggers and endpoints
module.exports = {
  calculateWeeklyPremium
};

// ─────────────────────────────────────────────────────────
// QUICK TEST BLOCK (ONLY RUNS IF THIS FILE IS RUN DIRECTLY)
// ─────────────────────────────────────────────────────────

// If this file is run from the terminal directly (not imported as a module)
if (require.main === module) {
  // Define Ravi's mock array from the Master Context
  const raviEarnings = [10200, 9800, 11000, 10500, 9200, 10800, 11200, 9900, 10100, 10600, 9700, 10300];
  // Calculate Ravi's premium
  const raviPremium = calculateWeeklyPremium(raviEarnings);
  
  // Define Priya's mock array from the Master Context
  const priyaEarnings = [5800, 6200, 5500, 6100, 5900, 6300, 5700, 6000, 5600, 6400, 5800, 6100];
  // Calculate Priya's premium
  const priyaPremium = calculateWeeklyPremium(priyaEarnings);

  // Define Arjun's mock array from the Master Context
  const arjunEarnings = [1800, 2200, 1500, 2100, 1900, 2300, 1700, 2000, 1600, 2400, 1800, 2100];
  // Calculate Arjun's premium
  const arjunPremium = calculateWeeklyPremium(arjunEarnings);

  // Print out the expected vs actual results to the screen
  console.log(`[Premium Check] Ravi (Full-time): ₹${raviPremium} (Expected: ~₹78)`);
  console.log(`[Premium Check] Priya (Regular): ₹${priyaPremium} (Expected: ~₹45)`);
  console.log(`[Premium Check] Arjun (Casual): ₹${arjunPremium} (Expected: ~₹15)`);
}
