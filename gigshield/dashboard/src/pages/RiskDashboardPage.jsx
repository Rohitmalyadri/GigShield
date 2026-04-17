// ─────────────────────────────────────────────────────────
// RISK DASHBOARD PAGE — RiskDashboardPage.jsx
// ─────────────────────────────────────────────────────────
// Interactive hackathon demo panel for the Dynamic Risk
// Protection Engine. Features:
//   - Real-time Risk Score simulator (input sliders)
//   - Live zone risk table from DB
//   - Compensation calculator
//   - Premium pool health gauge
//   - Decision mode explanation cards
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import axios from 'axios'

// ── CONSTANTS ─────────────────────────────────────────────
const MODE_META = {
  NORMAL:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  emoji: '✅', label: 'Normal' },
  INCENTIVE:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)',  emoji: '🚀', label: 'Incentive' },
  PROTECTION: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', emoji: '🛡️', label: 'Protection' },
  CRITICAL:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',   emoji: '🚨', label: 'Critical' },
}

function ModeBadge({ mode }) {
  const m = MODE_META[mode] || MODE_META.NORMAL
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 100, fontSize: 11,
      fontWeight: 700, color: m.color, background: m.bg,
      border: `1px solid ${m.border}`
    }}>
      {m.emoji} {m.label}
    </span>
  )
}

// ── SCORE GAUGE ────────────────────────────────────────────
function RiskGauge({ score }) {
  const color = score <= 30 ? '#10b981'
              : score <= 60 ? '#f59e0b'
              : score <= 80 ? '#f97316'
              : '#ef4444'
  const mode  = score <= 30 ? 'NORMAL'
              : score <= 60 ? 'INCENTIVE'
              : score <= 80 ? 'PROTECTION'
              : 'CRITICAL'

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{
        width: 140, height: 140, borderRadius: '50%', margin: '0 auto 16px',
        border: `8px solid ${color}`,
        background: `${color}10`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 30px ${color}40`,
        transition: 'all 0.4s ease'
      }}>
        <div style={{ fontSize: 38, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>/ 100</div>
      </div>
      <ModeBadge mode={mode} />
    </div>
  )
}

// ── SLIDER INPUT ───────────────────────────────────────────
function SliderInput({ label, value, min, max, unit, onChange, danger }) {
  const pct = ((value - min) / (max - min)) * 100
  const color = danger && value >= danger ? '#ef4444' : '#f59e0b'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</label>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', accentColor: color,
          height: 4, cursor: 'pointer'
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function RiskDashboardPage() {
  // ── Simulator inputs ──────────────────────────────────
  const [zoneId,         setZoneId]         = useState('560034')
  const [rainfall,       setRainfall]       = useState(0)
  const [activeWorkers,  setActiveWorkers]  = useState(5)
  const [zoneCapacity,   setZoneCapacity]   = useState(10)
  const [currentOrders,  setCurrentOrders]  = useState(20)
  const [baselineOrders, setBaselineOrders] = useState(20)
  const [curfew,         setCurfew]         = useState(false)
  const [floodAlert,     setFloodAlert]     = useState(false)

  // ── Result state ───────────────────────────────────────
  const [simResult,      setSimResult]      = useState(null)
  const [compResult,     setCompResult]     = useState(null)
  const [zoneRisks,      setZoneRisks]      = useState([])
  const [pool,           setPool]           = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [compLoading,    setCompLoading]    = useState(false)

  useEffect(() => {
    // Load existing zone risks from DB
    axios.get('/api/risk/zones').then(r => setZoneRisks(r.data.zones || []))
    // Load premium pool
    axios.get('/api/analytics/dashboard').then(r => setPool(r.data.dashboard?.pool || null))
  }, [])

  // ── Simulate risk (no DB write) ────────────────────────
  const handleSimulate = async () => {
    setLoading(true)
    setSimResult(null)
    setCompResult(null)
    try {
      const res = await axios.post('/api/risk/simulate', {
        zoneId, rainfall_mm_hr: rainfall,
        activeWorkers, zoneCapacity,
        currentOrders, baselineOrders,
        regulatoryFlags: { curfew, floodAlert },
      })
      setSimResult(res.data)
    } catch (err) {
      setSimResult({ error: err.response?.data?.error || err.message })
    } finally {
      setLoading(false)
    }
  }

  // ── Full evaluate + store ──────────────────────────────
  const handleEvaluate = async () => {
    setLoading(true)
    try {
      const res = await axios.post('/api/risk/evaluate', {
        zoneId, rainfall_mm_hr: rainfall,
        activeWorkers, zoneCapacity,
        currentOrders, baselineOrders,
        regulatoryFlags: { curfew, floodAlert },
      })
      setSimResult(res.data)
      // Refresh zone risks after storing
      const zonesRes = await axios.get('/api/risk/zones')
      setZoneRisks(zonesRes.data.zones || [])
    } catch (err) {
      setSimResult({ error: err.response?.data?.error || err.message })
    } finally {
      setLoading(false)
    }
  }

  // ── Calculate compensation ─────────────────────────────
  const handleCompensation = async () => {
    if (!simResult?.riskScore) return
    setCompLoading(true)
    try {
      const res = await axios.post('/api/compensation/calculate', {
        zoneId,
        riskScore: simResult.riskScore,
        workers: [],  // auto-fetch from DB for this zone
        persist: false  // dry-run mode for demo
      })
      setCompResult(res.data)
    } catch (err) {
      setCompResult({ error: err.response?.data?.error || err.message })
    } finally {
      setCompLoading(false)
    }
  }

  const score  = simResult?.riskScore ?? 0
  const mode   = simResult?.decision?.mode || (score <= 30 ? 'NORMAL' : score <= 60 ? 'INCENTIVE' : score <= 80 ? 'PROTECTION' : 'CRITICAL')
  const mMeta  = MODE_META[mode] || MODE_META.NORMAL
  const lrPct  = pool ? (pool.lossRatio * 100).toFixed(1) : '0.0'

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h2>🧠 Dynamic Risk Engine</h2>
          <p>Real-time risk scoring, decision engine, and smart compensation calculator</p>
        </div>
      </div>

      {/* ── PREMIUM POOL HEALTH ────────────────────────── */}
      {pool && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 24,
          background: parseFloat(lrPct) < 60 ? 'rgba(16,185,129,0.08)'
                    : parseFloat(lrPct) < 80 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${parseFloat(lrPct) < 60 ? 'rgba(16,185,129,0.2)'
                  : parseFloat(lrPct) < 80 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Shared Risk Pool
            </div>
            <div style={{ fontSize: 13, color: '#f1f5f9', marginTop: 4 }}>
              💰 Collected: <strong style={{ color: '#f59e0b' }}>₹{pool.totalCollected}</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              📤 Paid Out: <strong style={{ color: '#10b981' }}>₹{pool.totalPayout}</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              📊 Loss Ratio: <strong style={{
                color: parseFloat(lrPct) < 60 ? '#10b981' : parseFloat(lrPct) < 80 ? '#f59e0b' : '#ef4444'
              }}>{lrPct}%</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              Status: <strong style={{
                color: pool.healthStatus === 'HEALTHY' ? '#10b981' : pool.healthStatus === 'MONITOR' ? '#f59e0b' : '#ef4444'
              }}>{pool.healthStatus}</strong>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Simulator Panel ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: '#0f1520', border: '1px solid #1e2d45',
            borderRadius: 14, padding: 20
          }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
              ⚙️ Risk Input Simulator
            </div>

            {/* Zone selector */}
            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Zone ID
            </label>
            <select
              value={zoneId}
              onChange={e => setZoneId(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', background: '#161d2e',
                border: '1px solid #1e2d45', borderRadius: 8, color: '#f1f5f9',
                fontSize: 13, marginBottom: 14, outline: 'none'
              }}
            >
              <option value="560034">560034 — Bangalore (High Risk)</option>
              <option value="400053">400053 — Mumbai (Very High)</option>
              <option value="110001">110001 — Delhi (Low Risk)</option>
            </select>

            <SliderInput label="🌧️ Rainfall" value={rainfall} min={0} max={100}
              unit="mm/hr" onChange={setRainfall} danger={35} />
            <SliderInput label="👷 Active Workers" value={activeWorkers} min={0} max={20}
              unit=" workers" onChange={setActiveWorkers} />
            <SliderInput label="🏠 Zone Capacity" value={zoneCapacity} min={1} max={20}
              unit=" workers" onChange={setZoneCapacity} />
            <SliderInput label="📦 Current Orders" value={currentOrders} min={0} max={60}
              unit=" orders" onChange={setCurrentOrders} />
            <SliderInput label="📊 Baseline Orders" value={baselineOrders} min={1} max={60}
              unit=" orders" onChange={setBaselineOrders} />

            {/* Flags */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8, marginBottom: 16 }}>
              {[
                { label: '🚫 Curfew',     val: curfew,     set: setCurfew },
                { label: '🌊 Flood Alert', val: floodAlert, set: setFloodAlert },
              ].map(({ label, val, set }) => (
                <button
                  key={label}
                  onClick={() => set(!val)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 600, fontSize: 12, transition: 'all 0.15s',
                    background: val ? 'rgba(239,68,68,0.15)' : 'transparent',
                    color:      val ? '#ef4444' : '#64748b',
                    border:     `1px solid ${val ? 'rgba(239,68,68,0.35)' : '#1e2d45'}`,
                  }}
                >
                  {label} {val ? 'ON' : 'OFF'}
                </button>
              ))}
            </div>

            {/* Buttons */}
            <button
              onClick={handleSimulate}
              disabled={loading}
              style={{
                width: '100%', padding: '11px', borderRadius: 9, cursor: 'pointer',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 13,
                marginBottom: 8, opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Calculating...' : '🔢 Simulate Risk (Dry Run)'}
            </button>
            <button
              onClick={handleEvaluate}
              disabled={loading}
              style={{
                width: '100%', padding: '11px', borderRadius: 9, cursor: 'pointer',
                background: 'linear-gradient(135deg, #b45309, #f59e0b)',
                border: 'none', color: '#000', fontWeight: 700, fontSize: 13,
                opacity: loading ? 0.6 : 1
              }}
            >
              💾 Evaluate + Save to DB
            </button>
          </div>

          {/* Mode reference card */}
          <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Decision Modes Reference
            </div>
            {[
              ['0–30',  'NORMAL',     'No intervention — standard operations'],
              ['31–60', 'INCENTIVE',  '₹15/order bonus to keep workers active'],
              ['61–80', 'PROTECTION', '₹200 guaranteed + ₹50/hr downtime'],
              ['81–100','CRITICAL',   'Zone paused — ₹75/hr downtime only'],
            ].map(([range, m, desc]) => (
              <div key={m} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 0', borderBottom: '1px solid #1e2d45'
              }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                  color: MODE_META[m].color, minWidth: 48
                }}>{range}</span>
                <div>
                  <ModeBadge mode={m} />
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Results Panel ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Score gauge + result */}
          {simResult && !simResult.error && (
            <div style={{
              background: '#0f1520', border: `1px solid ${mMeta.border}`,
              borderRadius: 14, padding: 24
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'center' }}>
                <RiskGauge score={simResult.riskScore} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                    {simResult.decision?.emoji} {simResult.decision?.label}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                    {simResult.decision?.description}
                  </div>

                  {/* Component breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['🌧️ Weather',       simResult.components?.weatherScore,    '#60a5fa'],
                      ['👷 Worker Shortage', simResult.components?.workerShortage, '#f59e0b'],
                      ['📦 Demand Surge',   simResult.components?.demandSurge,    '#a855f7'],
                      ['⚖️ Regulatory',     simResult.components?.regulatoryRisk, '#ef4444'],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{
                        padding: '10px 12px', borderRadius: 8,
                        background: `${color}10`, border: `1px solid ${color}25`
                      }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color }}>{val ?? '—'}</div>
                        <div style={{ fontSize: 10, color: '#334155' }}>/ 100 weighted</div>
                      </div>
                    ))}
                  </div>

                  {/* Financial params */}
                  {simResult.decision && (
                    <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {simResult.decision.bonusPerOrder > 0 && (
                        <div style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.1)',
                          color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
                          💰 ₹{simResult.decision.bonusPerOrder}/order bonus
                        </div>
                      )}
                      {simResult.decision.guaranteedMin > 0 && (
                        <div style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.1)',
                          color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                          🛡️ ₹{simResult.decision.guaranteedMin} guaranteed min
                        </div>
                      )}
                      {simResult.decision.downtimeRate > 0 && (
                        <div style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(59,130,246,0.1)',
                          color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
                          ⏱️ ₹{simResult.decision.downtimeRate}/hr downtime
                        </div>
                      )}
                      {simResult.decision.safeguardApplied && (
                        <div style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                          ⚠️ Pool safeguard active
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compensation button */}
                  {simResult.riskScore > 30 && (
                    <button
                      onClick={handleCompensation}
                      disabled={compLoading}
                      style={{
                        marginTop: 16, padding: '10px 20px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                        color: '#f59e0b', fontWeight: 700, fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {compLoading ? '⏳ Calculating...' : '🧮 Calculate Worker Compensation →'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {simResult?.error && (
            <div style={{ padding: 20, borderRadius: 12, background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              ❌ {simResult.error}
            </div>
          )}

          {/* Compensation results */}
          {compResult && !compResult.error && (
            <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🧮 Compensation Results</div>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
                Mode: <ModeBadge mode={compResult.summary?.mode} /> &nbsp;
                Total Payout: <strong style={{ color: '#f59e0b' }}>₹{compResult.summary?.totalPayout}</strong>
              </div>

              {compResult.eligible?.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 8 }}>
                    ✅ Eligible Workers ({compResult.eligible.length})
                  </div>
                  {compResult.eligible.map((w, i) => (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{w.workerName}</span>
                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>₹{w.amount}</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>
                        Type: {w.type} | {w.reason?.split('—')[0]?.trim()}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {compResult.ineligible?.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginTop: 12, marginBottom: 8 }}>
                    ❌ Ineligible Workers ({compResult.ineligible.length})
                  </div>
                  {compResult.ineligible.map((w, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                      fontSize: 12, color: '#94a3b8'
                    }}>
                      <strong>{w.workerName}</strong>: {w.reason}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Zone DB risk table */}
          {zoneRisks.length > 0 && (
            <div className="table-card">
              <div className="table-header">
                <span>Live Zone Risk Scores (from DB)</span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                  {zoneRisks.length} zones evaluated
                </span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>City</th>
                    <th>Risk Score</th>
                    <th>Mode</th>
                    <th>Weather</th>
                    <th>Shortage</th>
                    <th>Demand</th>
                    <th>Evaluated</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRisks.map(z => (
                    <tr key={z.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{z.zoneId}</td>
                      <td>{z.city}</td>
                      <td>
                        <span style={{
                          fontWeight: 800, fontSize: 16,
                          color: z.riskScore <= 30 ? '#10b981' : z.riskScore <= 60 ? '#f59e0b'
                               : z.riskScore <= 80 ? '#f97316' : '#ef4444'
                        }}>{z.riskScore}</span>
                      </td>
                      <td><ModeBadge mode={z.decisionMode} /></td>
                      <td>{z.weatherScore}</td>
                      <td>{z.workerShortage}</td>
                      <td>{z.demandSurge}</td>
                      <td style={{ color: '#64748b', fontSize: 11 }}>
                        {new Date(z.timestamp).toLocaleTimeString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state pre-simulation */}
          {!simResult && zoneRisks.length === 0 && (
            <div className="empty" style={{ marginTop: 0 }}>
              <div className="empty-icon">🧠</div>
              <div>Adjust the sliders and click <strong>Simulate Risk</strong> to see the engine in action.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
