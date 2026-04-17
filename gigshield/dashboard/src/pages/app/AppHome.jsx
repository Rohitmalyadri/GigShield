// ─────────────────────────────────────────────────────────
// APP HOME — Premium worker home screen (upgraded)
// ─────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AppHome() {
  const navigate   = useNavigate()
  const savedHash  = sessionStorage.getItem('gigshield_worker_hash')
  const savedName  = sessionStorage.getItem('gigshield_worker_name') || null
  const savedCity  = sessionStorage.getItem('gigshield_worker_city') || 'Bangalore'

  // Animate earnings counter
  const [earnings,  setEarnings]  = useState(0)
  const [orders,    setOrders]    = useState(0)
  const [hours,     setHours]     = useState(0)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
    const t1 = setTimeout(() => animateValue(setEarnings, 0, 1240, 1200), 300)
    const t2 = setTimeout(() => animateValue(setOrders, 0, 14, 900), 400)
    const t3 = setTimeout(() => animateValue(setHours, 0, 6, 700), 500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div style={s.page}>

      {/* ── HERO BANNER ──────────────────────────────── */}
      <div style={s.hero}>
        <div style={s.heroGradient} />
        <div style={s.heroContent}>
          <div style={s.greeting}>
            {savedName
              ? <><span style={s.wave}>👋</span> Hey, {savedName.split(' ')[0]}!</>
              : <><span style={s.wave}>👋</span> {getGreeting()}</>
            }
          </div>
          <div style={s.heroSub}>
            {savedHash ? 'Your coverage is active' : 'Ready to start delivering?'}
          </div>

          {/* Coverage status chip */}
          {savedHash ? (
            <div style={s.activeChip}>
              <span style={s.activeDot} />
              Income protection active · {savedCity}
            </div>
          ) : (
            <div style={s.inactiveChip}>
              ⚠️ No coverage — tap below to activate
            </div>
          )}
        </div>

        {/* Decorative shield */}
        <div style={s.heroShield}>
          <svg viewBox="0 0 60 70" width="60" opacity="0.15">
            <path d="M30 2L6 14v22C6 50 17 62 30 68C43 62 54 50 54 36V14L30 2Z"
              fill="#fff" stroke="#fff" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      {/* ── TODAY STATS ──────────────────────────────── */}
      <div style={s.statsSection}>
        <div style={s.statsLabel}>TODAY</div>
        <div style={s.statsRow}>
          <StatCard label="Earnings" value={`₹${earnings.toLocaleString()}`} color="#1C1C1C" />
          <StatCard label="Orders" value={orders} color="#1C1C1C" />
          <StatCard label="Hours" value={`${hours}h`} color="#1C1C1C" />
        </div>
      </div>

      {/* ── PROTECTION CARD ──────────────────────────── */}
      <div style={s.section}>
        <div style={{
          ...s.promoCard,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.5s ease 0.2s',
        }}>
          {/* Card header */}
          <div style={s.cardHeader}>
            <div style={s.cardHeaderLeft}>
              <div style={s.shieldIcon}>
                <svg viewBox="0 0 24 24" width="20" fill="none">
                  <path d="M12 3L4 7V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V7L12 3Z"
                    fill="rgba(226,55,68,0.15)" stroke="#E23744" strokeWidth="2"/>
                  <path d="M9 12L11 14L15 10" stroke="#E23744" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={s.cardTitle}>Income Disruption Cover</div>
                <div style={s.cardSub}>by RouteSafe Insurance</div>
              </div>
            </div>
            <div style={s.newBadge}>NEW</div>
          </div>

          {/* Features */}
          <div style={s.featureGrid}>
            {[
              { icon: '🌧️', text: '75% income replacement during rain/flood' },
              { icon: '⚡', text: 'Auto-payout — zero paperwork ever' },
              { icon: '🤖', text: 'AI detects disruption — you just ride' },
              { icon: '💰', text: 'Starting from ₹15/week only' },
            ].map((f, i) => (
              <div key={i} style={s.featureRow}>
                <div style={s.featureIconBox}>{f.icon}</div>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Premium estimate */}
          <div style={s.estimateBar}>
            <div>
              <div style={s.estimateLabel}>Your estimated premium</div>
              <div style={s.estimateValue}>
                ₹{savedCity === 'Mumbai' ? '92' : savedCity === 'Delhi' ? '55' : '77'}
                <span style={s.estimateUnit}>/week</span>
              </div>
            </div>
            <div style={s.estimateRight}>
              <div style={s.estimateLabel}>Covers up to</div>
              <div style={{ ...s.estimateValue, color: '#10B981' }}>₹2,500</div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate(savedHash ? '/app/dashboard' : '/app/register')}
            style={s.ctaBtn}
          >
            {savedHash ? 'View My Coverage →' : 'Activate Protection →'}
          </button>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>How it works</div>
        <div style={s.steps}>
          {[
            { icon: '📱', title: 'Enable in one tap', desc: '60-second registration' },
            { icon: '🚴', title: 'Ride as usual', desc: 'No changes to your routine' },
            { icon: '🤖', title: 'AI watches your zone', desc: 'We detect rain, floods, suspensions' },
            { icon: '💸', title: 'Payout hits instantly', desc: '75% of lost income, auto-credited' },
          ].map((step, i) => (
            <div key={i} style={s.stepRow}>
              <div style={s.stepNum}>{i + 1}</div>
              <div style={s.stepIcon}>{step.icon}</div>
              <div>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepDesc}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── SUB-COMPONENTS ────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: '#fff', borderRadius: 14,
      padding: '14px 10px', textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── HELPERS ───────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning 🌤️'
  if (h < 17) return 'Good Afternoon ☀️'
  return 'Good Evening 🌙'
}

function animateValue(setter, from, to, duration) {
  const start = performance.now()
  const step = (now) => {
    const pct = Math.min((now - start) / duration, 1)
    const ease = 1 - Math.pow(1 - pct, 3)
    setter(Math.round(from + (to - from) * ease))
    if (pct < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ── STYLES ────────────────────────────────────────────────
const s = {
  page: { background: '#F4F4F7', paddingBottom: 8 },

  // Hero
  hero: {
    background: 'linear-gradient(135deg, #E23744 0%, #B31D29 100%)',
    padding: '20px 18px 28px', position: 'relative', overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: '50%',
    background: 'rgba(255,255,255,0.07)',
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroShield: {
    position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
    zIndex: 0,
  },
  greeting: {
    fontSize: 22, fontWeight: 800, color: '#fff',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  wave: { display: 'inline-block', animation: 'none' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, marginBottom: 12 },
  activeChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
    borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#fff', fontWeight: 600,
  },
  activeDot: {
    width: 7, height: 7, borderRadius: '50%', background: '#10B981',
    display: 'inline-block', boxShadow: '0 0 8px #10B981',
  },
  inactiveChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)',
    borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#FDE68A', fontWeight: 600,
  },

  // Stats
  statsSection: { padding: '14px 14px 4px' },
  statsLabel: {
    fontSize: 10, fontWeight: 700, color: '#9CA3AF',
    letterSpacing: 1.5, marginBottom: 8, paddingLeft: 2,
  },
  statsRow: { display: 'flex', gap: 8 },

  // Promo card
  section: { padding: '10px 14px' },
  promoCard: {
    background: '#fff', borderRadius: 18,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid #F3F4F6',
  },
  cardHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  shieldIcon: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(226,55,68,0.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1C1C1C' },
  cardSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  newBadge: {
    background: '#E23744', color: '#fff', fontSize: 9,
    fontWeight: 800, padding: '3px 8px', borderRadius: 4, letterSpacing: 1,
  },
  featureGrid: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  featureRow: { display: 'flex', alignItems: 'center', gap: 12 },
  featureIconBox: {
    width: 34, height: 34, borderRadius: 10,
    background: '#F9FAFB', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 17, flexShrink: 0,
  },
  featureText: { fontSize: 13, color: '#374151', lineHeight: 1.4 },
  estimateBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    margin: '0 16px', padding: '12px 16px', borderRadius: 12,
    background: 'linear-gradient(135deg, #FFF5F5, #FEF2F2)',
    border: '1px solid #FECACA',
  },
  estimateLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5 },
  estimateValue: { fontSize: 24, fontWeight: 800, color: '#E23744' },
  estimateUnit: { fontSize: 13, fontWeight: 500, color: '#9CA3AF' },
  estimateRight: { textAlign: 'right' },
  ctaBtn: {
    width: 'calc(100% - 32px)', margin: '12px 16px 16px',
    padding: '15px 0', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #E23744, #C0202E)',
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(226,55,68,0.35)',
    letterSpacing: 0.2,
  },

  // How it works
  sectionTitle: {
    fontSize: 14, fontWeight: 700, color: '#1C1C1C',
    marginBottom: 12, paddingLeft: 2,
  },
  steps: {
    background: '#fff', borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  stepRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderBottom: '1px solid #F9FAFB',
  },
  stepNum: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#E23744', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800, flexShrink: 0,
  },
  stepIcon: { fontSize: 20, flexShrink: 0 },
  stepTitle: { fontSize: 13, fontWeight: 700, color: '#1C1C1C' },
  stepDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
}
