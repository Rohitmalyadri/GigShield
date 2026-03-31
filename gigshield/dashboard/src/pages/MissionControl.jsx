// ─────────────────────────────────────────────────────────
// MISSION CONTROL — MissionControl.jsx
// ─────────────────────────────────────────────────────────
// The single full-screen demo page. Dark theme.
// Layout: 3 columns + top bar + bottom bar
// Real-time updates via Socket.io WebSocket connection.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

// Connect to the backend WebSocket server
const socket = io('http://localhost:4000', {
  reconnectionDelay: 3000,   // Retry every 3 seconds if disconnected
  reconnectionAttempts: 20
})

// ── ZONE DATA (static config for the 3 demo cities) ──────
const ZONES = [
  { zone: '560034', city: 'Bangalore', flag: '🌆' },
  { zone: '400053', city: 'Mumbai',    flag: '🌊' },
  { zone: '110001', city: 'Delhi',     flag: '🏛️' }
]

// Ravi's worker hash (pre-computed SHA-256 of '9876543210')
const RAVI_HASH = '7619ee8cea49187f309616e30ecf54be072259b43760f1f550a644945d5572f2'

// ── EVENT COLOR MAP ──────────────────────────────────────
function getEventStyle(eventName) {
  const map = {
    worker_online:       { color: '#60a5fa', icon: '🟢' },  // Blue
    disruption_generated:{ color: '#c084fc', icon: '🌧️' }, // Purple
    gate1_result:        { color: '#fbbf24', icon: '⚡' },  // Yellow
    gate2_result:        { color: '#fbbf24', icon: '✅' },  // Yellow
    fraud_result:        { color: '#f87171', icon: '🔍' },  // Red/Green
    payout_fired:        { color: '#4ade80', icon: '💸' },  // Green
    llm_narration:       { color: '#94a3b8', icon: '🤖' },  // Gray
    anomaly_detected:    { color: '#f97316', icon: '⚠️' }   // Orange
  }
  return map[eventName] || { color: '#94a3b8', icon: '📡' }
}

// ── FORMATTERS ────────────────────────────────────────────
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function formatEventLabel(event) {
  const labels = {
    worker_online:       'Worker came online',
    disruption_generated:'AI generated disruption',
    gate1_result:        'Gate 1 evaluated',
    gate2_result:        'Gate 2 evaluated',
    fraud_result:        'Fraud check complete',
    payout_fired:        'Payout processed',
    llm_narration:       'AI narrator',
    anomaly_detected:    'Anomaly detected'
  }
  return labels[event] || event
}

// ═══════════════════════════════════════════════════════════
// MISSION CONTROL COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MissionControl() {
  // Live event feed (array of event objects, newest first)
  const [events, setEvents]           = useState([])
  // AI narration history (newest first)
  const [narrations, setNarrations]   = useState([])
  // Latest payout (for the payout card animation)
  const [latestPayout, setLatestPayout] = useState(null)
  // Zone states (green/yellow/red per city)
  const [zoneStates, setZoneStates]   = useState({
    '560034': 'normal',   // Bangalore
    '400053': 'normal',   // Mumbai
    '110001': 'normal'    // Delhi
  })
  // Active workers currently online
  const [activeWorkers, setActiveWorkers] = useState([])
  // Live clock
  const [clock, setClock]             = useState(new Date())
  // WebSocket connection status
  const [connected, setConnected]     = useState(false)
  // QR code image URL
  const [qrSrc]                       = useState(
    `http://localhost:4000/api/qr/${RAVI_HASH}`
  )
  // Whether payout card is animating
  const [payoutFlash, setPayoutFlash] = useState(false)

  const feedRef = useRef(null)  // Reference to the event feed div for scrolling

  // ── CLOCK — updates every second ──────────────────────
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── FETCH INITIAL WORKERS from REST API ───────────────
  useEffect(() => {
    fetch('http://localhost:4000/api/workers')
      .then(r => r.json())
      .then(data => {
        if (data.success) setActiveWorkers(data.workers)
      })
      .catch(() => {})
  }, [])

  // ── WEBSOCKET EVENTS ──────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    // Helper: add an event to the top of the feed
    const addEvent = (eventName, payload) => {
      const entry = {
        id:        Date.now() + Math.random(),
        event:     eventName,
        timestamp: payload.timestamp || new Date().toISOString(),
        data:      payload.data || payload
      }
      setEvents(prev => [entry, ...prev].slice(0, 50)) // Keep last 50 events
    }

    // Handle each event type
    socket.on('worker_online', (payload) => {
      addEvent('worker_online', payload)
      // Mark zone as active
      if (payload.data?.zone) {
        setZoneStates(prev => ({ ...prev, [payload.data.zone]: 'active' }))
      }
      // Refresh worker list
      fetch('http://localhost:4000/api/workers')
        .then(r => r.json())
        .then(d => d.success && setActiveWorkers(d.workers))
        .catch(() => {})
    })

    socket.on('disruption_generated', (payload) => {
      addEvent('disruption_generated', payload)
      if (payload.data?.zone) {
        setZoneStates(prev => ({ ...prev, [payload.data.zone]: 'disruption' }))
      }
    })

    socket.on('gate1_result', (payload) => addEvent('gate1_result', payload))
    socket.on('gate2_result', (payload) => addEvent('gate2_result', payload))

    socket.on('fraud_result', (payload) => {
      addEvent('fraud_result', payload)
    })

    socket.on('payout_fired', (payload) => {
      addEvent('payout_fired', payload)
      setLatestPayout(payload.data || payload)
      // Trigger green flash animation on the payout card
      setPayoutFlash(true)
      setTimeout(() => setPayoutFlash(false), 3000)
    })

    socket.on('llm_narration', (payload) => {
      // Add narration to narrator panel
      const entry = {
        id:        Date.now() + Math.random(),
        text:      payload.data?.text || payload.text || '',
        forEvent:  payload.data?.forEvent || '',
        timestamp: payload.timestamp || new Date().toISOString()
      }
      if (entry.text) {
        setNarrations(prev => [entry, ...prev].slice(0, 10))
      }
    })

    socket.on('anomaly_detected', (payload) => addEvent('anomaly_detected', payload))

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('worker_online')
      socket.off('disruption_generated')
      socket.off('gate1_result')
      socket.off('gate2_result')
      socket.off('fraud_result')
      socket.off('payout_fired')
      socket.off('llm_narration')
      socket.off('anomaly_detected')
    }
  }, [])

  // Zone status color helper
  const zoneColor = (state) => {
    if (state === 'disruption') return '#ef4444'
    if (state === 'active')     return '#22c55e'
    return '#64748b'
  }

  const zoneLabel = (state) => {
    if (state === 'disruption') return '🔴 DISRUPTION'
    if (state === 'active')     return '🟢 Active'
    return '⚪ Monitoring'
  }

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div style={styles.root}>

      {/* ═══ TOP BAR ════════════════════════════════════ */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <span style={styles.topBarTitle}>GigShield Mission Control</span>
        </div>
        <div style={styles.topBarCenter}>
          <span style={{
            ...styles.liveDot,
            background: connected ? '#22c55e' : '#ef4444'
          }} />
          <span style={{ color: connected ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 13 }}>
            {connected ? 'LIVE' : 'RECONNECTING'}
          </span>
        </div>
        <div style={styles.topBarRight}>
          {clock.toLocaleTimeString('en-IN')}
        </div>
      </div>

      {/* ═══ MAIN 3-COLUMN AREA ═════════════════════════ */}
      <div style={styles.columns}>

        {/* ── LEFT COLUMN — Zone Status ───────────────── */}
        <div style={styles.leftCol}>
          <div style={styles.colHeader}>Zone Status</div>
          {ZONES.map(z => (
            <div key={z.zone} style={{
              ...styles.zoneCard,
              borderColor: zoneColor(zoneStates[z.zone])
            }}>
              <div style={styles.zoneTop}>
                <span style={{ fontSize: 18 }}>{z.flag}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{z.city}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: zoneColor(zoneStates[z.zone])
                }}>
                  {zoneLabel(zoneStates[z.zone])}
                </span>
              </div>
              <div style={styles.zoneDetail}>Zone: {z.zone}</div>
              <div style={styles.zoneDetail}>
                Workers: {activeWorkers.filter(w => w.zone === z.zone).length} enrolled
              </div>
            </div>
          ))}
        </div>

        {/* ── MIDDLE COLUMN — Live Event Feed ─────────── */}
        <div style={styles.midCol}>
          <div style={styles.colHeader}>
            Live Event Feed
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
              {events.length} events
            </span>
          </div>
          <div style={styles.feedScroll} ref={feedRef}>
            {events.length === 0 ? (
              <div style={styles.emptyFeed}>
                Waiting for events...<br />
                <span style={{ fontSize: 12, color: '#475569' }}>
                  Scan the QR code or run a simulation to start
                </span>
              </div>
            ) : (
              events.map(e => {
                const style = getEventStyle(e.event)
                return (
                  <div key={e.id} style={styles.feedItem}>
                    <span style={{ color: '#64748b', fontSize: 11, minWidth: 70 }}>
                      [{formatTime(e.timestamp)}]
                    </span>
                    <span style={{ fontSize: 14 }}>{style.icon}</span>
                    <span style={{ color: style.color, fontSize: 13 }}>
                      {formatEventLabel(e.event)}
                      {e.data?.rainfall_mm_hr ? ` — ${e.data.rainfall_mm_hr}mm/hr` : ''}
                      {e.data?.amount ? ` — ₹${e.data.amount}` : ''}
                      {e.data?.reason ? ` — ${e.data.reason}` : ''}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN — AI Narrator ───────────────── */}
        <div style={styles.rightCol}>
          <div style={styles.colHeader}>
            <span>🤖 GigShield AI</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>Gemini · Qwen Fallback</span>
          </div>
          {narrations.length === 0 ? (
            <div style={styles.emptyNarration}>
              AI narrator will appear here once events start firing...
            </div>
          ) : (
            narrations.map((n, i) => (
              <div key={n.id} style={{
                ...styles.narrationItem,
                opacity: i === 0 ? 1 : 0.45,
                fontSize: i === 0 ? 15 : 12,
                borderLeft: i === 0
                  ? '3px solid #2E86C1'
                  : '2px solid #1e293b'
              }}>
                {n.text}
              </div>
            ))
          )}
        </div>

      </div>

      {/* ═══ BOTTOM BAR ═════════════════════════════════ */}
      <div style={styles.bottomBar}>

        {/* Bottom Left — QR Code */}
        <div style={styles.bottomSection}>
          <div style={styles.bottomLabel}>Scan to Register as Ravi</div>
          <img
            src={qrSrc}
            alt="Worker check-in QR code"
            style={styles.qrImage}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
            {RAVI_HASH.substring(0, 16)}...
          </div>
        </div>

        {/* Bottom Center — Active Workers */}
        <div style={styles.bottomSection}>
          <div style={styles.bottomLabel}>Enrolled Workers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            {activeWorkers.slice(0, 3).map(w => (
              <div key={w.id} style={styles.workerCard}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: w.isActive ? '#22c55e' : '#64748b',
                  display: 'inline-block'
                }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{w.city}</span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>
                  ₹{w.calculatedPremium || Math.round(w.currentWeeklyPremium)}/wk
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {(w.platforms || []).join(' + ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Right — Payout Card */}
        <div style={styles.bottomSection}>
          <div style={styles.bottomLabel}>Latest Payout</div>
          {latestPayout ? (
            <div style={{
              ...styles.payoutCard,
              background: payoutFlash
                ? 'rgba(34,197,94,0.25)'
                : 'rgba(34,197,94,0.08)',
              borderColor: '#22c55e',
              transform: payoutFlash ? 'scale(1.03)' : 'scale(1)',
              transition: 'all 0.5s ease'
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e' }}>
                ₹{latestPayout.amount}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>
                Zone {latestPayout.zone} · {latestPayout.hoursLost}h lost
              </div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                Credited to platform wallet ✓
              </div>
            </div>
          ) : (
            <div style={styles.payoutCard}>
              <div style={{ color: '#475569', fontSize: 13, textAlign: 'center' }}>
                Payout will appear here<br />after a successful claim
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// STYLES — all inline for zero CSS file dependency
// ═══════════════════════════════════════════════════════════
const styles = {
  root: {
    background: '#0f172a',
    color: '#f1f5f9',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden'
  },
  // Top bar
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 24px',
    background: '#0a0f1e',
    borderBottom: '1px solid #1e293b',
    height: 52
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  topBarTitle: { fontWeight: 700, fontSize: 16, letterSpacing: 0.5 },
  topBarCenter: { display: 'flex', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 10, height: 10, borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  topBarRight: { color: '#64748b', fontSize: 14, fontVariantNumeric: 'tabular-nums' },
  // Columns
  columns: {
    display: 'flex',
    flex: 1,
    gap: 0,
    overflow: 'hidden',
    minHeight: 0
  },
  leftCol: {
    width: '22%',
    borderRight: '1px solid #1e293b',
    padding: '16px 14px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  midCol: {
    flex: 1,
    borderRight: '1px solid #1e293b',
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  rightCol: {
    width: '30%',
    padding: '16px 14px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  colHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  // Zone cards
  zoneCard: {
    background: '#1e293b',
    borderRadius: 10,
    padding: '12px 14px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  zoneTop: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  zoneDetail: { color: '#64748b', fontSize: 12, marginTop: 2 },
  // Event feed
  feedScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  feedItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    background: '#0f172a',
    border: '1px solid #1e293b',
    fontSize: 12,
    lineHeight: 1.4
  },
  emptyFeed: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 2
  },
  // Narration
  narrationItem: {
    background: '#0f172a',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#e2e8f0',
    lineHeight: 1.6,
    transition: 'opacity 0.4s ease'
  },
  emptyNarration: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 1.8
  },
  // Bottom bar
  bottomBar: {
    display: 'flex',
    borderTop: '1px solid #1e293b',
    background: '#0a0f1e',
    height: 190
  },
  bottomSection: {
    flex: 1,
    padding: '12px 16px',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    overflowY: 'auto'
  },
  bottomLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    alignSelf: 'flex-start'
  },
  qrImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    border: '2px solid #1e293b'
  },
  workerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#1e293b',
    borderRadius: 8,
    padding: '6px 10px',
    width: '100%'
  },
  payoutCard: {
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    textAlign: 'center'
  }
}
