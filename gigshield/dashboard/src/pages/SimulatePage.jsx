// ─────────────────────────────────────────────────────────
// SIMULATION CENTRE — SimulatePage.jsx (Complete Rewrite)
// ─────────────────────────────────────────────────────────
// The primary hackathon demo page. Runs the FULL RouteSafe Insurance
// pipeline in one place so a judge can see the entire flow:
//
//  STEP 1 ─ Set zone conditions (Risk Engine inputs)
//  STEP 2 ─ Risk Score calculated (Dynamic Risk Engine)
//  STEP 3 ─ Decision mode assigned (Normal/Incentive/Protection/Critical)
//  STEP 4 ─ Dual Gate pipeline triggered (Gate1 → Gate2 → Fraud)
//  STEP 5 ─ Claim approved or rejected + Payout amount shown
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import axios from 'axios'

// ── STEP TRACKER ────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Zone Conditions',  icon: '⚙️'  },
  { n: 2, label: 'Risk Score',       icon: '📊'  },
  { n: 3, label: 'Decision Mode',    icon: '🧠'  },
  { n: 4, label: 'Gate Pipeline',    icon: '🔐'  },
  { n: 5, label: 'Claim Outcome',    icon: '💰'  },
]

function StepBar({ active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', marginBottom: 32,
      background: '#0a0f1a', border: '1px solid #1e2d45',
      borderRadius: 14, padding: '16px 24px', gap: 0
    }}>
      {STEPS.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: active >= s.n ? 'linear-gradient(135deg,#b45309,#f59e0b)' : '#161d2e',
              border: `2px solid ${active >= s.n ? '#f59e0b' : active === s.n - 1 ? '#334155' : '#1e2d45'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: active >= s.n ? 18 : 14,
              transition: 'all 0.3s',
              boxShadow: active >= s.n ? '0 0 14px rgba(245,158,11,0.4)' : 'none'
            }}>
              {active >= s.n ? s.icon : <span style={{ color: '#334155', fontWeight: 700, fontSize: 13 }}>{s.n}</span>}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
              color: active >= s.n ? '#f59e0b' : '#334155',
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: active > s.n ? '#f59e0b' : '#1e2d45',
              margin: '0 6px 22px',
              transition: 'background 0.4s'
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── MODE META ───────────────────────────────────────────────
const MODE_META = {
  NORMAL:     { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  emoji: '✅', label: 'Normal Operations',   desc: 'No risk intervention needed.' },
  INCENTIVE:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', emoji: '🚀', label: 'Incentive Mode',       desc: '₹15 bonus per completed order.' },
  PROTECTION: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', emoji: '🛡️', label: 'Protection Mode',     desc: '₹200 guaranteed + ₹50/hr downtime.' },
  CRITICAL:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  emoji: '🚨', label: 'Critical Mode',        desc: 'Zone paused — ₹75/hr downtime only.' },
}

function ScoreMeter({ score }) {
  const color = score === null ? '#334155'
              : score <= 30 ? '#10b981'
              : score <= 60 ? '#f59e0b'
              : score <= 80 ? '#f97316' : '#ef4444'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0'
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: '50%', margin: '0 auto 12px',
        border: `7px solid ${color}`, background: `${color}15`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: score !== null ? `0 0 28px ${color}35` : 'none',
        transition: 'all 0.4s'
      }}>
        <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1 }}>
          {score ?? '—'}
        </div>
        <div style={{ fontSize: 10, color: '#475569' }}>/ 100</div>
      </div>
    </div>
  )
}

function GateRow({ label, pass, reason, pending }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 10,
      background: pending ? '#0f1520'
                : pass  ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${pending ? '#1e2d45' : pass ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      transition: 'all 0.3s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 18 }}>
          {pending ? '⏳' : pass ? '✅' : '❌'}
        </span>
      </div>
      {reason && (
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{reason}</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────
export default function SimulatePage() {
  // ── Workers ──────────────────────────────────────────
  const [workers,       setWorkers]       = useState([])
  const [loadingList,   setLoadingList]   = useState(true)
  const [selectedWorker, setSelected]     = useState(null)

  // ── Step 1 inputs ─────────────────────────────────────
  const [rainfall,       setRainfall]       = useState(45)
  const [activeWorkers,  setActiveWorkers]  = useState(3)
  const [currentOrders,  setCurrentOrders]  = useState(38)
  const [onlineMinutes,  setOnlineMinutes]  = useState(90)
  const [completions,    setCompletions]    = useState(2)
  const [hoursLost,      setHoursLost]      = useState(2)
  const [curfew,         setCurfew]         = useState(false)
  const [floodAlert,     setFloodAlert]     = useState(false)

  // ── Pipeline state ────────────────────────────────────
  const [activeStep,  setActiveStep]  = useState(0)  // 0 = not started
  const [riskResult,  setRiskResult]  = useState(null)
  const [gateResult,  setGateResult]  = useState(null)
  const [running,     setRunning]     = useState(false)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    axios.get('/api/workers')
      .then(r => {
        const list = r.data.workers || []
        setWorkers(list)
        if (list.length > 0) setSelected(list[0])
        setLoadingList(false)
      })
      .catch(() => setLoadingList(false))
  }, [])

  function reset() {
    setActiveStep(0); setRiskResult(null); setGateResult(null); setError(null)
  }

  // ── RUN FULL PIPELINE ────────────────────────────────
  async function runPipeline() {
    if (!selectedWorker) return
    reset()
    setRunning(true)
    setError(null)

    try {
      // ── STEP 1: Zone inputs collected (visual only) ──
      setActiveStep(1)
      await delay(600)

      // ── STEP 2 + 3: Risk Engine ──────────────────────
      setActiveStep(2)
      const riskRes = await axios.post('/api/risk/simulate', {
        zoneId:         selectedWorker.zone,
        rainfall_mm_hr: Number(rainfall),
        activeWorkers:  Number(activeWorkers),
        zoneCapacity:   10,
        currentOrders:  Number(currentOrders),
        baselineOrders: 20,
        regulatoryFlags: { curfew, floodAlert },
      })
      setRiskResult(riskRes.data)
      setActiveStep(3)
      await delay(800)

      // ── STEP 4: Gate Pipeline (existing backend) ──────
      setActiveStep(4)
      const gateRes = await axios.post('/api/simulate-disruption', {
        workerHash:             selectedWorker.workerHash,
        zone:                   selectedWorker.zone,
        rainfall_mm_hr:         Number(rainfall),
        workerStatus:           'online',
        onlineMinutes:          Number(onlineMinutes),
        completions_last_hour:  Number(completions),
        hoursLost:              Number(hoursLost),
      })
      setGateResult(gateRes.data)
      await delay(400)

      // ── STEP 5: Final outcome ─────────────────────────
      setActiveStep(5)

    } catch (err) {
      setError(err.response?.data?.error || err.message)
      setRunning(false)
    } finally {
      setRunning(false)
    }
  }

  const score    = riskResult?.riskScore ?? null
  const mode     = riskResult?.decision?.mode || 'NORMAL'
  const mMeta    = MODE_META[mode] || MODE_META.NORMAL
  const gate     = gateResult?.simulation?.gateDecision
  const approved = gate?.payoutStatus === 'approved'
  const payout   = gate?.payoutAmount ?? 0

  return (
    <div className="page-fade">
      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>⚡ Simulation Centre</h2>
          <p>Run the complete RouteSafe Insurance pipeline — Risk Engine → Decision → Gate Checks → Payout</p>
        </div>
        {activeStep > 0 && (
          <button onClick={reset} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', border: '1px solid #1e2d45',
            color: '#64748b', fontWeight: 600, fontSize: 12
          }}>
            ↺ Reset
          </button>
        )}
      </div>

      {/* ── STEP PROGRESS BAR ───────────────────────────── */}
      <StepBar active={activeStep} />

      {/* ── ERROR ───────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '14px 18px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#ef4444', fontSize: 13
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>

        {/* ─── LEFT: INPUT PANEL ────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Worker */}
          <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 14, padding: 18 }}>
            <div style={sectionLabel}>👷 1. Select Worker</div>

            {loadingList ? (
              <div className="skeleton" style={{ height: 36, borderRadius: 8 }} />
            ) : workers.length === 0 ? (
              <div style={{ color: '#ef4444', fontSize: 12 }}>
                No workers found. <a href="/register" style={{ color: '#f59e0b' }}>Register one first →</a>
              </div>
            ) : (
              <select
                onChange={e => setSelected(workers[Number(e.target.value)])}
                style={selectStyle}
              >
                {workers.map((w, i) => (
                  <option key={w.id || i} value={i}>
                    {w.name !== 'Unknown Partner' ? w.name : w.workerHash.substring(0, 10) + '…'}
                    {' — '}{w.city} (zone {w.zone})
                  </option>
                ))}
              </select>
            )}

            {selectedWorker && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
                display: 'flex', gap: 12, flexWrap: 'wrap'
              }}>
                <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>
                  📍 {selectedWorker.city}
                </span>
                <span style={{ color: '#64748b', fontSize: 11 }}>
                  Zone {selectedWorker.zone}
                </span>
                <span style={{ color: selectedWorker.isActive ? '#10b981' : '#ef4444', fontSize: 11 }}>
                  {selectedWorker.isActive ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
            )}
          </div>

          {/* Zone Conditions */}
          <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 14, padding: 18 }}>
            <div style={sectionLabel}>🌧️ 2. Zone Conditions (Risk Engine)</div>

            <Slider label="Rainfall" value={rainfall} min={0} max={100} unit="mm/hr"
              onChange={setRainfall} warnAt={35} warnMsg="Gate 1 trigger threshold" />
            <Slider label="Active Workers" value={activeWorkers} min={0} max={20} unit=" online"
              onChange={setActiveWorkers} />
            <Slider label="Current Orders" value={currentOrders} min={0} max={60} unit=" orders/hr"
              onChange={setCurrentOrders} />

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Toggle label="🚫 Curfew" on={curfew} onClick={() => setCurfew(v => !v)} />
              <Toggle label="🌊 Flood Alert" on={floodAlert} onClick={() => setFloodAlert(v => !v)} />
            </div>
          </div>

          {/* Gate Inputs */}
          <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 14, padding: 18 }}>
            <div style={sectionLabel}>🔐 3. Worker Activity (Gate Checks)</div>

            <Slider label="Online Minutes" value={onlineMinutes} min={0} max={120} unit=" min"
              onChange={setOnlineMinutes} warnAt={60} warnMsg="Gate 2 requires ≥60 min" />
            <Slider label="Orders Completed" value={completions} min={0} max={6} unit=" orders"
              onChange={setCompletions} />
            <Slider label="Hours Lost" value={hoursLost} min={0} max={8} unit=" hrs"
              onChange={setHoursLost} />
          </div>

          {/* Run button */}
          <button
            onClick={runPipeline}
            disabled={running || !selectedWorker || loadingList}
            style={{
              padding: '14px', borderRadius: 10, fontWeight: 800, fontSize: 14,
              cursor: running || !selectedWorker ? 'not-allowed' : 'pointer',
              border: 'none', transition: 'all 0.2s',
              background: running || !selectedWorker
                ? '#1e2d45'
                : 'linear-gradient(135deg, #b45309, #f59e0b)',
              color: running || !selectedWorker ? '#475569' : '#000',
              boxShadow: running || !selectedWorker ? 'none' : '0 4px 20px rgba(245,158,11,0.35)',
            }}
          >
            {running ? '⏳ Running Pipeline...' : '⚡ Run Full Simulation'}
          </button>

          {/* Quick presets */}
          <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: 10 }}>
              Quick Presets
            </div>
            {[
              { label: '☀️ Normal Day',    vals: [5,  8, 20, 90, 3, 1, false, false] },
              { label: '🌧️ Heavy Rain',   vals: [55, 3, 38, 90, 2, 3, false, false] },
              { label: '🌊 Flood Alert',  vals: [75, 2, 50, 60, 1, 4, false, true]  },
              { label: '🚫 Curfew Zone', vals: [10, 1, 10, 30, 0, 2, true,  false] },
            ].map(({ label, vals }) => (
              <button key={label} onClick={() => {
                setRainfall(vals[0]); setActiveWorkers(vals[1])
                setCurrentOrders(vals[2]); setOnlineMinutes(vals[3])
                setCompletions(vals[4]); setHoursLost(vals[5])
                setCurfew(vals[6]); setFloodAlert(vals[7])
                reset()
              }} style={{
                display: 'block', width: '100%', padding: '7px 10px',
                marginBottom: 6, borderRadius: 7, cursor: 'pointer',
                background: 'transparent', border: '1px solid #1e2d45',
                color: '#94a3b8', fontSize: 12, fontWeight: 600, textAlign: 'left',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.target.style.background = '#161d2e'; e.target.style.color = '#f59e0b' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#94a3b8' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: PIPELINE RESULTS ────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Idle state */}
          {activeStep === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: '#0a0f1a', border: '1px dashed #1e2d45',
              borderRadius: 16, minHeight: 400, padding: 40, gap: 16
            }}>
              <div style={{ fontSize: 52 }}>⚡</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Ready to Simulate</div>
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
                Select a worker, adjust the zone conditions using the sliders,
                then click <strong style={{ color: '#f59e0b' }}>Run Full Simulation</strong> to
                watch the RouteSafe Insurance Risk Engine and Claims Pipeline execute in real-time.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {STEPS.map(s => (
                  <div key={s.n} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: '#0f1520', border: '1px solid #1e2d45', color: '#64748b'
                  }}>
                    {s.icon} {s.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Risk Score ───────────────────────────── */}
          {activeStep >= 2 && (
            <div style={{
              background: '#0f1520',
              border: `1px solid ${riskResult ? mMeta.color + '40' : '#1e2d45'}`,
              borderRadius: 14, padding: 20
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊 Step 2 — Risk Score</span>
                {running && activeStep === 2 && <span style={{ color: '#64748b', fontSize: 12 }}>calculating...</span>}
              </div>

              {!riskResult ? (
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="skeleton" style={{ flex: 1, height: 60, borderRadius: 8 }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 20, alignItems: 'center' }}>
                  <ScoreMeter score={score} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      ['🌧️ Weather',     riskResult.components?.weatherScore,    '#60a5fa'],
                      ['👷 Shortage',    riskResult.components?.workerShortage,  '#f59e0b'],
                      ['📦 Demand',      riskResult.components?.demandSurge,     '#a855f7'],
                      ['⚖️ Regulatory', riskResult.components?.regulatoryRisk,   '#ef4444'],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{
                        padding: '10px 12px', borderRadius: 8,
                        background: `${c}10`, border: `1px solid ${c}25`
                      }}>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{l}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Decision Mode ──────────────────────────── */}
          {activeStep >= 3 && riskResult && (
            <div style={{
              background: mMeta.bg,
              border: `1px solid ${mMeta.color}35`,
              borderRadius: 14, padding: 18,
              display: 'flex', gap: 16, alignItems: 'center',
              transition: 'all 0.3s'
            }}>
              <div style={{ fontSize: 40 }}>{mMeta.emoji}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: mMeta.color }}>
                  Step 3 — {mMeta.label}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{mMeta.desc}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {riskResult.decision?.bonusPerOrder > 0 && (
                    <Chip color="#f59e0b">💰 ₹{riskResult.decision.bonusPerOrder}/order bonus</Chip>
                  )}
                  {riskResult.decision?.guaranteedMin > 0 && (
                    <Chip color="#10b981">🛡️ ₹{riskResult.decision.guaranteedMin} min. guaranteed</Chip>
                  )}
                  {riskResult.decision?.downtimeRate > 0 && (
                    <Chip color="#60a5fa">⏱️ ₹{riskResult.decision.downtimeRate}/hr downtime</Chip>
                  )}
                  {riskResult.decision?.zoneActive === false && (
                    <Chip color="#ef4444">🚫 Zone Paused</Chip>
                  )}
                </div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                  {riskResult.decision?.workerAction}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Gate Pipeline ──────────────────────────── */}
          {activeStep >= 4 && (
            <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>🔐 Step 4 — Claim Gate Pipeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <GateRow
                  label={`Gate 1 — Weather Check (rainfall ≥ 35 mm/hr)`}
                  pass={gate?.gate1?.triggered}
                  reason={gate?.gate1?.reason || `Rainfall: ${rainfall}mm/hr — ${rainfall >= 35 ? 'Threshold met ✅' : 'Below 35mm threshold ❌'}`}
                  pending={!gate}
                />
                <GateRow
                  label={`Gate 2 — Worker Activity (online ≥ 60 min)`}
                  pass={gate?.gate2?.validated}
                  reason={gate?.gate2?.reason || `Online ${onlineMinutes} min — ${onlineMinutes >= 60 ? 'Verified ✅' : 'Insufficient ❌'}`}
                  pending={!gate}
                />
                <GateRow
                  label="Fraud Check — Deduplication"
                  pass={gate?.payoutStatus !== 'duplicate_rejected'}
                  reason={gate?.fraudReason || 'Checking for duplicate claims...'}
                  pending={!gate}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Final Outcome ──────────────────────────── */}
          {activeStep >= 5 && gate && (
            <div style={{
              padding: '28px', borderRadius: 14, textAlign: 'center',
              background: approved ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${approved ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
              transition: 'all 0.3s'
            }}>
              <div style={{ fontSize: 48 }}>{approved ? '✅' : '❌'}</div>
              <div style={{
                fontSize: 22, fontWeight: 900, marginTop: 12,
                color: approved ? '#10b981' : '#ef4444'
              }}>
                Step 5 — Claim {approved ? 'APPROVED' : 'REJECTED'}
              </div>
              {approved && (
                <div style={{ fontSize: 40, fontWeight: 900, color: '#f59e0b', marginTop: 8 }}>
                  ₹{payout}
                </div>
              )}
              <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12, maxWidth: 340, margin: '12px auto 0' }}>
                {approved
                  ? `Payout of ₹${payout} will be processed to ${selectedWorker?.name || 'the worker'}'s linked account.`
                  : 'Claim did not pass all gate checks. Worker is not eligible for this disruption event.'}
              </div>
              {gate.premiumAmount && (
                <div style={{ fontSize: 12, color: '#475569', marginTop: 12 }}>
                  Policy premium on file: ₹{gate.premiumAmount}
                </div>
              )}

              {/* Summary row */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 24,
                marginTop: 20, flexWrap: 'wrap'
              }}>
                <Stat label="Risk Score" value={score} color={score <= 30 ? '#10b981' : score <= 60 ? '#f59e0b' : '#ef4444'} />
                <Stat label="Mode" value={mMeta.label} color={mMeta.color} />
                <Stat label="Gate 1" value={gate?.gate1?.triggered ? '✅ Pass' : '❌ Fail'} color={gate?.gate1?.triggered ? '#10b981' : '#ef4444'} />
                <Stat label="Gate 2" value={gate?.gate2?.validated ? '✅ Pass' : '❌ Fail'} color={gate?.gate2?.validated ? '#10b981' : '#ef4444'} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── HELPERS ─────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function Slider({ label, value, min, max, unit, onChange, warnAt, warnMsg }) {
  const isWarn = warnAt !== undefined && value >= warnAt
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</label>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isWarn ? '#f59e0b' : '#f1f5f9' }}>
            {value}{unit}
          </span>
          {isWarn && warnMsg && (
            <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 1 }}>{warnMsg}</div>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: isWarn ? '#f59e0b' : '#60a5fa', cursor: 'pointer' }}
      />
    </div>
  )
}

function Toggle({ label, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px', borderRadius: 7, cursor: 'pointer',
      fontWeight: 600, fontSize: 11, transition: 'all 0.15s',
      background: on ? 'rgba(239,68,68,0.15)' : 'transparent',
      color:      on ? '#ef4444' : '#64748b',
      border:     `1px solid ${on ? 'rgba(239,68,68,0.35)' : '#1e2d45'}`,
    }}>
      {label}: {on ? 'ON' : 'OFF'}
    </button>
  )
}

function Chip({ color, children }) {
  return (
    <span style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`
    }}>
      {children}
    </span>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: color || '#f1f5f9', marginTop: 3 }}>{value}</div>
    </div>
  )
}

const sectionLabel = {
  fontSize: 11, color: '#64748b', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14
}
const selectStyle = {
  width: '100%', padding: '9px 12px', background: '#161d2e',
  border: '1px solid #1e2d45', borderRadius: 8, color: '#f1f5f9',
  fontSize: 13, outline: 'none', cursor: 'pointer'
}
