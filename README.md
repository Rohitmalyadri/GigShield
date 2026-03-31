# 🛡️ GigShield — AI-Powered Parametric Wage Stabilization for Food Delivery Partners

> **Guidewire DEVTrails 2026 | Phase 4 — Autonomous LLM Demo**
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

GigShield is not a static rules engine. It is a continuously evolving predictive model.

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

### Phase 2 (March 21–26) — Automation & Protection ✅
- Complete 5-layer engine (all layers operational)
- Dynamic weekly premium calculator (ML-powered)
- Dual Gate parametric trigger wired and tested
- Fraud validation (deduplication + GPS spoofing)
- Zero-Day Anomaly Detector (DBSCAN, runs every 60s)
- Razorpay payout simulation (UTR generation)
- React Admin Dashboard (Workers, Claims, Simulate pages)

### Phase 3 (March 27 – March 31) — Autonomous LLM Demo ✅
- Gemini 2.0 Flash Lite as primary AI brain
- Ollama (qwen-balanced) as local fallback
- `scenarioEngine.js` — auto-generates disruptions
- `narratorEngine.js` — narrates all 8 event types
- Socket.io WebSocket live feed
- QR code check-in (mobile confirmation page)
- Auto-pipeline: QR scan → 2.5 min timer → disruption fires autonomously

### Phase 4 (April 1–17) — Mission Control & Polish
- Mission Control dashboard (single screen, dark theme)
- Live event feed with color coding
- AI Narrator panel with Qwen/Gemini narration
- Payout animation card
- Final pitch deck + 5-minute demo video

---

## 15. Business Viability

GigShield operates as a **B2B2C embedded insurtech** — the AI parametric engine sitting between gig platforms and IRDAI-licensed underwriters.

**Unit economics at scale:**
- Distribution is free — Zomato/Swiggy already have 5M+ active delivery partners
- At ₹45/week average premium across 1M riders → ₹45Cr/week in premium flow
- ~80% loss ratios in non-monsoon seasons → viable underwriting margin

**The pitch in one line:**
> GigShield is not selling insurance to gig workers. It is selling certainty to the platforms that depend on them.

---

*Guidewire DEVTrails 2026 — GigShield Team*
*Last updated: March 31, 2026*
