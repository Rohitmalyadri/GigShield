// ─────────────────────────────────────────────────────────
// APP REGISTER — Worker registration flow
// ─────────────────────────────────────────────────────────
// 2-step form: Details → Premium Preview → Confirm
// Calls POST /api/register then redirects to dashboard.
// Stores workerHash in sessionStorage for other pages.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const CITY_ZONES = {
  Bangalore: ['560034', '560001', '560008'],
  Mumbai:    ['400053', '400001', '400012'],
  Delhi:     ['110001', '110002', '110020']
}

export default function AppRegister() {
  const navigate = useNavigate()

  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [city,     setCity]     = useState('Bangalore')
  const [zone,     setZone]     = useState('560034')
  const [platforms, setPlatforms] = useState(['zomato'])  // multi-select array
  const [step,     setStep]     = useState(1)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [preview,  setPreview]  = useState(null)

  useEffect(() => { setZone(CITY_ZONES[city][0]) }, [city])

  // Fetch premium preview on step 2
  useEffect(() => {
    if (step === 2) {
      axios.get(`/api/premium-preview?city=${city}&zone=${zone}`)
        .then(r => setPreview(r.data.estimatedPremium))
        .catch(() => setPreview('--'))
    }
  }, [step, city, zone])

  function togglePlatform(p) {
    setPlatforms(prev =>
      prev.includes(p)
        ? prev.length > 1 ? prev.filter(x => x !== p) : prev  // keep at least 1
        : [...prev, p]
    )
  }

  function goToPreview() {
    if (!name.trim()) return setError('Enter your name')
    if (!/^\d{10}$/.test(phone)) return setError('Enter a valid 10-digit phone number')
    if (platforms.length === 0) return setError('Select at least one platform')
    setError('')
    setStep(2)
  }

  async function handleRegister() {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/register', {
        name: name.trim(),
        phone: phone.trim(),
        city,
        zone,
        platforms
      })
      // Save identity to sessionStorage for other mobile pages
      sessionStorage.setItem('gigshield_worker_hash', res.data.worker.workerHash)
      sessionStorage.setItem('gigshield_worker_city', city)
      sessionStorage.setItem('gigshield_worker_name', name.trim())
      sessionStorage.setItem('gigshield_worker_zone', zone)
      // Go to dashboard
      navigate('/app/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed'
      if (msg.includes('already registered')) {
        // Worker exists — save the hash and go to dashboard
        const hash = err.response?.data?.workerHash
        if (hash) {
          sessionStorage.setItem('gigshield_worker_hash', hash)
          sessionStorage.setItem('gigshield_worker_city', city)
          sessionStorage.setItem('gigshield_worker_name', name.trim())
          sessionStorage.setItem('gigshield_worker_zone', zone)
          navigate('/app/dashboard')
          return
        }
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Earnings based on city (for preview) ──────────────
  const cityEarnings = { Bangalore: '₹9,500', Mumbai: '₹7,200', Delhi: '₹3,800' }
  const cityRisk     = { Bangalore: 'Medium', Mumbai: 'High',    Delhi: 'Low' }
  const riskColor    = { Bangalore: '#F59E0B', Mumbai: '#EF4444', Delhi: '#10B981' }

  return (
    <div style={s.page}>

      {/* ── STEP INDICATOR ─────────────────────────── */}
      <div style={s.steps}>
        <div style={{ ...s.stepDot, background: '#E23744' }}>1</div>
        <div style={{ ...s.stepLine, background: step >= 2 ? '#E23744' : '#E5E7EB' }} />
        <div style={{ ...s.stepDot, background: step >= 2 ? '#E23744' : '#D1D5DB' }}>2</div>
      </div>

      {/* ── STEP 1: DETAILS ────────────────────────── */}
      {step === 1 && (
        <div style={s.formCard}>
          <div style={s.cardTitle}>Enable RouteSafe Insurance Protection</div>
          <div style={s.cardSub}>Fill in your details to get started</div>

          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <input
              style={s.input}
              placeholder="e.g. Ravi Kumar"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Phone Number</label>
            <input
              style={s.input}
              placeholder="10-digit mobile"
              value={phone}
              maxLength={10}
              inputMode="numeric"
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>City</label>
            <select style={s.input} value={city} onChange={e => setCity(e.target.value)}>
              {Object.keys(CITY_ZONES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Delivery Zone</label>
            <select style={s.input} value={zone} onChange={e => setZone(e.target.value)}>
              {(CITY_ZONES[city] || []).map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Platform <span style={{ color: '#9CA3AF', textTransform: 'none', fontWeight: 400 }}>(select all that apply)</span></label>
            <div style={s.platformRow}>
              {[{ id: 'zomato', label: 'Zomato', emoji: '🍕', color: '#E23744', bg: '#FEE2E5' },
                { id: 'swiggy', label: 'Swiggy', emoji: '🛵', color: '#FC8019', bg: '#FFF3E6' }]
                .map(p => {
                  const selected = platforms.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      style={{
                        ...s.platBtn,
                        background: selected ? p.bg : '#F9FAFB',
                        borderColor: selected ? p.color : '#E5E7EB',
                        color:       selected ? p.color : '#6B7280',
                        position: 'relative',
                      }}
                    >
                      {selected && (
                        <span style={{
                          position: 'absolute', top: 6, right: 8,
                          fontSize: 10, fontWeight: 800, color: p.color
                        }}>✓</span>
                      )}
                      {p.emoji} {p.label}
                    </button>
                  )
                })
              }
            </div>
            {platforms.length === 2 && (
              <div style={{ fontSize: 11, color: '#10B981', marginTop: 6, fontWeight: 600 }}>
                ✓ Multi-platform — both selected
              </div>
            )}
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button onClick={goToPreview} style={s.primaryBtn}>
            See My Premium →
          </button>
        </div>
      )}

      {/* ── STEP 2: PREMIUM PREVIEW ────────────────── */}
      {step === 2 && (
        <div style={s.formCard}>
          <div style={s.cardTitle}>Your Coverage Plan</div>
          <div style={s.cardSub}>Review before activating</div>

          {/* Premium big number */}
          <div style={s.premiumBox}>
            <div style={s.premLabel}>WEEKLY PREMIUM</div>
            <div style={s.premAmount}>
              ₹{preview || '...'}<span style={s.premUnit}>/week</span>
            </div>
            <div style={s.premNote}>
              Auto-deducted from your {platforms.join(' + ')} earnings
            </div>
          </div>

          {/* Details grid */}
          <div style={s.detailsCard}>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Name</span>
              <span style={s.detailValue}>{name}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Platform(s)</span>
              <span style={s.detailValue}>{platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ')}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>City / Zone</span>
              <span style={s.detailValue}>{city} — {zone}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Avg Weekly Earnings</span>
              <span style={s.detailValue}>{cityEarnings[city]}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Zone Risk Level</span>
              <span style={{ ...s.detailValue, color: riskColor[city], fontWeight: 700 }}>
                {cityRisk[city]}
              </span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Payout Rate</span>
              <span style={{ ...s.detailValue, color: '#10B981', fontWeight: 700 }}>75%</span>
            </div>
          </div>

          {/* Coverage items */}
          <div style={s.coverageBox}>
            {['Heavy rainfall (>35mm/hr)',
              'Zone suspensions by platform',
              'Civic disruptions & anomalies',
              'Zero paperwork · Auto-payout'].map(item => (
              <div key={item} style={s.coverItem}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {error && <div style={s.error}>{error}</div>}

          <div style={s.btnRow}>
            <button onClick={() => setStep(1)} style={s.backBtn}>← Back</button>
            <button
              onClick={handleRegister}
              disabled={loading}
              style={{ ...s.primaryBtn, flex: 1 }}
            >
              {loading ? 'Activating...' : 'Activate Protection ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────
const s = {
  page: { padding: '16px', minHeight: '100%', background: '#F7F7F7' },

  steps: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 0, marginBottom: 20, padding: '0 40px'
  },
  stepDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0
  },
  stepLine: { flex: 1, height: 3, borderRadius: 2 },

  formCard: {
    background: '#fff', borderRadius: 16, padding: '20px 18px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
  },
  cardTitle: { fontSize: 18, fontWeight: 700, color: '#1C1C1C' },
  cardSub: { fontSize: 13, color: '#6B7280', marginTop: 2, marginBottom: 18 },

  field: { marginBottom: 14 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#6B7280', marginBottom: 4, textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #E5E7EB', fontSize: 15, color: '#1C1C1C',
    background: '#F9FAFB', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif'
  },
  platformRow: { display: 'flex', gap: 10 },
  platBtn: {
    flex: 1, padding: '12px 0', borderRadius: 10,
    border: '2px solid', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', background: '#F9FAFB'
  },
  error: {
    background: '#FEE2E5', color: '#E23744', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginBottom: 12, fontWeight: 500
  },
  primaryBtn: {
    width: '100%', padding: '14px 0', borderRadius: 12,
    border: 'none', background: '#E23744', color: '#fff',
    fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8
  },

  // Step 2
  premiumBox: {
    textAlign: 'center', padding: '20px 0 16px',
    borderBottom: '1px solid #F3F4F6', marginBottom: 16
  },
  premLabel: {
    fontSize: 11, fontWeight: 700, color: '#9CA3AF',
    letterSpacing: 1, marginBottom: 6
  },
  premAmount: { fontSize: 40, fontWeight: 800, color: '#E23744' },
  premUnit: { fontSize: 16, fontWeight: 500, color: '#9CA3AF' },
  premNote: { fontSize: 12, color: '#6B7280', marginTop: 6 },

  detailsCard: {
    background: '#F9FAFB', borderRadius: 12, padding: '14px 16px',
    marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10
  },
  detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14 },
  detailLabel: { color: '#6B7280' },
  detailValue: { color: '#1C1C1C', fontWeight: 600 },

  coverageBox: {
    display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14
  },
  coverItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 14, color: '#374151'
  },

  btnRow: { display: 'flex', gap: 10, marginTop: 8 },
  backBtn: {
    padding: '14px 18px', borderRadius: 12,
    border: '1.5px solid #E5E7EB', background: '#fff',
    color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer'
  }
}
