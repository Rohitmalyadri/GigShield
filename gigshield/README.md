# 🛡️ RouteSafe Insurance
### AI-Powered Parametric Wage Protection for India's Gig Economy

> **Guidewire DEVTrails 2026 — Phase 3 Final Submission**
> Team: BALAJI-RVK | Track: AI-Enabled InsurTech | Persona: Gig Delivery Partners

---

## 🎯 The Problem We're Solving

India has **12+ million delivery partners** on platforms like Zomato, Swiggy, Zepto and Amazon. When external disruptions hit — extreme rainfall, floods, civic disturbances — these workers can't ride. They lose **20–30% of their monthly income** in a single day. No safety net. No insurance. No recourse.

**Current reality:**
- A Zomato rider in Bangalore earns ₹800–1,200/day
- A 35mm/hr rainstorm wipes out their entire shift
- They have no way to claim, no one to call, no product that exists for them

---

## 💡 Our Solution: Parametric Wage Stabilization

**RouteSafe Insurance** is a fully automated, AI-driven parametric insurance platform that:

1. **Detects disruptions automatically** — no worker needs to file a claim
2. **Validates through 3 AI gates** — weather data, rider activity clustering, fraud detection
3. **Pays out instantly** — one Razorpay transaction covers all affected workers
4. **Costs less than a meal** — from ₹15–92/week depending on zone risk

> **Parametric = The trigger IS the claim.** If rain exceeds 35mm/hr in your zone and 80% of riders go offline — you get paid. Zero paperwork. Zero waiting.

---

## 🏗️ Business Model: B2B2C

```
INSURER (Admin)
    │
    │  Sets policy rules, monitors loss ratios,
    │  approves claims via one-click batch payout
    ▼
PLATFORM (Zomato / Swiggy)
    │
    │  Integrates RouteSafe as an opt-in benefit
    │  Premium auto-deducted from weekly earnings
    ▼
DELIVERY PARTNER (Worker)
    │
    │  Zero-touch experience via mobile app
    │  Gets paid automatically during disruptions
```

- **B** = RouteSafe Insurance (this platform)
- **B** = Food delivery platforms (Zomato, Swiggy)
- **C** = Delivery partners (the beneficiaries)

---

## 🔬 What Makes Us Different

| Feature | Traditional Insurance | RouteSafe |
|---|---|---|
| Claim process | Worker fills form, uploads docs, waits 2–4 weeks | **Zero-touch — trigger IS the claim** |
| Fraud detection | Manual review teams | **3-layer AI: GPS physics + DBSCAN + SHA-256** |
| Pricing | Flat rate for all | **AI-dynamic: zone risk × active hours × weather** |
| Payout | Bank transfer in 7–14 days | **One Razorpay button — all workers paid in 30s** |
| Disruption detection | Customer complaint | **Real-time OpenWeather + rider activity clustering** |
| Analytics | Historical only | **Predictive next-week claims forecast** |

---

## ⚙️ Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD                    │
│  React + Vite │ WebSocket real-time │ Razorpay UI   │
└──────────────────────────┬──────────────────────────┘
                           │ HTTP + WebSocket
┌──────────────────────────▼──────────────────────────┐
│              NODE.JS EXPRESS BACKEND                 │
│  Port 4000 │ Prisma ORM │ Socket.io │ Razorpay SDK  │
├─────────────────────────────────────────────────────┤
│  CLAIM PIPELINE (3-Gate Automated System)           │
│  Gate 1: OpenWeather API — real precipitation data  │
│  Gate 2: DBSCAN clustering — rider activity anomaly │
│  Gate 3: Fraud engine — GPS + dedup + identity hash │
├─────────────────────────────────────────────────────┤
│  AI / LLM Layer                                     │
│  Primary:  Gemini Flash (gemini-flash-latest)       │
│  Fallback: Ollama local (qwen-balanced:latest)      │
├─────────────────────────────────────────────────────┤
│  DATABASE                                           │
│  PostgreSQL │ Prisma ORM │ Redis (caching/sessions) │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Feature Breakdown by Phase

### Phase 1 — Foundation
- Worker registration with SHA-256 canonical identity hash
- Prisma schema: Worker, Policy, Claim, Payment, ZoneRisk, WorkerActivity
- Basic Express API routes + PostgreSQL connection
- Zomato Partner mobile app clone (React, mobile-first)

### Phase 2 — Automation Core
- **Gate 1:** OpenWeather API integration — validates real rainfall data per zone
- **Gate 2:** DBSCAN anomaly detection — identifies true disruptions from rider offline patterns
- **Gate 3:** Fraud detection — GPS spoofing (physics-based), identity deduplication
- Real-time WebSocket (Socket.io) — live claim pipeline updates on admin dashboard
- Weekly premium calculation engine — dynamic pricing based on zone + weather history
- Policy creation and activation flow

### Phase 3 — Scale & Optimise (Final Phase)
- **Instant Batch Payout** — one Razorpay button pays ALL approved workers simultaneously
  - Backend creates single Razorpay order for total batch amount
  - HMAC SHA-256 signature verification on every transaction
  - Live streaming payout log per worker with real Razorpay TXN IDs
- **Predictive Analytics** — next-week claim forecast using 4-week rolling average × seasonal monsoon multipliers
- **Loss Ratio Dashboard** — real actuarial metrics per city: premiums collected vs payouts
- **AI Dispute Resolution** — Gemini Flash primary, Ollama local fallback
- **Mobile UX Upgrade** — SVG nav icons, gradient hero screens, animated earnings counters
- **Multi-platform registration** — workers register for both Zomato + Swiggy simultaneously

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL, Prisma ORM |
| **Real-time** | Socket.io WebSockets |
| **Payments** | Razorpay (test mode — real API, real TXN IDs) |
| **AI / LLM** | Gemini Flash (`gemini-flash-latest`) + Ollama fallback |
| **Weather** | OpenWeatherMap API |
| **ML Model** | DBSCAN anomaly clustering (zone activity patterns) |
| **Fraud** | SHA-256 hashing, GPS physics validation |
| **Cache** | Redis |
| **Styling** | Vanilla CSS, inline styles (zero dependencies) |

---

## 📱 Mobile App (Zomato Partner Clone)

The worker-facing mobile app simulates the Zomato Partner app with RouteSafe Insurance embedded as a benefit.

**Screens:**
- **Home** — Live earnings stats, animated counters, coverage promo card with estimated premium
- **Register** — 2-step form: details → premium preview → activate. Multi-platform selection (Zomato + Swiggy)
- **Earnings (Dashboard)** — Weekly earnings chart, active policy card, Start Shift button
- **Shield (Monitor)** — Live zone risk score, active protection status, weather data
- **Claims** — Full payout history with status tracking

**Access on phone (same WiFi):** `http://192.168.1.11:5173/app`

---

## 🖥️ Admin Panel

| Route | Page | Purpose |
|---|---|---|
| `/` | Mission Control | Live KPIs, real-time claim pipeline, system status |
| `/simulate` | Simulation | Trigger test disruptions (rain, flood, civic events) |
| `/payment` | Payments | Collect premiums + one-click batch payout |
| `/analytics` | Analytics | Loss ratios, city breakdown, predictive forecast |
| `/risk` | Risk Engine | Zone risk heatmap, DBSCAN anomaly scores |
| `/claims` | Claims | Full claim table with gate status indicators |
| `/workers` | Workers | All registered delivery partners |
| `/policies` | Policies | Active coverage policies |

---

## 💳 Razorpay Integration

All payment flows use real Razorpay Test Mode (actual API, actual transaction IDs).

**Premium Collection:** Admin collects weekly premiums from workers via Razorpay checkout.

**Batch Payout:** One click pays all approved workers simultaneously:
1. Backend creates single Razorpay order for total batch amount
2. Razorpay checkout modal opens for admin
3. On success → HMAC SHA-256 signature verified server-side
4. All approved claims marked `paid` with real Razorpay `pay_XXXXXXXXX` ID
5. Live streaming log shows each worker's payout

**Test Cards:**
```
Card:  4111 1111 1111 1111
Expiry: Any future date
CVV:   Any 3 digits
OTP:   1234
```

---

## 🔒 Fraud Detection (3-Layer Architecture)

### Layer 1 — GPS Spoofing Detection
Workers report their zone location. If the GPS coordinate jumps more than physically possible (e.g. 50km in 2 minutes), the claim is auto-rejected.

### Layer 2 — Identity Deduplication
A SHA-256 canonical hash is computed from `name + phone + city + zone`. If the same worker attempts to claim on both Zomato and Swiggy during the same disruption window, it's caught and blocked.

### Layer 3 — DBSCAN Anomaly Clustering
If only 1 rider in a zone is offline while 50 others are active — that's not a disruption, it's a breakdown or a lie. Our DBSCAN model requires a minimum cluster size before approving a zone-wide disruption claim.

---

## 📊 Predictive Analytics

The admin dashboard forecasts **next week's expected claims** per city using:

```
Predicted Claims = 4-week rolling average × Seasonal Risk Multiplier
```

Seasonal multipliers are calibrated using IMD (India Meteorological Department) historical flood data:
- Mumbai (June–September): 2.8× multiplier (monsoon flood zone)
- Bangalore (April–May): 1.5× multiplier (pre-monsoon peak)
- Delhi (July–August): 1.3× multiplier (moderate monsoon impact)

This lets insurers **pre-allocate reserves** before claims arrive.

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis
- (Optional) Ollama for local LLM fallback

### Environment Setup

Copy `.env.example` to `backend/.env` and fill in:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/gigshield"
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXX
GEMINI_API_KEY=AQ.XXXXXXXXXX
GEMINI_MODEL=gemini-flash-latest
OPENWEATHER_API_KEY=XXXXXXXXXX
```

### Start Backend
```bash
cd gigshield/backend
npm install
npx prisma migrate dev
node server.js
# Runs on http://localhost:4000
```

### Start Frontend
```bash
cd gigshield/dashboard
npm install
npm run dev
# Runs on http://localhost:5173
```

### Access
- Admin Dashboard: `http://localhost:5173`
- Mobile App: `http://localhost:5173/app`
- API Health: `http://localhost:4000/`

---

## 📁 Project Structure

```
gigshield/
├── backend/
│   ├── routes/
│   │   ├── payment.js        # Premium collection + batch payout
│   │   ├── claims.js         # 3-gate claim validation pipeline
│   │   ├── workers.js        # Worker registration + profiles
│   │   └── analytics.js      # Loss ratios + predictive stats
│   ├── fraud/
│   │   ├── deduplication.js  # SHA-256 identity dedup
│   │   └── geoValidator.js   # GPS spoofing detection
│   ├── llm/
│   │   ├── llmClient.js      # Gemini Flash → Ollama fallback
│   │   └── scenarioEngine.js # AI-generated disruption scenarios
│   ├── prisma/
│   │   └── schema.prisma     # Full DB schema
│   └── server.js             # Express + Socket.io root
└── dashboard/
    └── src/
        ├── pages/
        │   ├── MissionControl.jsx    # Live ops dashboard
        │   ├── AnalyticsPage.jsx     # Predictive analytics
        │   ├── PaymentPage.jsx       # Batch payout UI
        │   ├── SimulatePage.jsx      # Disruption simulator
        │   └── app/                  # Mobile app screens
        │       ├── AppLayout.jsx     # Shell + bottom nav
        │       ├── AppHome.jsx       # Worker home screen
        │       ├── AppRegister.jsx   # Multi-step registration
        │       ├── AppDashboard.jsx  # Earnings + shift control
        │       ├── AppMonitor.jsx    # Live zone monitoring
        │       └── AppClaims.jsx     # Claims history
        └── App.jsx                   # Router + admin sidebar
```

---

## 👥 Team

**BALAJI-RVK** | Guidewire DEVTrails 2026

---

## 📄 License

Built for Guidewire DEVTrails 2026 Hackathon. All Razorpay keys are test mode only.
