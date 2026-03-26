// SimulatePage.jsx — The demo control panel
// This page lets you trigger a disruption simulation
// directly from the dashboard without needing Thunder Client.
// It calls POST /api/simulate-disruption and shows the result.

import { useState } from 'react'
import axios from 'axios'
import { workers } from '../data/mockWorkers'

export default function SimulatePage() {
  // Which worker is selected in the dropdown
  const [selectedWorker, setSelectedWorker] = useState(workers[0])

  // Simulation parameters (these match the API body)
  const [rainfall,      setRainfall]      = useState(42)
  const [workerStatus,  setWorkerStatus]  = useState('online')
  const [onlineMinutes, setOnlineMinutes] = useState(60)
  const [completions,   setCompletions]   = useState(0)
  const [hoursLost,     setHoursLost]     = useState(2)

  // The result JSON from the API
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // Called when the user presses the "Simulate" button
  async function handleSimulate() {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await axios.post('/api/simulate-disruption', {
        workerHash:           selectedWorker.hash,
        zone:                 selectedWorker.zone,
        rainfall_mm_hr:       Number(rainfall),
        workerStatus:         workerStatus,
        onlineMinutes:        Number(onlineMinutes),
        completions_last_hour: Number(completions),
        hoursLost:            Number(hoursLost)
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Determine the outcome color from the result
  const approved = result?.simulation?.gateDecision?.payoutStatus === 'approved'

  return (
    <div>
      <div className="page-header">
        <h2>🌧️ Simulate Disruption</h2>
        <p>Trigger the full Gate 1 → Gate 2 → Fraud Check pipeline from this panel</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* ── LEFT: Input Controls ─────────────────────────── */}
        <div className="table-card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 20 }}>Simulation Parameters</div>

          {/* Worker selector */}
          <label style={labelStyle}>Select Worker</label>
          <select
            style={inputStyle}
            onChange={e => setSelectedWorker(workers[e.target.value])}
          >
            {workers.map((w, i) => (
              <option key={i} value={i}>{w.name} — {w.city} (zone {w.zone})</option>
            ))}
          </select>

          {/* Rainfall slider */}
          <label style={labelStyle}>
            Rainfall: <strong style={{ color: rainfall >= 35 ? '#ef4444' : '#10b981' }}>
              {rainfall}mm/hr
            </strong>
            {rainfall >= 35
              ? ' ✅ Triggers Gate 1'
              : ' ❌ Below 35mm threshold'}
          </label>
          <input type="range" min="0" max="80" value={rainfall}
            onChange={e => setRainfall(e.target.value)} style={{ width: '100%' }} />

          {/* Worker status */}
          <label style={labelStyle}>Worker Status</label>
          <select style={inputStyle} value={workerStatus}
            onChange={e => setWorkerStatus(e.target.value)}>
            <option value="online">Online (active)</option>
            <option value="on_delivery">On Delivery</option>
            <option value="offline">Offline</option>
          </select>

          {/* Online minutes */}
          <label style={labelStyle}>Online Minutes During Disruption: <strong>{onlineMinutes}</strong></label>
          <input type="range" min="0" max="120" value={onlineMinutes}
            onChange={e => setOnlineMinutes(e.target.value)} style={{ width: '100%' }} />

          {/* Completions */}
          <label style={labelStyle}>Completions Last Hour: <strong>{completions}</strong></label>
          <input type="range" min="0" max="6" value={completions}
            onChange={e => setCompletions(e.target.value)} style={{ width: '100%' }} />

          {/* Hours lost */}
          <label style={labelStyle}>Hours Lost: <strong>{hoursLost}h</strong></label>
          <input type="range" min="1" max="8" value={hoursLost}
            onChange={e => setHoursLost(e.target.value)} style={{ width: '100%' }} />

          {/* Submit button */}
          <button
            onClick={handleSimulate}
            disabled={loading}
            style={btnStyle}
          >
            {loading ? 'Running Simulation...' : '⚡ Run Simulation'}
          </button>
        </div>

        {/* ── RIGHT: Result Panel ───────────────────────────── */}
        <div className="table-card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 20 }}>Result</div>

          {!result && !error && (
            <div className="empty">Adjust parameters and click "Run Simulation"</div>
          )}

          {error && (
            <div style={{ color: '#ef4444', padding: 16, background: 'rgba(239,68,68,.1)',
              borderRadius: 8 }}>
              ❌ Error: {error}
            </div>
          )}

          {result && (
            <div>
              {/* Big outcome banner */}
              <div style={{
                padding: '20px',
                borderRadius: 8,
                textAlign: 'center',
                marginBottom: 20,
                background: approved
                  ? 'rgba(16,185,129,.15)'
                  : 'rgba(239,68,68,.15)',
              }}>
                <div style={{ fontSize: 32 }}>{approved ? '✅' : '❌'}</div>
                <div style={{
                  fontSize: 20, fontWeight: 700, marginTop: 8,
                  color: approved ? '#10b981' : '#ef4444'
                }}>
                  {approved ? 'CLAIM APPROVED' : 'CLAIM REJECTED'}
                </div>
                {approved && (
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>
                    ₹{result.simulation?.gateDecision?.payoutAmount}
                  </div>
                )}
              </div>

              {/* Gate breakdown */}
              {result.simulation?.gateDecision && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ResultRow
                    label="Gate 1 (Rainfall)"
                    pass={result.simulation.gateDecision.gate1?.triggered}
                    reason={result.simulation.gateDecision.gate1?.reason}
                  />
                  <ResultRow
                    label="Gate 2 (Activity)"
                    pass={result.simulation.gateDecision.gate2?.validated}
                    reason={result.simulation.gateDecision.gate2?.reason}
                  />
                  <ResultRow
                    label="Fraud Check"
                    pass={result.simulation.gateDecision.payoutStatus !== 'duplicate_rejected'}
                    reason={result.simulation.gateDecision.fraudReason || 'All fraud checks passed'}
                  />
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                    Premium paid: {result.simulation?.premiumAmount}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Small helper component to render a pass/fail row in the results
function ResultRow({ label, pass, reason }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 8,
      background: pass ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
      border: `1px solid ${pass ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <span>{pass ? '✅' : '❌'}</span>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{reason}</div>
    </div>
  )
}

// Shared inline styles to keep the form inputs consistent
const labelStyle = { display: 'block', color: '#94a3b8', fontSize: 12,
  marginBottom: 6, marginTop: 16 }

const inputStyle = {
  width: '100%', padding: '8px 12px', background: '#0f1117',
  border: '1px solid #2d3147', borderRadius: 6, color: '#f1f5f9',
  fontSize: 13, outline: 'none'
}

const btnStyle = {
  marginTop: 24, width: '100%', padding: '12px',
  background: '#f59e0b', border: 'none', borderRadius: 8,
  color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer'
}
