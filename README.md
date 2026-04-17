# 🛡️ RouteSafe Insurance — AI-Powered Parametric Wage Stabilization for Food Delivery Partners

> **Guidewire DEVTrails 2026 | Phase 4 — Autonomous LLM Demo**
> Persona: Food Delivery Partners (Zomato / Swiggy)
> Platform: Mobile-first, API-first B2B2C Architecture

---

## 1. The Problem

India's food delivery partners — the riders powering Zomato and Swiggy — operate without any financial safety net. A single rainstorm, a local curfew, or a sudden flood can wipe out an entire dinner rush, costing a full-time rider ₹800–₹1,500 in a single evening with zero recourse.

They lose **20–30% of monthly income** to uncontrollable external disruptions. Traditional insurance doesn't serve them — it's too slow, too complex, and priced for salaried individuals. No product exists today that automatically detects a disruption, validates the rider was affected, and credits their wallet — without the rider lifting a finger.

**RouteSafe Insurance** solves this. Not as an insurance app, but as **wage stabilization infrastructure** embedded directly inside the platforms riders already use.

---

## 2. Persona: The Food Delivery Partner

**Name:** Ravi, 26, Bangalore
**Platform:** Zomato (primary) + Swiggy (secondary) — multi-apping
**Earnings:** ₹8,000–₹12,000/week during peak seasons
**Peak Hours:** Lunch (12–2pm) and Dinner (7–10pm)
**Pain Point:** One flooded underpass between him and a restaurant cluster can cost him 3 hours of dinner-rush income. He has no way to recover that loss.

**Critical Persona Insight:** Ravi does not have a fixed schedule. He logs on when he wants to earn. He cannot be "scheduled" — he can only be confirmed as **actively online and attempting to earn** at the time of disruption. This distinction shapes every design decision in RouteSafe Insurance.

### Persona-Based Scenarios

| Scenario | Disruption | Ravi's Reality | RouteSafe Insurance Response |
|---|---|---|---|
| Bangalore monsoon flash flood | Rainfall >35mm/hr, IMD red alert | Roads blocked, zero orders possible | Auto-payout for lost dinner rush |
| Delhi AQI crisis + platform suspension | AQI >400 + Zomato suspends zone | Zomato officially halts deliveries | Dual-confirmed trigger, instant credit |
| Local curfew (Section 144) | Geospatial mass offline event | All riders in zone go offline | Anomaly detection → admin review → approved |
| Cyclone warning, coastal Chennai | IMD cyclone alert for district | Platform reduces active slots | District-level parametric trigger fires |

---

## 3. Why B2B2C and Not a D2C App

Building a direct-to-consumer insurance app for gig workers is a customer acquisition nightmare requiring massive marketing spend to reach a fragmented, low-trust audience.

**RouteSafe Insurance is not an app Ravi downloads. It is infrastructure Zomato and Swiggy embed.**

The three-party model:

```
 GIG PLATFORM (Zomato/Swiggy)        RouteSafe Insurance ENGINE           IRDAI UNDERWRITER
 ├── Distribution channel         ├── AI Risk Assessment      ├── Holds balance sheet risk
 ├── Worker identity + earnings   ├── Parametric Trigger      ├── Regulatory compliance
 └── Payout wallet                └── Fraud Validation        └── Claims ledger
```

- **The platform** gets a worker retention and welfare feature at zero cost to acquire users
- **The underwriter** gets a pre-validated, data-rich risk pool they couldn't price on their own
- **RouteSafe Insurance** owns the proprietary AI engine — the moat neither party can easily replicate

**Worker onboarding is a single checkbox inside the Zomato/Swiggy partner app:**
> *"Deduct ₹X/week from my payouts for Disruption Protection — ON/OFF"*

No separate app. No KYC friction. No bank details. Zero onboarding drop-off.

---

## 4. Coverage Scope (Critical Constraints)

RouteSafe Insurance covers **INCOME LOSS ONLY** caused by verifiable external disruptions.

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

The Fraud Validation Layer detects the matching hash, merges the signals to confirm the worker is genuinely grounded across all platforms, and ensures **only one payout is calculated per disruption event**.

### 6b. Anomaly Detection Checks

| Fraud Vector | Detection Method |
|---|---|
| GPS Spoofing | Zone-change under 10 minutes detected and flagged |
| Fake weather claims | Gate 1 requires API-confirmed disruption — no self-reporting |
| Earnings inflation fraud | Payout calculated on 12-week trailing average |
| Duplicate claims | 3-hour deduplication window blocks re-submissions |

---

## 7. The AI Feedback Loop — Catching Zero-Day Disruptions

RouteSafe Insurance is not a static rules engine. It is a continuously evolving predictive model.

**How it detects novel disruptions it has never seen before:**

The Zero-Day Anomaly Poller runs every 60 seconds using DBSCAN clustering to detect mass rider dropoffs that don't match any known weather trigger.

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

---

## 8. Weekly Premium Model — The Wage Mirror

```
Weekly Premium = avg(12-week earnings) × 0.0075 × zoneRiskScore × seasonalMultiplier
Disruption Payout = (avg hourly earnings × hoursLost) × 0.75
```

| Worker | Avg Weekly Earnings | Zone | Weekly Premium |
|---|---|---|---|
| Ravi (Bangalore) | ₹10,358 | 560034 | ₹78/wk |
| Priya (Mumbai) | ₹6,100 | 400053 | ₹45/wk |
| Arjun (Delhi) | ₹2,000 | 110001 | ₹15/wk |

The 0.75 cap (75% income replacement) maintains healthy loss ratios and prevents moral hazard.

---

## 9. The Five-Layer Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: DATA INGESTION ✅                              │
│  Webhooks from mock Zomato/Swiggy (port 3001)           │
│  worker_hash, GPS, zone, status, completions            │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: ML PREMIUM CALCULATOR ✅                       │
│  12-week trailing earnings baseline per worker          │
│  Python scikit-learn zone risk scorer                   │
│  Seasonal multiplier engine                             │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: DUAL GATE + ZERO-DAY ANOMALY ✅                │
│  Gate 1: Rainfall ≥ 35mm/hr in rider's zone             │
│  Gate 2: Rider online ≥ 45 min, completions dropped     │
│  DBSCAN anomaly poller — runs every 60 seconds          │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: FRAUD VALIDATION ✅                            │
│  SHA-256 canonical ID deduplication (3hr window)        │
│  GPS spoofing detection (zone-change < 10 min)          │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: PAYOUT ENGINE ✅                               │
│  Razorpay simulation (UTR transaction ID generated)     │
│  Underwriter ledger update                              │
│  WebSocket broadcast → dashboard                        │
└─────────────────────────────────────────────────────────┘

AUTONOMOUS AI BRAIN (Phase 4) ✅
  Primary LLM:  Gemini 2.0 Flash Lite (Google AI Studio)
  Fallback LLM: Ollama qwen-balanced:latest (local)
  scenarioEngine.js  → auto-generates disruptions every 2-3 min
  narratorEngine.js  → plain English narration for all 8 events
  WebSocket (Socket.io) → live broadcasts to dashboard
  QR Check-in → worker scans QR → pipeline fires automatically
```

---

## 10. Tech Stack

| Layer | Technology |
|---|---|
| Backend / API | Node.js + Express (port 4000) |
| Database | PostgreSQL 17 + Prisma ORM |
| Cache | Redis / Memurai |
| ML / AI (Risk) | Python 3 + scikit-learn (zone risk scoring, DBSCAN anomaly detection) |
| LLM Brain (Primary) | Gemini 2.0 Flash Lite (Google AI Studio free tier) |
| LLM Brain (Fallback) | Ollama — qwen-balanced:latest (local, port 11434) |
| Real-time | Socket.io WebSockets |
| QR Code | node-qrcode package |
| Frontend Dashboard | React + Vite (port 5173) + Recharts |
| Payment Simulation | Razorpay Test Mode (simulated UTR) |
| Identity Hashing | SHA-256 phone number tokenization |
| Mock Platform | Custom Node.js server (port 3001) |

---

## 11. Seeded Test Workers

| Name | City | Zone | Phone (for hash) | Platforms | Premium |
|---|---|---|---|---|---|
| Ravi Kumar | Bangalore | 560034 | 9876543210 | Zomato + Swiggy | ₹78/wk |
| Priya Sharma | Mumbai | 400053 | 9123456780 | Swiggy | ₹45/wk |
| Arjun Mehta | Delhi | 110001 | 9988776655 | Zomato | ₹15/wk |

**Generate worker hash:**
```cmd
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('9876543210').digest('hex'));"
```

---

## 12. Running the Project Locally

### Prerequisites
- Node.js v23+
- Python 3.14+ (`py` command)
- PostgreSQL 17
- Memurai (Redis for Windows)
- Ollama with `qwen-balanced:latest` model

### Step 1 — Install dependencies
```cmd
cd backend
npm install

cd ..\dashboard
npm install
```

### Step 2 — Configure environment
```cmd
cd backend
copy .env.example .env
```
Edit `.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `GEMINI_API_KEY` — from https://aistudio.google.com/app/apikey
- `LOCAL_WIFI_IP` — your WiFi IP from `ipconfig` (for QR code)

### Step 3 — Set up the database
```cmd
cd backend
npx prisma migrate dev --name init
node prisma\seed.js
```

### Step 4 — Install Python dependencies
```cmd
py -m pip install scikit-learn numpy
```

### Step 5 — Run the full stack (3 terminals)

**Terminal 1 — Backend:**
```cmd
cd backend
npx nodemon server.js
```

**Terminal 2 — Mock Platform Data:**
```cmd
cd backend
node mock\platformWebhook.js
```

**Terminal 3 — Dashboard:**
```cmd
cd dashboard
npm run dev
```

### Step 6 — Open the dashboard
```
http://localhost:5173
```

### Step 7 — Get Ravi's QR code
Open in browser:
```
http://localhost:4000/api/qr/7619ee8cea49187f309616e30ecf54be072259b43760f1f550a644945d5572f2
```

---

## 13. API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/workers` | List all workers with premiums |
| GET | `/api/claims` | List all claims |
| POST | `/api/simulate-disruption` | Trigger full 5-layer pipeline |
| GET | `/api/qr/:workerHash` | Get QR code PNG image |
| GET | `/api/qr-url/:workerHash` | Get QR check-in URL as JSON |
| GET | `/api/checkin/:workerHash` | QR scan → mark worker online + schedule disruption |
| POST | `/api/webhooks/platform` | Receive platform webhook |

---

## 14. Development Timeline

### Phase 1 (March 4–20) — Ideation & Foundation ✅
- Architecture design and documentation
- Mock API schema definition
- Basic risk scoring model
- Minimal prototype wireframes

### Phase 2 (March 21–April 4) — Automation & Protection ✅ [SUBMISSION READY]
**Theme:** "Protect Your Worker"
**Deliverables Completed:**
✅ **Registration Process**: `RegisterPage.jsx` provides a Swiggy/Zomato branded embedded opt-in screen, using SHA-256 identity hashing.
✅ **Insurance Policy Management**: `PoliciesPage.jsx` displays coverage periods, active/expired status, paid premiums, and loss ratios.
✅ **Dynamic Premium Calculation**: ML-powered (Python scikit-learn) zone risk scorer and `premiumCalculator.js` adjusts weekly premiums based on 12-week trailing earnings and localized risk.
✅ **Claims Management**: Fully automated 5-state claim ledger tracking (Gate 1, Gate 2, Fraud deduplication, Payout execution).
✅ **Automated Triggers**: 5 live APIs/triggers built (Rainfall >35mm/hr, Worker Activity >45min, Completion rate drops, GPS Spoofing, DBSCAN Mass Anomaly).
✅ **Zero-Touch Claim Process**: QR scan triggers a simulated weather disruption → Gates validate → Payout triggers via Razorpay → UI updates and AI narrates. All within 30 seconds.

### Phase 3 (March 27 – March 31) — Autonomous LLM Demo ✅
- Gemini 2.0 Flash Lite as primary AI brain
- Ollama (qwen-balanced) as local fallback
- `scenarioEngine.js` — auto-generates disruptions
- `narratorEngine.js` — narrates all 8 event types
- Socket.io WebSocket live feed
- QR code check-in (mobile confirmation page)
- Auto-pipeline: QR scan → 2.5 min timer → disruption fires autonomously

### Phase 4 (April 1–2) — Mobile Interface & Demo Stability ✅ [COMPLETED]
- Built complete Zomato-style Mobile App interface (`/app/*` routes)
- Interactive Mobile Flow: Register → Dashboard → Start Shift → Live Monitor
- Added dynamic worker identification (`name` added to Prisma schema)
- Added Vite WebSocket Proxy (`ws: true`) for seamless cross-device mobile connections
- Rewrote Webhook scripts to dynamically poll PostgreSQL for new registrations
- Bypassed synchronous Python executions during high-load API mapping for instant response times
- Seeded 20+ realistic workers with coverage histories into PostgreSQL
- Final pitch deck + demo video recording prep

---

## 15. Business Viability

RouteSafe Insurance operates as a **B2B2C embedded insurtech** — the AI parametric engine sitting between gig platforms and IRDAI-licensed underwriters.

**Unit economics at scale:**
- Distribution is free — Zomato/Swiggy already have 5M+ active delivery partners
- At ₹45/week average premium across 1M riders → ₹45Cr/week in premium flow
- ~80% loss ratios in non-monsoon seasons → viable underwriting margin


**The pitch in one line:**
> RouteSafe Insurance is not selling insurance to gig workers. It is selling certainty to the platforms that depend on them.

---

## 16. 🚀 New Updates: Smart Risk Protection System

> This section explains the latest upgrades to RouteSafe Insurance in plain language — no technical background needed.

---

### What Problem Do These Updates Solve?

Imagine you are a delivery rider in Bangalore. It suddenly starts raining heavily — so heavily that no one will place an order. You are stuck at home. No work, no income.

The old system could detect the rain and pay you. But it had no way of knowing *how bad* the situation was, *how many* other riders were stuck, or *whether the company could afford* to pay everyone at the same time.

The new Smart Risk Protection System solves exactly that. Think of it as a **brain** that looks at the full picture before making any decision.

---

### 🌡️ Feature 1 — Dynamic Risk Scoring

**What it does in simple terms:**

Before the system does anything, it first *measures how dangerous a situation is* — like a doctor checking vital signs before prescribing medicine.

It looks at four things at once:

| What It Checks | Real-World Meaning |
|---|---|
| 🌧️ **Weather Conditions** | Is it raining? How heavily? Is there a flood alert? |
| 👷 **Active Workers** | Are too few riders available for the area? |
| 📦 **Order Demand** | Is there a sudden spike in orders nobody can fulfil? |
| ⚖️ **Government Restrictions** | Is there a curfew, lockdown, or flood warning? |

It then combines all four readings into a single number called the **Risk Score** — ranging from **0 (calm) to 100 (crisis)**.

> **Analogy:** Think of it like a weather station reading temperature, humidity, wind speed, and pressure — and giving you one simple "Storm Level" reading instead of four separate numbers.

---

### 🧠 Feature 2 — Smart Decision Engine

**What it does in simple terms:**

Once the Risk Score is ready, the system automatically decides what action to take — like a traffic signal that changes colour based on how busy the road is.

| Risk Score | System Mode | What Happens |
|---|---|---|
| 🟢 **0 – 30** | **Normal** | Business as usual. No special action needed. |
| 🟡 **31 – 60** | **Incentive Mode** | Riders get a bonus (₹15 extra) for every order they complete. |
| 🟠 **61 – 80** | **Protection Mode** | Every rider who stays online is guaranteed a minimum income of ₹200 for the shift. |
| 🔴 **81 – 100** | **Critical Mode** | Deliveries are paused. Riders who were online get ₹75/hour just for being ready to work. |

> **Analogy:** It is like an airline that offers free upgrades when the plane is half empty (incentive), guarantees seats when there is a storm (protection), and cancels flights only in extreme conditions (critical) — always with a reason and compensation.

No human needs to manually make these decisions. The system handles it automatically, within seconds.

---

### 💰 Feature 3 — Intelligent Compensation (Paying the Right Workers, the Right Amount)

**What it does in simple terms:**

The old system could accidentally pay everyone — including riders who were asleep at home during the disruption. The new system is smarter. It checks *who actually deserves support* before sending a single rupee.

**To qualify for support, a rider must:**
- ✅ Have been active (online) for at least **2 hours** during the disruption
- ✅ Have made at least **1 delivery attempt** (for bonus payments)
- ✅ Be in a zone where the Risk Score confirms a genuine disruption

**Three types of support are available:**

| Support Type | When It Applies | What the Rider Gets |
|---|---|---|
| 🏅 **Order Bonus** | Medium-risk zones, rider is delivering | Extra ₹15 per successful delivery |
| 🛡️ **Earnings Guarantee** | High-risk zones, orders are very low | Top-up to ensure minimum ₹200 earned in the shift |
| ⏱️ **Downtime Pay** | Critical zones with delivery pause | ₹75 per hour for every hour the rider was online and ready |

> **Analogy:** Think of it like a restaurant that pays its kitchen staff their full shift wages when they are forced to close due to a flood — but only for staff who actually showed up and were ready to work, not those who called in sick that day.

---

### 📊 Feature 4 — Financial Sustainability (The Risk Pool)

**What it does in simple terms:**

Every week, riders pay a small subscription fee (called a **premium** — similar to a Netflix subscription, but for income protection). All those payments go into a shared fund called the **Risk Pool**.

When disruptions happen and riders need support, money comes out of this pool.

The system constantly watches the health of this pool using a measure called the **Loss Ratio**:

```
Loss Ratio = Total Money Paid Out ÷ Total Premiums Collected
```

| Loss Ratio | Pool Health | What the System Does |
|---|---|---|
| 🟢 Below 60% | Healthy | Full payouts — system operating normally |
| 🟡 60% – 80% | Monitor | Payouts continue, but the system flags a warning |
| 🔴 Above 80% | At Risk | Payouts are automatically scaled back to protect the pool |
| 🆘 Above 95% | Critical | Only small bonuses are paid — pool is being protected from collapse |

> **Analogy:** Think of it like a community water tank. Everyone contributes water every week. If there is a drought (disruption), people draw water from the tank. But if the tank is almost empty, the system reduces how much each person can draw — so the tank does not run dry completely and everyone still gets *something*.

The system handles this adjustment **automatically** — no human intervention required.

---

### 📈 Feature 5 — Admin Analytics Dashboard

**What it does in simple terms:**

All of the above happens behind the scenes. But the people managing the platform — operations managers, business owners, and investors — need to see what is happening at a glance.

The new **Admin Dashboard** gives a real-time view of:

- 👷 **How many riders are active** across all zones right now
- 🗺️ **Which zones are high-risk** and need immediate attention
- 💸 **Total payouts this period** and how they break down by type (bonus, guarantee, downtime)
- 📊 **Loss Ratio** — a single health indicator for the entire business
- 🏦 **Risk Pool Balance** — how much premium has been collected vs. paid out
- 🧾 **Recent Payment History** — every transaction, filterable by zone, type, and status

> **Analogy:** Think of it like a hospital dashboard that shows the number of patients admitted, the number of beds available, and the cost of treatment — all in one screen — so the administrator can make smart decisions fast.

---

### 🔄 How All 5 Features Work Together — The Complete Flow

Here is what happens the next time there is a heavy rainstorm in Bangalore:

```
🌧️  Rain starts at 7pm in Koramangala

  STEP 1 → Risk Engine reads weather, worker count, orders, and alerts
            → Calculates Risk Score: 72 (High Risk)

  STEP 2 → Decision Engine activates: PROTECTION MODE
            → All eligible riders get ₹200 minimum guarantee + ₹50/hr downtime

  STEP 3 → Compensation Engine checks each rider:
            → Rider A: Online 3 hrs, 2 deliveries → ₹200 guaranteed + ₹20 bonus ✅
            → Rider B: Offline all evening → ❌ Not eligible
            → Rider C: Online 30 min only → ❌ Below minimum threshold

  STEP 4 → Risk Pool is charged: ₹220 for Rider A
            → Loss Ratio recalculated: 54% → Pool is HEALTHY ✅

  STEP 5 → Admin Dashboard updates in real time
            → Manager sees: Zone 560034 → Risk 72 → PROTECTION MODE → 1 payout
```

All of this happens **automatically, within seconds, without any human involvement** — unless the system hits a critical threshold that requires a human review.

---

### 📋 Summary of New Capabilities

| Feature | Before | After |
|---|---|---|
| Risk Assessment | Binary (rain: yes/no) | Dynamic score 0–100 across 4 factors |
| Decision Making | Manual or fixed rules | Automatic 4-mode engine |
| Compensation | Flat payout on claim approval | Smart eligibility + 3 payout types |
| Financial Safety | No safeguard | Auto-scaling based on Loss Ratio |
| Admin Visibility | Basic claim list | Full real-time KPI dashboard |

> These updates represent a fundamental shift from a simple claim-and-pay system to a **living, self-regulating income protection engine** that balances worker welfare with business sustainability.

---


---

## Phase 3 — What We Actually Built (Scale & Optimise)

This section documents the full technical implementation shipped during Phase 3 of DEVTrails 2026.

---

### 🚀 Feature 6 — Instant Batch Claim Payout (Razorpay)

**The problem:** Admin had to pay each approved worker one by one — impossible at scale with 50+ claims.

**What we built:** A single button that pays **all approved claims simultaneously** via Razorpay.

**How it works:**
1. Admin opens Payment page → sees live count of approved unpaid claims + total amount
2. Clicks "Pay All Workers Now" → one Razorpay checkout modal opens for the full amount
3. Admin completes payment → backend verifies HMAC SHA-256 signature
4. All 50 claims are marked `paid` with real Razorpay `pay_XXXXXXXXX` transaction IDs
5. Live streaming log shows each worker's payout in real time

**Key technical detail:** Each claim gets a unique `orderId` in the Payment table (`order_XXXX_<claimShortId>`) even though they share one Razorpay transaction — this avoids unique constraint violations in PostgreSQL.

---

### 🤖 Feature 7 — Gemini Flash AI for Dispute Resolution

**Primary LLM:** `gemini-flash-latest` via `X-goog-api-key` header (v1beta endpoint)
**Fallback:** Ollama local model (`qwen-balanced:latest`) — only fires if Gemini is unavailable

**Architecture:**
```
Dispute received
    → askGemini(prompt) with 8s timeout
    → On 429: wait 3s, retry once
    → On failure: askOllama(prompt) with 15s timeout
    → Ollama only uses CPU when Gemini is down — saves compute at demo time
```

The dispute engine generates a structured JSON verdict: `{ decision, confidence, reasoning, recommendation }` for every disputed claim.

---

### 📈 Feature 8 — Predictive Analytics

The analytics dashboard now forecasts **next week's expected claims per city** using:

```
Predicted Claims = 4-week Rolling Average × Seasonal Monsoon Multiplier
```

| City | Monsoon Multiplier | Risk Signal |
|---|---|---|
| Mumbai (Jun–Sep) | ×2.8 | HIGH |
| Bangalore (Apr–May) | ×1.5 | MEDIUM |
| Delhi (Jul–Aug) | ×1.3 | MEDIUM |

This lets insurers pre-allocate capital reserves before claims arrive — a genuine actuarial capability.

---

### 📱 Feature 9 — Premium Mobile UX (Zomato Partner Clone)

The worker-facing mobile app was fully redesigned to match a production FinTech standard:

| Screen | Upgrade |
|---|---|
| **Home** | Gradient hero banner, animated earnings counters, coverage promo card with estimated premium |
| **Bottom Nav** | SVG icons replacing emoji, active state pill indicator, glassmorphism background |
| **Register** | Multi-platform selection (Zomato + Swiggy simultaneously), 2-step preview flow |
| **Dashboard** | Dark gradient hero header, glowing avatar, pulse animation on Start Shift |
| **Top Bar** | Pulsing LIVE badge, shield SVG icon |

---

### 🔒 Feature 10 — 3-Layer Fraud Detection

**Layer 1 — GPS Spoofing Detection:**
Worker GPS coordinates are validated using physics — if location jumps more than possible speed allows between two timestamps, claim is rejected.

**Layer 2 — Identity Deduplication:**
SHA-256 canonical hash of `name + phone + city + zone` — if the same worker claims on both Zomato and Swiggy for the same disruption window, only one claim passes.

**Layer 3 — DBSCAN Anomaly Clustering:**
Claims require a minimum cluster of offline riders in the same zone. A single rider going offline is a personal breakdown, not a disruption.

---

### 🖥️ Admin Panel — Final Page Map

| Route | Page | Key Feature |
|---|---|---|
| `/` | Mission Control | Live WebSocket KPIs, 4-service system status panel |
| `/simulate` | Simulation | Trigger disruptions with real AI scenario generation |
| `/payment` | Payments | Premium collection + one-click batch payout |
| `/analytics` | Analytics | Loss ratios, predictive forecast, city breakdown |
| `/risk` | Risk Engine | Zone risk heatmap, DBSCAN anomaly scores |
| `/claims` | Claims | Full claim table with 3-gate status indicators |
| `/workers` | Workers | All registered delivery partners |
| `/policies` | Policies | Active coverage policies |

---

### 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Prisma ORM |
| Real-time | Socket.io WebSockets |
| Payments | Razorpay (Test Mode — real API, real TXN IDs) |
| AI Primary | Gemini Flash (`gemini-flash-latest`) |
| AI Fallback | Ollama local (`qwen-balanced:latest`) |
| Weather | OpenWeatherMap API |
| ML | DBSCAN anomaly clustering |
| Fraud | SHA-256 hashing, GPS physics validation |
| Cache | Redis |

---

### 🚀 Running Locally

**Backend:**
```bash
cd gigshield/backend
npm install
node server.js
# http://localhost:4000
```

**Frontend:**
```bash
cd gigshield/dashboard
npm install
npm run dev
# http://localhost:5173
```

**On your phone (same WiFi):** `http://192.168.1.11:5173/app`

---

*Guidewire DEVTrails 2026 — RouteSafe Insurance Team*
*Last updated: April 17, 2026*

