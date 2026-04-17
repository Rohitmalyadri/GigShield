// ─────────────────────────────────────────────────────────
// seed.js — Populate DB with 20 realistic workers
// Run with:  node prisma/seed.js
// ─────────────────────────────────────────────────────────
// Creates workers across Bangalore, Mumbai, Delhi with:
//   - Realistic names, 12-week earnings histories
//   - Active weekly policies
//   - 2-3 historical claims each (mix of approved/rejected)
// ─────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ── WORKER DEFINITIONS ────────────────────────────────────
const WORKERS = [
  // ── BANGALORE ──────────────────────────────────────────
  { name: 'Ravi Kumar',     phone: '9876543210', city: 'Bangalore', zone: '560034', platform: 'zomato',  base: 9800 },
  { name: 'Suresh Babu',    phone: '9123456780', city: 'Bangalore', zone: '560034', platform: 'zomato',  base: 8200 },
  { name: 'Karthik Reddy',  phone: '9234567890', city: 'Bangalore', zone: '560001', platform: 'swiggy',  base: 10500 },
  { name: 'Anand Krishnan', phone: '9345678901', city: 'Bangalore', zone: '560001', platform: 'swiggy',  base: 7600 },
  { name: 'Deepak Sharma',  phone: '9456789012', city: 'Bangalore', zone: '560008', platform: 'zomato',  base: 9100 },
  { name: 'Venkat Rao',     phone: '9567890123', city: 'Bangalore', zone: '560008', platform: 'zomato',  base: 8800 },
  { name: 'Manoj Hegde',    phone: '9678901234', city: 'Bangalore', zone: '560034', platform: 'swiggy',  base: 11200 },

  // ── MUMBAI ────────────────────────────────────────────
  { name: 'Priya Nair',     phone: '8765432109', city: 'Mumbai',    zone: '400053', platform: 'swiggy',  base: 7800 },
  { name: 'Rahul Patil',    phone: '8123456789', city: 'Mumbai',    zone: '400053', platform: 'zomato',  base: 6500 },
  { name: 'Sneha Desai',    phone: '8234567891', city: 'Mumbai',    zone: '400001', platform: 'swiggy',  base: 7200 },
  { name: 'Akash Gawde',    phone: '8345678902', city: 'Mumbai',    zone: '400001', platform: 'zomato',  base: 6800 },
  { name: 'Vishal Kadam',   phone: '8456789013', city: 'Mumbai',    zone: '400012', platform: 'swiggy',  base: 7100 },
  { name: 'Pooja Bhosale',  phone: '8567890124', city: 'Mumbai',    zone: '400012', platform: 'zomato',  base: 6300 },

  // ── DELHI ─────────────────────────────────────────────
  { name: 'Arjun Singh',    phone: '7654321098', city: 'Delhi',     zone: '110001', platform: 'zomato',  base: 4200 },
  { name: 'Amit Yadav',     phone: '7123456780', city: 'Delhi',     zone: '110001', platform: 'swiggy',  base: 3900 },
  { name: 'Rohit Gupta',    phone: '7234567891', city: 'Delhi',     zone: '110002', platform: 'zomato',  base: 4600 },
  { name: 'Sanjay Pandey',  phone: '7345678902', city: 'Delhi',     zone: '110002', platform: 'swiggy',  base: 3700 },
  { name: 'Nikhil Dubey',   phone: '7456789013', city: 'Delhi',     zone: '110020', platform: 'zomato',  base: 4100 },
  { name: 'Rakesh Verma',   phone: '7567890124', city: 'Delhi',     zone: '110020', platform: 'swiggy',  base: 3500 },
  { name: 'Pankaj Jha',     phone: '7678901235', city: 'Delhi',     zone: '110001', platform: 'zomato',  base: 4400 },
];

const ZONE_RISK = { Bangalore: 1.1, Mumbai: 1.4, Delhi: 0.8 };

function genEarnings(base) {
  return Array.from({ length: 12 }, () =>
    Math.round(base * (0.78 + Math.random() * 0.44))
  );
}

function calcPremium(earnings, riskScore) {
  const avg = earnings.reduce((s, v) => s + v, 0) / earnings.length;
  return Math.round(avg * 0.008 * riskScore * 100) / 100;
}

async function main() {
  console.log('🌱 Starting RouteSafe Insurance database seed...');
  console.log(`📊 Seeding ${WORKERS.length} workers across Bangalore, Mumbai, Delhi\n`);

  let created = 0, skipped = 0;

  for (const def of WORKERS) {
    const workerHash = crypto.createHash('sha256').update(def.phone).digest('hex');

    const existing = await prisma.worker.findUnique({ where: { workerHash } });
    if (existing) {
      console.log(`  ⏭️  Skipped (exists): ${def.name}`);
      skipped++;
      continue;
    }

    const earnings  = genEarnings(def.base);
    const riskScore = ZONE_RISK[def.city] || 1.0;
    const premium   = calcPremium(earnings, riskScore);

    const worker = await prisma.worker.create({
      data: {
        workerHash,
        name:                  def.name,
        platforms:             [def.platform],
        zone:                  def.zone,
        city:                  def.city,
        weeklyEarningsHistory: earnings,
        zoneRiskScore:         riskScore,
        seasonalMultiplier:    1.0,
        isActive:              true,
      }
    });

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const policy = await prisma.policy.create({
      data: {
        workerId:       worker.id,
        weekStartDate:  weekStart,
        weekEndDate:    weekEnd,
        premiumAmount:  premium,
        premiumPaid:    true,
        coverageActive: true,
      }
    });

    // Historical claim 1 — Approved last week
    const hourlyRate = Math.round(earnings[earnings.length - 1] / 42);
    const lastWeek   = new Date(weekStart);
    lastWeek.setDate(lastWeek.getDate() - 7);

    await prisma.claim.create({
      data: {
        workerId:            worker.id,
        policyId:            policy.id,
        disruptionType:      'heavy_rainfall',
        gate1Passed:         true,
        gate2Passed:         true,
        fraudCheckPassed:    true,
        payoutAmount:        Math.round(hourlyRate * 2 * 0.75),
        payoutStatus:        'approved',
        disruptionStartTime: lastWeek,
        hoursLost:           2,
        createdAt:           lastWeek,
      }
    });

    // Historical claim 2 — Gate1 rejected 2 weeks ago
    const twoWeeksAgo = new Date(weekStart);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    await prisma.claim.create({
      data: {
        workerId:            worker.id,
        policyId:            policy.id,
        disruptionType:      'heavy_rainfall',
        gate1Passed:         false,
        gate2Passed:         false,
        fraudCheckPassed:    false,
        payoutAmount:        0,
        payoutStatus:        'gate1_rejected',
        disruptionStartTime: twoWeeksAgo,
        hoursLost:           0,
        createdAt:           twoWeeksAgo,
      }
    });

    created++;
    console.log(`  ✅  ${def.name} (${def.city} / ${def.zone}) — ₹${premium}/week`);
  }

  console.log(`\n🎉 Seed complete! Created: ${created}  Skipped: ${skipped}`);
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
