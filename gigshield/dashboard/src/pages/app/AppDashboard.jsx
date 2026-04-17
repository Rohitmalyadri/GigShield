// ─────────────────────────────────────────────────────────
// APP DASHBOARD — Earnings + Coverage + Start Shift
// ─────────────────────────────────────────────────────────
// Shows after registration. Worker profile with earnings,
// active policy card, and the big "Start Shift" button.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function AppDashboard() {
  const navigate = useNavigate()
  const [worker,   setWorker]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [shifting, setShifting] = useState(false)
  const [shiftOn,  setShiftOn]  = useState(false)
  const [shiftTime, setShiftTime] = useState(null)

  const workerHash = sessionStorage.getItem('gigshield_worker_hash')
  const workerName = sessionStorage.getItem('gigshield_worker_name') || 'Delivery Partner'

  useEffect(() => {
    if (!workerHash) {
      navigate('/app/register')
      return
    }
    axios.get(`/api/worker/${workerHash}`)
      .then(r => {
        setWorker(r.data.worker)
        setShiftOn(r.data.worker.isActive)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workerHash, navigate])

  async function handleStartShift() {
    setShifting(true)
    try {
      await axios.post('/api/start-shift', { workerHash })
      setShiftOn(true)
      setShiftTime(new Date())
      // Navigate to monitor after a brief animation
      setTimeout(() => navigate('/app/monitor'), 1200)
    } catch (err) {
      console.error('Start shift failed:', err)
    } finally {
      setShifting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading profile...</div>
  }

  if (!worker) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#6B7280' }}>Profile not found</div>
        <button
          onClick={() => navigate('/app/register')}
          style={{ marginTop: 16, padding: '10px 24px', background: '#E23744', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
        >
          Register Now
        </button>
      </div>
    )
  }

  const policy = worker.activePolicy
  const earnings = worker.weeklyEarningsHistory || []
  const lastWeek = earnings[earnings.length - 1] || 0
  const trend = earnings.length >= 2
    ? ((earnings[earnings.length - 1] - earnings[earnings.length - 2]) / earnings[earnings.length - 2] * 100).toFixed(0)
    : 0

  return (
    <div style={s.page}>

      {/* ── PROFILE HEADER ──────────────────────────── */}
      <div style={s.profileHeader}>
        <div style={s.avatar}>{workerName.charAt(0).toUpperCase()}</div>
        <div>
          <div style={s.profileName}>{workerName}</div>
          <div style={s.profileSub}>{worker.city} · Zone {worker.zone} · {(worker.platforms || []).join(' + ')}</div>
        </div>
        {shiftOn && (
          <div style={s.onlineBadge}>● Online</div>
        )}
      </div>

      {/* ── EARNINGS CARD ───────────────────────────── */}
      <div style={s.card}>
        <div style={s.cardLabel}>WEEKLY EARNINGS</div>
        <div style={s.earningsRow}>
          <div>
            <div style={s.bigNum}>₹{worker.avgWeeklyEarnings?.toLocaleString()}</div>
            <div style={s.subText}>12-week average</div>
          </div>
          <div style={s.trendBox}>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Last week</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1C' }}>
              ₹{lastWeek.toLocaleString()}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: trend >= 0 ? '#10B981' : '#EF4444'
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          </div>
        </div>

        {/* Mini earnings chart (simple bars) */}
        <div style={s.chartRow}>
          {earnings.slice(-8).map((val, i) => {
            const max = Math.max(...earnings.slice(-8))
            const h = max > 0 ? (val / max) * 48 : 4
            return (
              <div key={i} style={s.chartCol}>
                <div style={{
                  ...s.chartBar,
                  height: h,
                  background: i === earnings.slice(-8).length - 1 ? '#E23744' : '#E5E7EB'
                }} />
                <div style={s.chartLabel}>W{earnings.length - 7 + i}</div>
              </div>
            )
          })}
        </div>

        <div style={s.hourlyRow}>
          <span style={{ color: '#6B7280' }}>Avg hourly rate</span>
          <span style={{ fontWeight: 700, color: '#1C1C1C' }}>₹{worker.avgHourlyEarnings}/hr</span>
        </div>
      </div>

      {/* ── RouteSafe Insurance COVERAGE CARD ─────────────────── */}
      <div style={{ ...s.card, border: '1.5px solid #10B981' }}>
        <div style={s.coverHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1C' }}>RouteSafe Insurance Coverage</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Parametric Wage Protection</div>
            </div>
          </div>
          <div style={s.activeBadge}>● Active</div>
        </div>

        <div style={s.coverDetails}>
          <div style={s.coverRow}>
            <span style={s.coverLabel}>Weekly Premium</span>
            <span style={s.coverValue}>₹{worker.calculatedPremium}/wk</span>
          </div>
          {policy && (
            <>
              <div style={s.coverRow}>
                <span style={s.coverLabel}>Coverage Period</span>
                <span style={s.coverValue}>
                  {new Date(policy.weekStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {new Date(policy.weekEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              </div>
              <div style={s.coverRow}>
                <span style={s.coverLabel}>Premium Status</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>✓ Paid</span>
              </div>
            </>
          )}
          <div style={s.coverRow}>
            <span style={s.coverLabel}>Payout Rate</span>
            <span style={{ color: '#E23744', fontWeight: 700 }}>75% of lost income</span>
          </div>
          <div style={s.coverRow}>
            <span style={s.coverLabel}>Zone Risk</span>
            <span style={{ fontWeight: 600, color: getRiskColor(worker.city) }}>
              {getRiskLabel(worker.city)}
            </span>
          </div>
        </div>

        <div style={s.coverFooter}>
          Auto-payout · Zero paperwork · AI-validated claims
        </div>
      </div>

      {/* ── START SHIFT BUTTON ──────────────────────── */}
      <button
        onClick={shiftOn ? () => navigate('/app/monitor') : handleStartShift}
        disabled={shifting}
        style={{
          ...s.shiftBtn,
          background: shiftOn
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #E23744 0%, #C62833 100%)'
        }}
      >
        <span style={{ fontSize: 28 }}>{shiftOn ? '🟢' : '🎯'}</span>
        <span style={s.shiftText}>
          {shifting ? 'Starting...' : shiftOn ? 'Shift Active — View Monitor' : 'Start Shift'}
        </span>
        <span style={s.shiftSub}>
          {shiftOn ? `Online since ${(shiftTime || new Date()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Tap to go online and enable RouteSafe Insurance monitoring'}
        </span>
      </button>

    </div>
  )
}

function getRiskColor(city) {
  if (city === 'Mumbai') return '#EF4444'
  if (city === 'Bangalore') return '#F59E0B'
  return '#10B981'
}
function getRiskLabel(city) {
  if (city === 'Mumbai') return '🔴 High (Flood zone)'
  if (city === 'Bangalore') return '🟡 Medium'
  return '🟢 Low'
}

// ── STYLES ────────────────────────────────────────────────
const s = {
  page: { padding: '0 0 24px', background: '#F7F7F7' },

  profileHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px', background: '#fff', marginBottom: 8
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%',
    background: '#E23744', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700
  },
  profileName: { fontSize: 17, fontWeight: 700, color: '#1C1C1C' },
  profileSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  onlineBadge: {
    marginLeft: 'auto', fontSize: 12, fontWeight: 700,
    color: '#10B981', background: '#ECFDF5',
    padding: '4px 10px', borderRadius: 20
  },

  card: {
    margin: '0 16px 10px', background: '#fff', borderRadius: 16,
    padding: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)'
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: '#9CA3AF',
    letterSpacing: 1, marginBottom: 12
  },

  earningsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  bigNum: { fontSize: 28, fontWeight: 800, color: '#1C1C1C' },
  subText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  trendBox: { textAlign: 'right' },

  chartRow: {
    display: 'flex', alignItems: 'flex-end', gap: 6,
    padding: '16px 0 8px', borderBottom: '1px solid #F3F4F6', marginBottom: 10
  },
  chartCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  chartBar: { width: '100%', borderRadius: 4, minHeight: 4 },
  chartLabel: { fontSize: 9, color: '#9CA3AF' },
  hourlyRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 14, paddingTop: 4
  },

  coverHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14
  },
  activeBadge: {
    fontSize: 12, fontWeight: 700, color: '#10B981',
    background: '#ECFDF5', padding: '4px 10px', borderRadius: 20
  },
  coverDetails: { display: 'flex', flexDirection: 'column', gap: 10 },
  coverRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14 },
  coverLabel: { color: '#6B7280' },
  coverValue: { color: '#1C1C1C', fontWeight: 600 },
  coverFooter: {
    fontSize: 12, color: '#6B7280', textAlign: 'center',
    marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6'
  },

  shiftBtn: {
    width: 'calc(100% - 32px)', margin: '8px 16px', padding: '20px 16px',
    borderRadius: 16, border: 'none', color: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(226,55,68,0.3)'
  },
  shiftText: { fontSize: 18, fontWeight: 700 },
  shiftSub: { fontSize: 12, opacity: 0.85 }
}
