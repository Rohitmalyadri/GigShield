// ─────────────────────────────────────────────────────────
// APP MONITOR — Live disruption alerts + payout notification
// ─────────────────────────────────────────────────────────
// THE KEY DEMO SCREEN. Connected to WebSocket.
// Shows real-time events as cards that slide in:
// 🌧️ Disruption → ⚡ Gate 1 → ✅ Gate 2 → 🔍 Fraud → 💸 Payout
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'

// Connect via Vite's WebSocket proxy (same origin = port 5173)
// This works on BOTH localhost (laptop) and the judge's phone via WiFi.
// Vite proxies /socket.io → localhost:4000 automatically.
const BACKEND = `http://${window.location.hostname}:5173`
const socket = io(BACKEND, {
  path: '/socket.io',
  reconnectionDelay: 1000,
  reconnectionAttempts: 20,
  timeout: 5000
})

export default function AppMonitor() {
  const navigate = useNavigate()
  const [events,    setEvents]    = useState([])
  const [payout,    setPayout]    = useState(null)
  const [connected, setConnected] = useState(false)
  const [zone]                    = useState(
    sessionStorage.getItem('RouteSafe Insurance_worker_zone') || '560034'
  )
  const [city]                    = useState(
    sessionStorage.getItem('RouteSafe Insurance_worker_city') || 'Bangalore'
  )
  const workerName = sessionStorage.getItem('RouteSafe Insurance_worker_name') || 'Partner'
  const shiftStart = new Date()

  // ── WEBSOCKET EVENTS ──────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    const addEvent = (type, icon, title, desc, color) => {
      setEvents(prev => [...prev, {
        id: Date.now() + Math.random(),
        type, icon, title, desc, color,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }])
    }

    socket.on('disruption_generated', (payload) => {
      addEvent('disruption', '🌧️', 'Disruption Detected',
        `Heavy rainfall detected in zone ${payload.data?.zone || zone}. RouteSafe Insurance monitoring activated.`,
        '#EF4444')
    })

    socket.on('gate1_result', (payload) => {
      const passed = payload.data?.triggered !== false
      addEvent('gate1', '⚡', 'Weather Validation',
        passed
          ? `Confirmed: Rainfall exceeds 35mm/hr threshold in your zone. Claim auto-filed.`
          : `Weather conditions do not meet threshold. Monitoring continues.`,
        passed ? '#F59E0B' : '#6B7280')
    })

    socket.on('gate2_result', (payload) => {
      const passed = payload.data?.validated !== false
      addEvent('gate2', '✅', 'Activity Verified',
        passed
          ? `Confirmed: You were online and active during the disruption. Deliveries impacted.`
          : `Activity verification incomplete.`,
        passed ? '#10B981' : '#6B7280')
    })

    socket.on('fraud_result', (payload) => {
      const passed = payload.data?.isDuplicate === false && payload.data?.isSpoofed === false
      addEvent('fraud', '🔍', 'Security Check',
        passed
          ? `All fraud checks passed. No duplicate claim. GPS verified. Proceeding to payout.`
          : payload.data?.isDuplicate
            ? 'Duplicate claim detected — one payout per disruption event.'
            : 'Security check flagged. Under review.',
        passed ? '#10B981' : '#EF4444')
    })

    socket.on('payout_fired', (payload) => {
      const amt = payload.data?.amount || 0
      setPayout(payload.data)
      addEvent('payout', '💸', 'Payout Credited!',
        `₹${amt} has been credited to your ${city} account. Transaction confirmed.`,
        '#10B981')
    })

    socket.on('llm_narration', (payload) => {
      if (payload.data?.text) {
        addEvent('ai', '🤖', 'RouteSafe Insurance AI',
          payload.data.text,
          '#6366F1')
      }
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('disruption_generated')
      socket.off('gate1_result')
      socket.off('gate2_result')
      socket.off('fraud_result')
      socket.off('payout_fired')
      socket.off('llm_narration')
    }
  }, [zone, city])

  return (
    <div style={s.page}>

      {/* ── SHIFT STATUS BAR ────────────────────────── */}
      <div style={s.shiftBar}>
        <div style={s.shiftLeft}>
          <div style={{
            ...s.statusDot,
            background: connected ? '#10B981' : '#EF4444'
          }} />
          <div>
            <div style={s.shiftTitle}>
              {connected ? '🟢 Shift Active' : '🔴 Reconnecting...'}
            </div>
            <div style={s.shiftSub}>
              {workerName} · {city} · Zone {zone}
            </div>
          </div>
        </div>
        <div style={s.shiftTime}>
          Since {shiftStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* ── ZONE WEATHER STATUS ──────────────────────── */}
      <div style={{
        ...s.weatherCard,
        background: events.some(e => e.type === 'disruption')
          ? 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)'
          : 'linear-gradient(135deg, #065F46 0%, #064E3B 100%)'
      }}>
        <div style={s.weatherIcon}>
          {events.some(e => e.type === 'disruption') ? '🌧️' : '☀️'}
        </div>
        <div>
          <div style={s.weatherTitle}>
            {events.some(e => e.type === 'disruption')
              ? 'Heavy Rainfall Detected'
              : 'Weather Clear'}
          </div>
          <div style={s.weatherSub}>
            Zone {zone} · {city}
          </div>
        </div>
        <div style={s.weatherBadge}>
          {events.some(e => e.type === 'disruption') ? '⚠️ ALERT' : '✓ Safe'}
        </div>
      </div>

      {/* ── PAYOUT CARD (appears after payout) ───────── */}
      {payout && (
        <div style={s.payoutCard}>
          <div style={s.payoutIcon}>💸</div>
          <div style={s.payoutAmount}>₹{payout.amount}</div>
          <div style={s.payoutLabel}>Credited to your account</div>
          <div style={s.payoutBreakdown}>
            <div style={s.breakdownRow}>
              <span>Avg hourly earnings</span>
              <span style={{ fontWeight: 600 }}>₹{payout.avgHourlyRate || Math.round(payout.amount / (payout.hoursLost || 2) / 0.75)}/hr</span>
            </div>
            <div style={s.breakdownRow}>
              <span>Hours lost</span>
              <span style={{ fontWeight: 600 }}>{payout.hoursLost || 2}h</span>
            </div>
            <div style={s.breakdownRow}>
              <span>Payout rate</span>
              <span style={{ fontWeight: 600, color: '#10B981' }}>75%</span>
            </div>
            <div style={{ ...s.breakdownRow, borderTop: '1px solid #D1FAE5', paddingTop: 8 }}>
              <span style={{ fontWeight: 700 }}>Total credited</span>
              <span style={{ fontWeight: 800, color: '#065F46', fontSize: 16 }}>₹{payout.amount}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/claims')}
            style={s.viewClaimsBtn}
          >
            View Claim Details →
          </button>
        </div>
      )}

      {/* ── EVENT FEED ───────────────────────────────── */}
      <div style={s.feedSection}>
        <div style={s.feedTitle}>Live Activity</div>
        {events.length === 0 ? (
          <div style={s.emptyFeed}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1C' }}>
              RouteSafe Insurance is monitoring your zone
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, lineHeight: 1.6 }}>
              If a disruption affects your earnings,<br />
              we'll notify you instantly and process<br />
              your payout automatically.
            </div>
          </div>
        ) : (
          <div style={s.eventList}>
            {[...events].reverse().map((e, i) => (
              <div key={e.id} style={{
                ...s.eventCard,
                borderLeftColor: e.color,
                animation: i === 0 ? 'slideIn 0.4s ease-out' : undefined
              }}>
                <div style={s.eventTop}>
                  <span style={{ fontSize: 18 }}>{e.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={s.eventTitle}>{e.title}</div>
                    <div style={s.eventTime}>{e.time}</div>
                  </div>
                </div>
                <div style={s.eventDesc}>{e.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────
const s = {
  page: { padding: '0 0 24px', background: '#F7F7F7', minHeight: '100%' },

  shiftBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', background: '#fff', marginBottom: 8
  },
  shiftLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  shiftTitle: { fontSize: 14, fontWeight: 700, color: '#1C1C1C' },
  shiftSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  shiftTime: { fontSize: 12, color: '#9CA3AF', fontWeight: 500 },

  weatherCard: {
    margin: '0 16px 10px', borderRadius: 14, padding: '16px',
    display: 'flex', alignItems: 'center', gap: 12, color: '#fff'
  },
  weatherIcon: { fontSize: 32 },
  weatherTitle: { fontSize: 15, fontWeight: 700 },
  weatherSub: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  weatherBadge: {
    marginLeft: 'auto', fontSize: 12, fontWeight: 700,
    background: 'rgba(255,255,255,0.2)', padding: '4px 12px',
    borderRadius: 20
  },

  payoutCard: {
    margin: '0 16px 10px', background: '#ECFDF5',
    border: '1.5px solid #10B981', borderRadius: 16,
    padding: '20px 16px', textAlign: 'center'
  },
  payoutIcon: { fontSize: 36, marginBottom: 4 },
  payoutAmount: { fontSize: 40, fontWeight: 800, color: '#065F46' },
  payoutLabel: { fontSize: 14, color: '#047857', fontWeight: 600, marginTop: 4 },
  payoutBreakdown: {
    background: '#D1FAE5', borderRadius: 12, padding: '14px 16px',
    margin: '16px 0 12px', display: 'flex', flexDirection: 'column', gap: 8,
    textAlign: 'left'
  },
  breakdownRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 13, color: '#065F46'
  },
  viewClaimsBtn: {
    width: '100%', padding: '12px 0', borderRadius: 10,
    border: '1.5px solid #10B981', background: '#fff',
    color: '#047857', fontSize: 14, fontWeight: 700, cursor: 'pointer'
  },

  feedSection: { margin: '0 16px' },
  feedTitle: {
    fontSize: 14, fontWeight: 700, color: '#1C1C1C', marginBottom: 12
  },
  emptyFeed: {
    background: '#fff', borderRadius: 14, padding: '32px 20px',
    textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
  },
  eventList: { display: 'flex', flexDirection: 'column', gap: 8 },
  eventCard: {
    background: '#fff', borderRadius: 12, padding: '14px 16px',
    borderLeft: '4px solid', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
  },
  eventTop: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  eventTitle: { fontSize: 14, fontWeight: 700, color: '#1C1C1C' },
  eventTime: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  eventDesc: { fontSize: 13, color: '#4B5563', lineHeight: 1.5, paddingLeft: 28 }
}
