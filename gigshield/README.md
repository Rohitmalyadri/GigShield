# 🛡️ GigShield — AI-Powered Parametric Wage Stabilization for Food Delivery Partners

> **Guidewire DEVTrails 2026 | Phase 1 Submission**
> Persona: Food Delivery Partners (Zomato / Swiggy)
> Platform: Mobile-first, API-first B2B2C Architecture

---

## 1. The Problem

India's food delivery partners — the riders powering Zomato and Swiggy — operate without any financial safety net. A single rainstorm, a local curfew, or a sudden flood can wipe out an entire dinner rush, costing a full-time rider ₹800–₹1,500 in a single evening with zero recourse.

They lose **20–30% of monthly income** to uncontrollable external disruptions. Traditional insurance doesn't serve them — it's too slow, too complex, and priced for salaried individuals. No product exists today that automatically detects a disruption, validates the rider was affected, and credits their wallet — without the rider lifting a finger.

**GigShield** solves this. Not as an insurance app, but as **wage stabilization infrastructure** embedded directly inside the platforms riders already use.

---

## 2. Persona: The Food Delivery Partner

**Name:** Ravi, 26, Bangalore
**Platform:** Zomato (primary) + Swiggy (secondary) — multi-apping
**Earnings:** ₹8,000–₹12,000/week during peak seasons
**Peak Hours:** Lunch (12–2pm) and Dinner (7–10pm)
**Pain Point:** One flooded underpass between him and a restaurant cluster can cost him 3 hours of dinner-rush income. He has no way to recover that loss.

**Critical Persona Insight:** Ravi does not have a fixed schedule. He logs on when he wants to earn. He cannot be "scheduled" — he can only be confirmed as **actively online and attempting to earn** at the time of disruption. This distinction shapes every design decision in GigShield.

### Persona-Based Scenarios

| Scenario | Disruption | Ravi's Reality | GigShield Response |
|---|---|---|---|
| Bangalore monsoon flash flood | Rainfall >35mm/hr, IMD red alert | Roads blocked, zero orders possible | Auto-payout for lost dinner rush |
| Delhi AQI crisis + platform suspension | AQI >400 + Zomato suspends zone | Zomato officially halts deliveries | Dual-confirmed trigger, instant credit |
| Local curfew (Section 144) | Geospatial mass offline event | All riders in zone go offline | Anomaly detection → admin review → approved |
| Cyclone warning, coastal Chennai | IMD cyclone alert for district | Platform reduces active slots | District-level parametric trigger fires |

---

## 3. Why B2B2C and Not a D2C App

Building a direct-to-consumer insurance app for gig workers is a customer acquisition nightmare requiring massive marketing spend to reach a fragmented, low-trust audience.

**GigShield is not an app Ravi downloads. It is infrastructure Zomato and Swiggy embed.**

The three-party model:

```
 GIG PLATFORM (Zomato/Swiggy)        GIGSHIELD ENGINE           IRDAI UNDERWRITER
 ├── Distribution channel         ├── AI Risk Assessment      ├── Holds balance sheet risk
 ├── Worker identity + earnings   ├── Parametric Trigger      ├── Regulatory compliance
 └── Payout wallet                └── Fraud Validation        └── Claims ledger
```

- **The platform** gets a worker retention and welfare feature at zero cost to acquire users
- **The underwriter** gets a pre-validated, data-rich risk pool they couldn't price on their own
- **GigShield** owns the proprietary AI engine — the moat neither party can easily replicate

**Worker onboarding is a single checkbox inside the Zomato/Swiggy partner app:**
> *"Deduct ₹X/week from my payouts for Disruption Protection — ON/OFF"*

No separate app. No KYC friction. No bank details. Zero onboarding drop-off.

---

## 4. Coverage Scope (Critical Constraints)

GigShield covers **INCOME LOSS ONLY** caused by verifiable external disruptions.

✅ **Covered:** Lost earning hours due to weather, flooding, pollution-based platform suspension, civic disruptions (curfew, strikes), geospatial anomalies  
❌ **Excluded:** Vehicle repairs, health expenses, accident medical bills, life insurance, any event not causing measurable income loss

---

## 5. Parametric Triggers — The Dual Gate Logic

Every claim must pass **both gates** before payout fires. No exceptions.

### Gate 1 — Environmental / External Trigger
Confirms a qualifying disruption is actively occurring in the rider's zone.

| Trigger | Threshold | Data Source |
|---|---|---|
| Heavy Rainfall + Flooding | >35mm/hr AND IMD orange/red alert for pin code | OpenWeatherMap API + IMD feed |
| Platform Zone Suspension | Zomato/Swiggy officially suspends deliveries in zone | Simulated Platform API |
| Cyclone / Storm Warning | IMD district-level cyclone alert issued | IMD API |
| AQI Crisis + Suspension | AQI >400 AND platform confirms zone halt | CPCB AQI API + Platform API |
| Geospatial Mass Anomaly | >80% riders in 5km radius go offline within 45 mins | Internal anomaly detection engine |

> **Note on AQI:** A raw AQI threshold is NOT sufficient as a standalone trigger — urban India routinely exceeds AQI 300. Gate 1 requires AQI + confirmed platform suspension together, making it a tight, verifiable trigger rather than an always-on payout condition.

### Gate 2 — Activity & Income Proxy Validation
Confirms this specific rider was actively attempting to earn during the disruption window.

- ✅ Rider's app was in **active/online status** for ≥45 minutes during the disruption window
- ✅ Rider's **GPS ping** places them within or traveling toward the affected zone
- ✅ Rider's **delivery completion rate** dropped sharply vs. their personal historical baseline for that time slot

**If both gates pass → payout instruction fires automatically.**
**If Gate 1 passes but Gate 2 fails → no payout (rider was not actively working).**
**If neither gate passes → no action.**

---

## 6. Fraud Detection Architecture

### 6a. Canonical Identity Token — Solving the Multi-App Problem

Food delivery workers routinely multi-app across Zomato and Swiggy simultaneously. Without a unified identity layer, the same rider could receive duplicate payouts from both platform integrations for the same disruption event.

**Solution:** Every platform passes a SHA-256 hashed phone number as the canonical worker token.

```json
// Swiggy sends:
{"worker_hash": "A1B2C3...", "platform": "swiggy", "status": "offline", "zone": "koramangala_5"}

// Zomato sends:
{"worker_hash": "A1B2C3...", "platform": "zomato", "status": "offline", "zone": "koramangala_5"}
```

The Fraud Validation Layer detects the matching hash, merges the signals to confirm the worker is genuinely grounded across all platforms, and ensures **only one payout is calculated per disruption event**. This directly satisfies the "Duplicate Claim Prevention" requirement.

### 6b. Anomaly Detection Checks

| Fraud Vector | Detection Method |
|---|---|
| GPS Spoofing | Cross-reference GPS coordinates against network cell tower triangulation |
| Fake weather claims | Gate 1 requires API-confirmed disruption — no self-reporting |
| Earnings inflation fraud | Payout calculated on 12-week trailing average — single inflated weeks have minimal impact |
| Coordinated fake anomaly | New anomaly archetypes require 3 independent geographic confirmations before auto-triggering |

---

## 7. The AI Feedback Loop — Catching Zero-Day Disruptions

GigShield is not a static rules engine. It is a continuously evolving predictive model.

**How it detects novel disruptions it has never seen before:**

The AI constantly monitors the baseline "active-and-earning" rate across micro-zones. When a sudden collective behavioral collapse occurs with no matching weather signal:

```
ANOMALY DETECTED:
→ 85% of riders in Koramangala 5km radius → zero completions in 40 mins
→ Gate 1 check: Weather API confirms clear skies. Gate 1 FAILS.
→ Action: Flag as "Unclassified Macro Anomaly"
→ Hold payouts. Alert Admin Dashboard.
→ Admin investigates: localized internet shutdown confirmed.
→ Admin manually approves payout.
→ System ingests data signature as new archetype candidate.
→ After 3 independent geographic confirmations → archetype auto-promoted.
→ Future occurrences of this signature → auto-trigger with confidence scoring.
```

This human-in-the-loop approval before archetype promotion prevents fraud exploitation of newly learned patterns while still allowing the system to grow smarter with every real-world event.

---

## 8. Weekly Premium Model — The Wage Mirror

GigShield's premium model mirrors the worker's own earnings profile. This is called the **Wage Mirror Principle** — high earner, higher premium, higher payout protection; casual earner, lower premium, lower payout. The product scales with the person, not against them.

### Premium Formula

```
Weekly Premium = (12-Week Trailing Average Earnings × Base Rate %)
                 × Zone Risk Multiplier
                 × Seasonal Risk Multiplier
```

| Worker Type | Avg Weekly Earnings | Base Rate | Zone Multiplier | Season Multiplier | Weekly Premium |
|---|---|---|---|---|---|
| Full-time hustler | ₹10,000 | 0.75% | 1.1 (flood zone) | 1.3 (monsoon) | ~₹107 |
| Regular rider | ₹6,000 | 0.75% | 1.0 (normal) | 1.0 (dry season) | ~₹45 |
| Casual/part-time | ₹2,000 | 0.75% | 0.9 (safe zone) | 1.0 | ~₹14 |

### Payout Calculation

```
Disruption Payout = (12-Week Trailing Avg Hourly Earnings × Disruption Hours Lost) × 0.75
```

The 0.75 cap (75% income replacement) maintains healthy loss ratios and prevents moral hazard — no worker should earn more from a disruption than from working.

### Coverage Continuity Rule

If a rider's weekly earnings are insufficient to cover the premium deduction (e.g., after consecutive disruption weeks), the platform fronts the premium and recovers it across the next two earning weeks. Workers stay covered during their worst weeks — exactly when they need it most.

---

## 9. The Five-Layer Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: DATA INGESTION                                │
│  Webhooks from Zomato/Swiggy (activity, earnings, GPS)  │
│  IMD Weather API | OpenWeatherMap | CPCB AQI API        │
│  Simulated Traffic / Civic Alert feeds                  │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: AI RISK ENGINE                                │
│  12-week trailing earnings baseline per worker          │
│  Zone risk scoring (flood history, drainage maps)       │
│  Seasonal multiplier updates (IMD forecast integration) │
│  Weekly premium recalculation engine                    │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: PARAMETRIC TRIGGER ENGINE                     │
│  Gate 1: Environmental / External disruption check      │
│  Gate 2: Rider activity & GPS validation                │
│  Geospatial anomaly detection for zero-day events       │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: FRAUD VALIDATION LAYER                        │
│  SHA-256 canonical ID deduplication (multi-app)         │
│  GPS spoofing detection (cell tower cross-reference)    │
│  Anomaly archetype confidence scoring                   │
│  Earnings inflation detection (trailing average)        │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: PAYOUT INSTRUCTION LAYER                      │
│  Webhook to platform wallet (mock Razorpay / UPI sim)   │
│  Underwriter ledger update (claims log)                 │
│  Admin dashboard alert + audit trail                    │
│  Worker push notification via platform app              │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Tech Stack

| Layer | Technology |
|---|---|
| Mobile Interface | React Native (embedded within partner app — simulated) |
| Backend / API Layer | Node.js + Express microservices |
| AI / ML Engine | Python (scikit-learn for risk scoring, anomaly detection) |
| Database | PostgreSQL (worker profiles, claims ledger) + Redis (real-time zone state) |
| Weather / Environment APIs | OpenWeatherMap API (free tier), IMD public feed, CPCB AQI API |
| Platform API | Simulated JSON webhook endpoints (mock Zomato/Swiggy manifest) |
| Payment | Razorpay test mode / UPI simulator |
| Identity Hashing | SHA-256 phone number tokenization |
| Admin Dashboard | React.js web dashboard |
| Hosting | AWS EC2 / Railway (dev environment) |

---

## 11. Development Plan

### Phase 1 (March 4–20) — Ideation & Foundation ✅
- Architecture design and documentation
- Mock API schema definition (platform webhook payload structure)
- Basic risk scoring model (Python notebook)
- Minimal prototype wireframes

### Phase 2 (March 21–April 4) — Automation & Protection
- Worker registration flow (simulated platform handshake)
- Dynamic weekly premium calculation engine (live)
- 3–5 automated parametric triggers wired to mock APIs
- Claims management module
- Zero-touch claim process demo

### Phase 3 (April 5–17) — Scale & Optimise
- Advanced fraud detection (GPS spoofing, canonical ID deduplication)
- Geospatial anomaly detection + human-in-the-loop admin flow
- AI feedback loop and archetype promotion logic
- Dual dashboard (Worker view + Insurer/Admin view)
- Simulated instant payout via Razorpay test mode
- Final pitch deck + 5-minute demo video

---

## 12. Business Viability Summary

GigShield operates as a **B2B2C embedded insurtech** — the AI parametric engine sitting between gig platforms and IRDAI-licensed underwriters.

**Why this works at scale:**
- Distribution is free — Zomato/Swiggy already have 5M+ active delivery partners
- Regulatory surface is minimal — GigShield is a technology provider, not an insurer
- The AI moat is cross-platform — risk models trained on multi-platform data cannot be replicated by any single platform
- Unit economics are viable — at ₹45/week average premium across 1M riders, that is ₹45Cr/week in premium flow with ~80% loss ratios in non-monsoon seasons

**The pitch in one line:**
> GigShield is not selling insurance to gig workers. It is selling certainty to the platforms that depend on them.

---

*Submitted for Guidewire DEVTrails 2026 | Phase 1 | March 2026*

## Setup Fir Phase 1

1. Copy `.env.example` to `.env` and fill the variables.
2. Install dependencies for the backend and dashboard:
   ```sh
   cd backend
   npm install

   cd ../dashboard
   npm install
   ```
3. Run Prisma migrations:
   ```sh
   npx prisma migrate dev --name init
   ```
4. Start both servers using `npm run dev`.
