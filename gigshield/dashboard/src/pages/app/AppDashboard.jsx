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

      {/* ── PROFILE HERO ─────────────────────────────── */}
      <div style={s.profileHero}>
        <div style={s.profileHeroBg} />
        <div style={s.profileHeroContent}>
          <div style={s.avatar}>
            {workerName.charAt(0).toUpperCase()}
            {shiftOn && <div style={s.avatarRing} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.profileName}>{workerName}</div>
            <div style={s.profileSub}>
              {worker.city} · Zone {worker.zone} · {(worker.platforms || []).join(' + ')}
            </div>
          </div>
          {shiftOn ? (
            <div style={s.onlineBadge}>
              <span style={s.onlineDot} />Online
            </div>
          ) : (
            <div style={s.offlineBadge}>Offline</div>
          )}
        </div>
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
      <div style={{ padding: '4px 16px 8px' }}>
        <button
          onClick={shiftOn ? () => navigate('/app/monitor') : handleStartShift}
          disabled={shifting}
          style={{
            ...s.shiftBtn,
            background: shiftOn
              ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
              : 'linear-gradient(135deg, #E23744 0%, #B31D29 100%)'
          }}
        >
          <div style={s.shiftIconWrap}>
            <span style={{ fontSize: 30 }}>{shiftOn ? '🟢' : '🛵'}</span>
            {shiftOn && <div style={s.pulseRing} />}
          </div>
          <span style={s.shiftText}>
            {shifting ? 'Starting...' : shiftOn ? 'Shift Active' : 'Start Shift'}
          </span>
          <span style={s.shiftSub}>
            {shiftOn
              ? `Online · tap to view live monitor`
              : 'Tap to go online · RouteSafe protection activates'}
          </span>
        </button>
      </div>

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
  page: { background: '#F4F4F7', paddingBottom: 16 },

  profileHero: {
    background: 'linear-gradient(135deg, #1C1C2E 0%, #2D1F2F 100%)',
    padding: '20px 16px 20px', position: 'relative', overflow: 'hidden',
    marginBottom: 12,
  },
  profileHeroBg: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: '50%',
    background: 'rgba(226,55,68,0.12)',
  },
  profileHeroContent: {
    display: 'flex', alignItems: 'center', gap: 14, position: 'relative',
  },
  avatar: {
    width: 50, height: 50, borderRadius: '50%',
    background: 'linear-gradient(135deg, #E23744, #B31D29)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 800, flexShrink: 0, position: 'relative',
    boxShadow: '0 4px 12px rgba(226,55,68,0.4)',
  },
  avatarRing: {
    position: 'absolute', inset: -4, borderRadius: '50%',
    border: '2px solid rgba(16,185,129,0.6)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  profileName: { fontSize: 17, fontWeight: 700, color: '#fff' },
  profileSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  onlineBadge: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 12, fontWeight: 700, color: '#10B981',
    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
    padding: '5px 12px', borderRadius: 20,
  },
  onlineDot: {
    width: 7, height: 7, borderRadius: '50%', background: '#10B981',
    display: 'inline-block', boxShadow: '0 0 8px #10B981',
  },
  offlineBadge: {
    marginLeft: 'auto', fontSize: 12, fontWeight: 600,
    color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)',
    padding: '5px 12px', borderRadius: 20,
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
    width: '100%', padding: '22px 16px 18px',
    borderRadius: 18, border: 'none', color: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(226,55,68,0.35)',
  },
  shiftIconWrap: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute', inset: -8, borderRadius: '50%',
    border: '2px solid rgba(16,185,129,0.5)',
  },
  shiftText: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  shiftSub: { fontSize: 12, opacity: 0.8, textAlign: 'center', lineHeight: 1.5 },
}
