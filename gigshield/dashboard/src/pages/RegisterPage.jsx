// ─────────────────────────────────────────────────────────
// REGISTER PAGE — RegisterPage.jsx
// ─────────────────────────────────────────────────────────
// Simulates what the Swiggy / Zomato partner app shows
// when a delivery worker enables RouteSafe Insurance coverage.
// Design: Embedded card inside the platform's app UI.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import axios from 'axios'

// Platform brand colours — used throughout the UI
const PLATFORMS = {
  zomato: { label: 'Zomato', color: '#E23744', bg: 'rgba(226,55,68,0.12)', logo: '🍕' },
  swiggy: { label: 'Swiggy', color: '#FC8019', bg: 'rgba(252,128,25,0.12)', logo: '🛵' }
}

// Cities and their zone codes
const CITY_ZONES = {
  Bangalore: ['560034', '560001', '560008', '560038'],
  Mumbai:    ['400053', '400001', '400012', '400070'],
  Delhi:     ['110001', '110002', '110020', '110092']
}

export default function RegisterPage() {
  // ── FORM STATE ─────────────────────────────────────────
  const [name,           setName]           = useState('')
  const [phone,          setPhone]          = useState('')
  const [city,           setCity]           = useState('Bangalore')
  const [zone,           setZone]           = useState('560034')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['zomato'])
  const [step,           setStep]           = useState(1)   // 1=form, 2=preview, 3=success
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [preview,        setPreview]        = useState(null)  // Premium estimate
  const [result,         setResult]         = useState(null)  // Success response

  // Active platform for styling (first selected, or zomato default)
  const activePlatform = selectedPlatforms[0] || 'zomato'
  const brand = PLATFORMS[activePlatform]

  // ── Update zone when city changes ─────────────────────
  useEffect(() => {
    setZone(CITY_ZONES[city][0])
  }, [city])

  // ── Fetch premium preview when city/zone ready ────────
  useEffect(() => {
    if (step === 2 && city && zone) {
      axios.get(`/api/premium-preview?city=${city}&zone=${zone}`)
        .then(r => setPreview(r.data.estimatedPremium))
        .catch(() => setPreview(null))
    }
  }, [step, city, zone])

  // ── Toggle platform selection ─────────────────────────
  function togglePlatform(p) {
    setSelectedPlatforms(prev =>
      prev.includes(p)
        ? prev.filter(x => x !== p)      // Remove if already selected
        : [...prev, p]                    // Add if not selected
    )
  }

  // ── Step 1 → 2: Validate then show preview ────────────
  function handleContinue() {
    if (!name.trim())
      return setError('Please enter your name')
    if (!/^\d{10}$/.test(phone.trim()))
      return setError('Enter a valid 10-digit phone number')
    if (selectedPlatforms.length === 0)
      return setError('Select at least one platform')
    setError('')
    setStep(2)
  }

  // ── Step 2 → 3: Submit registration ──────────────────
  async function handleRegister() {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/register', {
        name,
        phone:     phone.trim(),
        city,
        zone,
        platforms: selectedPlatforms
      })
      setResult(res.data)
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Reset to register another ─────────────────────────
  function handleReset() {
    setName(''); setPhone(''); setCity('Bangalore')
    setZone('560034'); setSelectedPlatforms(['zomato'])
    setStep(1); setResult(null); setError('')
  }

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {/* ── PAGE HEADER ─────────────────────────────── */}
      <div className="page-header">
        <h2>📲 Worker Registration</h2>
        <p>Simulates the RouteSafe Insurance opt-in screen embedded inside the partner app</p>
      </div>

      <div style={s.layout}>

        {/* ── LEFT: PHONE MOCKUP ─────────────────────── */}
        <div style={s.phoneWrap}>
          <div style={s.phoneBg}>

            {/* Platform header bar */}
            <div style={{ ...s.platformBar, background: brand.color }}>
              <span style={{ fontSize: 18 }}>{brand.logo}</span>
              <span style={s.platformName}>{brand.label} Partner</span>
              <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 'auto' }}>⚙ Settings</span>
            </div>

            {/* RouteSafe Insurance card inside platform app */}
            <div style={s.phoneContent}>

              {/* Shield header */}
              <div style={{ ...s.shieldHeader, borderColor: brand.color }}>
                <div style={{ fontSize: 28 }}>🛡️</div>
                <div>
                  <div style={s.shieldTitle}>RouteSafe Insurance</div>
                  <div style={s.shieldSub}>Income Disruption Protection</div>
                </div>
                <div style={{ ...s.liveChip, background: brand.bg, color: brand.color }}>
                  NEW
                </div>
              </div>

              {/* Steps indicator */}
              <div style={s.stepRow}>
                {['Details', 'Preview', 'Covered'].map((label, i) => (
                  <div key={label} style={s.stepItem}>
                    <div style={{
                      ...s.stepDot,
                      background: step > i ? brand.color : step === i + 1 ? brand.color : '#1e293b',
                      border: `2px solid ${step >= i + 1 ? brand.color : '#334155'}`
                    }}>
                      {step > i + 1 ? '✓' : i + 1}
                    </div>
                    <div style={{ ...s.stepLabel, color: step === i + 1 ? brand.color : '#64748b' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── STEP 1: Form ─────────────────────── */}
              {step === 1 && (
                <div style={s.formSection}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Full Name</label>
                    <input
                      style={s.input}
                      placeholder="e.g. Ravi Kumar"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>Phone Number</label>
                    <input
                      style={s.input}
                      placeholder="10-digit mobile number"
                      value={phone}
                      maxLength={10}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                    <div style={s.hint}>Used to create your unique RouteSafe Insurance ID (SHA-256 hashed)</div>
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>City</label>
                    <select
                      style={s.input}
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    >
                      {Object.keys(CITY_ZONES).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>Delivery Zone (Pin Code)</label>
                    <select
                      style={s.input}
                      value={zone}
                      onChange={e => setZone(e.target.value)}
                    >
                      {(CITY_ZONES[city] || []).map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>Active Platforms</label>
                    <div style={s.platformRow}>
                      {Object.entries(PLATFORMS).map(([key, p]) => (
                        <button
                          key={key}
                          onClick={() => togglePlatform(key)}
                          style={{
                            ...s.platformBtn,
                            background: selectedPlatforms.includes(key)
                              ? p.bg : 'transparent',
                            border: `2px solid ${selectedPlatforms.includes(key) ? p.color : '#334155'}`,
                            color: selectedPlatforms.includes(key) ? p.color : '#64748b'
                          }}
                        >
                          {p.logo} {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <div style={s.error}>{error}</div>}

                  <button
                    onClick={handleContinue}
                    style={{ ...s.primaryBtn, background: brand.color }}
                  >
                    Preview My Coverage →
                  </button>
                </div>
              )}

              {/* ── STEP 2: Premium Preview ──────────── */}
              {step === 2 && (
                <div style={s.formSection}>
                  <div style={s.previewCard}>
                    <div style={s.previewTitle}>Your Coverage Summary</div>

                    <div style={s.previewRow}>
                      <span style={s.previewLabel}>Name</span>
                      <span style={s.previewValue}>{name}</span>
                    </div>
                    <div style={s.previewRow}>
                      <span style={s.previewLabel}>City / Zone</span>
                      <span style={s.previewValue}>{city} — {zone}</span>
                    </div>
                    <div style={s.previewRow}>
                      <span style={s.previewLabel}>Platforms</span>
                      <span style={s.previewValue}>
                        {selectedPlatforms.map(p => PLATFORMS[p].label).join(' + ')}
                      </span>
                    </div>
                    <div style={{ ...s.previewRow, borderTop: `1px solid #334155`, marginTop: 8, paddingTop: 8 }}>
                      <span style={s.previewLabel}>Zone Risk</span>
                      <span style={{ ...s.previewValue, color: '#fbbf24' }}>
                        {city === 'Mumbai' ? '🔴 High (1.4×)' : city === 'Bangalore' ? '🟡 Medium (1.1×)' : '🟢 Low (0.8×)'}
                      </span>
                    </div>
                    <div style={s.premiumBig}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>WEEKLY PREMIUM</div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: brand.color }}>
                        ₹{preview || '...'}
                        <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>/week</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Auto-deducted from your {selectedPlatforms.map(p => PLATFORMS[p].label).join('/')} earnings
                      </div>
                    </div>
                  </div>

                  <div style={s.coverageList}>
                    {['Income disruption from rainfall > 35mm/hr',
                      'Zone suspension by platform',
                      'Mass anomaly / civic disruption',
                      '75% income replacement — zero paperwork'].map(item => (
                      <div key={item} style={s.coverageItem}>
                        <span style={{ color: brand.color }}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  {error && <div style={s.error}>{error}</div>}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setStep(1)} style={s.secondaryBtn}>
                      ← Back
                    </button>
                    <button
                      onClick={handleRegister}
                      disabled={loading}
                      style={{ ...s.primaryBtn, background: brand.color, flex: 1 }}
                    >
                      {loading ? 'Registering...' : `Activate Protection ✓`}
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Success ──────────────────── */}
              {step === 3 && result && (
                <div style={{ ...s.formSection, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
                  <div style={{ ...s.shieldTitle, fontSize: 20, marginBottom: 4 }}>
                    You're Protected!
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                    {name} · {city} · Zone {zone}
                  </div>

                  <div style={{
                    background: brand.bg, border: `1px solid ${brand.color}`,
                    borderRadius: 12, padding: '16px 20px', marginBottom: 16, textAlign: 'left'
                  }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>
                      POLICY ACTIVATED
                    </div>
                    <div style={s.previewRow}>
                      <span style={s.previewLabel}>Weekly Premium</span>
                      <span style={{ fontWeight: 700, color: brand.color }}>
                        ₹{result.worker.weeklyPremium}/wk
                      </span>
                    </div>
                    <div style={s.previewRow}>
                      <span style={s.previewLabel}>Coverage Ends</span>
                      <span style={s.previewValue}>
                        {new Date(result.policy.weekEndDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div style={s.previewRow}>
                      <span style={s.previewLabel}>RouteSafe Insurance ID</span>
                      <span style={{ ...s.previewValue, fontFamily: 'monospace', fontSize: 11 }}>
                        {result.worker.workerHash.substring(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div style={s.qrHint}>
                    Scan QR on your first shift to activate live monitoring
                  </div>

                  <button
                    onClick={handleReset}
                    style={{ ...s.primaryBtn, background: brand.color, marginTop: 12 }}
                  >
                    Register Another Worker
                  </button>
                </div>
              )}

            </div>{/* end phoneContent */}
          </div>{/* end phoneBg */}
        </div>{/* end phoneWrap */}

        {/* ── RIGHT: EXPLANATION PANEL ───────────────── */}
        <div style={s.rightPanel}>
          <div style={s.infoCard}>
            <div style={s.infoTitle}>How This Works</div>

            <div style={s.infoStep}>
              <div style={{ ...s.infoNum, background: brand.color }}>1</div>
              <div>
                <div style={s.infoStepTitle}>Platform Embeds RouteSafe Insurance</div>
                <div style={s.infoStepDesc}>
                  Workers see this opt-in screen inside Zomato / Swiggy partner app.
                  No separate download needed.
                </div>
              </div>
            </div>

            <div style={s.infoStep}>
              <div style={{ ...s.infoNum, background: brand.color }}>2</div>
              <div>
                <div style={s.infoStepTitle}>SHA-256 Identity Hashing</div>
                <div style={s.infoStepDesc}>
                  Phone number → SHA-256 hash = unique RouteSafe Insurance token.
                  Works across Zomato + Swiggy simultaneously — no double payout.
                </div>
              </div>
            </div>

            <div style={s.infoStep}>
              <div style={{ ...s.infoNum, background: brand.color }}>3</div>
              <div>
                <div style={s.infoStepTitle}>Dynamic ML Premium</div>
                <div style={s.infoStepDesc}>
                  Premium = 12-week trailing avg × 0.75% × zone risk score.
                  Mumbai pays more (flood zone); Delhi pays less (dry zone).
                </div>
              </div>
            </div>

            <div style={s.infoStep}>
              <div style={{ ...s.infoNum, background: brand.color }}>4</div>
              <div>
                <div style={s.infoStepTitle}>Zero-Touch Coverage</div>
                <div style={s.infoStepDesc}>
                  Worker scans QR on shift start. If disruption hits their zone,
                  payout fires automatically. No claim form. No waiting.
                </div>
              </div>
            </div>
          </div>

          <div style={s.infoCard}>
            <div style={s.infoTitle}>Try It Now</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
              Use these phone numbers to register test workers:
            </div>
            {[
              { name: 'Ravi Kumar',   phone: '9876543210', city: 'Bangalore' },
              { name: 'Priya Sharma', phone: '9123456780', city: 'Mumbai' },
              { name: 'Arjun Mehta', phone: '9988776655', city: 'Delhi' }
            ].map(w => (
              <div
                key={w.phone}
                onClick={() => {
                  setName(w.name); setPhone(w.phone)
                  setCity(w.city); setZone(CITY_ZONES[w.city][0])
                  setStep(1); setError('')
                }}
                style={s.sampleWorker}
              >
                <span style={{ fontWeight: 600 }}>{w.name}</span>
                <span style={{ color: brand.color, fontSize: 12 }}>{w.phone}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{w.city}</span>
              </div>
            ))}
          </div>
        </div>

      </div>{/* end layout */}
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────
const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' },
  layout: { display: 'flex', gap: 24, padding: '0 0 24px', flex: 1, flexWrap: 'wrap' },

  // Phone mockup
  phoneWrap: { minWidth: 340, maxWidth: 400, flex: 1 },
  phoneBg: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  platformBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', color: '#fff', fontWeight: 600
  },
  platformName: { fontSize: 15, fontWeight: 700 },
  phoneContent: { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 },

  // Shield header
  shieldHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#1e293b', borderRadius: 12, padding: '12px 14px',
    border: '1px solid'
  },
  shieldTitle: { fontWeight: 800, fontSize: 16, color: '#f1f5f9' },
  shieldSub:   { fontSize: 11, color: '#64748b', marginTop: 2 },
  liveChip: {
    fontSize: 10, fontWeight: 700, padding: '3px 8px',
    borderRadius: 20, letterSpacing: 1, marginLeft: 'auto'
  },

  // Steps
  stepRow: { display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff'
  },
  stepLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 0.5 },

  // Form
  formSection: { display: 'flex', flexDirection: 'column', gap: 12 },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: 4 },
  label:       { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' },
  hint:        { fontSize: 10, color: '#475569', marginTop: 2 },
  input: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
    padding: '9px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box'
  },
  platformRow: { display: 'flex', gap: 8 },
  platformBtn: {
    flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
    fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
  },
  error: {
    background: 'rgba(239,68,68,0.1)', color: '#f87171',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '8px 12px', fontSize: 13
  },
  primaryBtn: {
    padding: '12px 0', borderRadius: 10, border: 'none',
    color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
    width: '100%', letterSpacing: 0.3
  },
  secondaryBtn: {
    padding: '12px 16px', borderRadius: 10,
    border: '1px solid #334155', background: 'transparent',
    color: '#94a3b8', fontWeight: 600, cursor: 'pointer'
  },

  // Preview
  previewCard: {
    background: '#1e293b', borderRadius: 12, padding: '16px 14px',
    display: 'flex', flexDirection: 'column', gap: 8
  },
  previewTitle: { fontWeight: 700, fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewRow:   { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
  previewLabel: { color: '#64748b' },
  previewValue: { fontWeight: 600, color: '#f1f5f9' },
  premiumBig:   { textAlign: 'center', padding: '12px 0 4px' },
  coverageList: { display: 'flex', flexDirection: 'column', gap: 6 },
  coverageItem: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#94a3b8', lineHeight: 1.4 },
  qrHint: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 1.6 },

  // Right panel
  rightPanel: { flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 },
  infoCard: {
    background: '#0f172a', border: '1px solid #1e293b',
    borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16
  },
  infoTitle: { fontWeight: 700, fontSize: 14, color: '#f1f5f9' },
  infoStep:  { display: 'flex', gap: 12, alignItems: 'flex-start' },
  infoNum: {
    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 2
  },
  infoStepTitle: { fontWeight: 600, fontSize: 13, color: '#f1f5f9', marginBottom: 4 },
  infoStepDesc:  { fontSize: 12, color: '#64748b', lineHeight: 1.6 },
  sampleWorker: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#1e293b', borderRadius: 8, padding: '10px 12px',
    cursor: 'pointer', border: '1px solid #334155',
    justifyContent: 'space-between', fontSize: 13
  }
}
