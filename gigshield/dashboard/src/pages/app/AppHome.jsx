// ─────────────────────────────────────────────────────────
// APP HOME — Zomato Partner home screen
// ─────────────────────────────────────────────────────────
// Shows a mock Zomato earnings summary + a RouteSafe Insurance
// promotional card with CTA to register for protection.
// ─────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'

export default function AppHome() {
  const navigate = useNavigate()

  // Check if user already registered (stored in sessionStorage)
  const savedHash = sessionStorage.getItem('RouteSafe Insurance_worker_hash')
  const savedCity = sessionStorage.getItem('RouteSafe Insurance_worker_city') || 'Bangalore'

  return (
    <div style={s.page}>

      {/* ── GREETING ────────────────────────────────── */}
      <div style={s.greeting}>
        <div style={s.greetText}>Good {getTimeGreeting()} 👋</div>
        <div style={s.greetSub}>Ready to start delivering?</div>
      </div>

      {/* ── TODAY'S STATS (mock) ──────────────────── */}
      <div style={s.statsRow}>
        <div style={s.statBox}>
          <div style={s.statNum}>₹0</div>
          <div style={s.statLabel}>Today's Earnings</div>
        </div>
        <div style={s.statBox}>
          <div style={s.statNum}>0</div>
          <div style={s.statLabel}>Orders</div>
        </div>
        <div style={s.statBox}>
          <div style={s.statNum}>0 hrs</div>
          <div style={s.statLabel}>Online Time</div>
        </div>
      </div>

      {/* ── RouteSafe Insurance PROMO CARD ──────────────────── */}
      <div style={s.promoCard}>
        <div style={s.promoHeader}>
          <div style={s.promoIcon}>🛡️</div>
          <div>
            <div style={s.promoTitle}>RouteSafe Insurance Protection</div>
            <div style={s.promoSub}>Income Disruption Insurance</div>
          </div>
          <div style={s.newBadge}>NEW</div>
        </div>

        <div style={s.promoDivider} />

        <div style={s.promoBody}>
          <div style={s.promoFeature}>
            <span style={s.checkIcon}>✓</span>
            <span>Get <strong>75% income replacement</strong> during disruptions</span>
          </div>
          <div style={s.promoFeature}>
            <span style={s.checkIcon}>✓</span>
            <span>Auto-payout — <strong>zero paperwork</strong></span>
          </div>
          <div style={s.promoFeature}>
            <span style={s.checkIcon}>✓</span>
            <span>Starting from just <strong>₹15/week</strong></span>
          </div>
          <div style={s.promoFeature}>
            <span style={s.checkIcon}>✓</span>
            <span>Covers rainfall, floods, zone suspensions</span>
          </div>
        </div>

        {savedHash ? (
          <button
            onClick={() => navigate('/app/dashboard')}
            style={s.ctaBtn}
          >
            View My Coverage →
          </button>
        ) : (
          <button
            onClick={() => navigate('/app/register')}
            style={s.ctaBtn}
          >
            Activate Protection →
          </button>
        )}
      </div>

      {/* ── INFO CARDS ───────────────────────────────── */}
      <div style={s.infoRow}>
        <div style={s.infoCard}>
          <div style={{ fontSize: 24 }}>🌧️</div>
          <div style={s.infoTitle}>Weather Protected</div>
          <div style={s.infoDesc}>Auto-payout when rainfall exceeds 35mm/hr in your zone</div>
        </div>
        <div style={s.infoCard}>
          <div style={{ fontSize: 24 }}>⚡</div>
          <div style={s.infoTitle}>Instant Claims</div>
          <div style={s.infoDesc}>AI validates and credits your account in under 30 seconds</div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <div style={s.howSection}>
        <div style={s.howTitle}>How RouteSafe Insurance Works</div>
        {[
          { num: '1', text: 'Enable protection with one tap' },
          { num: '2', text: 'Start your shift as usual' },
          { num: '3', text: 'If disruption hits your zone — we detect it automatically' },
          { num: '4', text: '75% of lost income credited to your account' }
        ].map(step => (
          <div key={step.num} style={s.howStep}>
            <div style={s.howNum}>{step.num}</div>
            <div style={s.howText}>{step.text}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

// ── STYLES ────────────────────────────────────────────────
const s = {
  page: { padding: '0 0 24px', background: '#F7F7F7' },

  greeting: { padding: '20px 16px 12px', background: '#fff' },
  greetText: { fontSize: 20, fontWeight: 700, color: '#1C1C1C' },
  greetSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  statsRow: {
    display: 'flex', gap: 10, padding: '12px 16px',
    background: '#fff', marginBottom: 8
  },
  statBox: {
    flex: 1, background: '#F9FAFB', borderRadius: 12,
    padding: '14px 12px', textAlign: 'center'
  },
  statNum: { fontSize: 18, fontWeight: 800, color: '#1C1C1C' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 500 },

  promoCard: {
    margin: '8px 16px', background: '#FFFFFF',
    borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #F3F4F6'
  },
  promoHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 16px 12px',
  },
  promoIcon: { fontSize: 32 },
  promoTitle: { fontSize: 16, fontWeight: 700, color: '#1C1C1C' },
  promoSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  newBadge: {
    background: '#E23744', color: '#fff', fontSize: 10,
    fontWeight: 700, padding: '3px 8px', borderRadius: 4,
    marginLeft: 'auto', letterSpacing: 0.5
  },
  promoDivider: { height: 1, background: '#F3F4F6', margin: '0 16px' },
  promoBody: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  promoFeature: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    fontSize: 14, color: '#374151', lineHeight: 1.4
  },
  checkIcon: {
    color: '#10B981', fontWeight: 700, fontSize: 16, flexShrink: 0, marginTop: 1
  },
  ctaBtn: {
    width: 'calc(100% - 32px)', margin: '4px 16px 16px',
    padding: '14px 0', borderRadius: 12, border: 'none',
    background: '#E23744', color: '#fff', fontSize: 16,
    fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3
  },

  infoRow: { display: 'flex', gap: 10, padding: '8px 16px' },
  infoCard: {
    flex: 1, background: '#fff', borderRadius: 14,
    padding: '16px 14px', textAlign: 'center',
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
  },
  infoTitle: { fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginTop: 8 },
  infoDesc: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.5 },

  howSection: {
    margin: '8px 16px', background: '#fff', borderRadius: 14,
    padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
  },
  howTitle: { fontSize: 15, fontWeight: 700, color: '#1C1C1C', marginBottom: 14 },
  howStep: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  howNum: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#E23744', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0
  },
  howText: { fontSize: 14, color: '#374151', lineHeight: 1.4 }
}
