// ─────────────────────────────────────────────────────────
// APP LAYOUT — Mobile shell (upgraded)
// ─────────────────────────────────────────────────────────
import { Outlet, NavLink, useLocation } from 'react-router-dom'

// ── SVG NAV ICONS ─────────────────────────────────────────
const HomeIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
      fill={active ? '#E23744' : 'none'}
      stroke={active ? '#E23744' : '#9CA3AF'}
      strokeWidth="2" strokeLinejoin="round"/>
  </svg>
)
const EarningsIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="2"
      stroke={active ? '#E23744' : '#9CA3AF'} strokeWidth="2"/>
    <circle cx="12" cy="12" r="3"
      fill={active ? '#E23744' : 'none'}
      stroke={active ? '#E23744' : '#9CA3AF'} strokeWidth="2"/>
    <path d="M2 9H22M2 15H22" stroke={active ? '#E23744' : '#9CA3AF'} strokeWidth="1.5"/>
  </svg>
)
const ShieldIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 3L4 7V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V7L12 3Z"
      fill={active ? 'rgba(226,55,68,0.15)' : 'none'}
      stroke={active ? '#E23744' : '#9CA3AF'} strokeWidth="2" strokeLinejoin="round"/>
    {active && <path d="M9 12L11 14L15 10" stroke="#E23744" strokeWidth="2" strokeLinecap="round"/>}
  </svg>
)
const ClaimsIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2"
      stroke={active ? '#E23744' : '#9CA3AF'} strokeWidth="2"/>
    <path d="M8 7H16M8 11H16M8 15H13"
      stroke={active ? '#E23744' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const TABS = [
  { to: '/app',           label: 'Home',     Icon: HomeIcon,     end: true },
  { to: '/app/dashboard', label: 'Earnings', Icon: EarningsIcon },
  { to: '/app/monitor',   label: 'Shield',   Icon: ShieldIcon   },
  { to: '/app/claims',    label: 'Claims',   Icon: ClaimsIcon   },
]

export default function AppLayout() {
  const location = useLocation()
  const hideNav = location.pathname.includes('/register')

  return (
    <div style={s.viewport}>
      <div style={s.phone}>

        {/* ── TOP BAR ─────────────────────────────────── */}
        <div style={s.topBar}>
          <div style={s.logoRow}>
            <span style={s.logoText}>zomato</span>
            <span style={s.partnerBadge}>partner</span>
          </div>
          <div style={s.shieldChip}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L4 7V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V7L12 3Z"
                fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
            </svg>
            <span>RouteSafe</span>
            <span style={s.liveChip}>LIVE</span>
          </div>
        </div>

        {/* ── PAGE CONTENT ────────────────────────────── */}
        <div style={s.content}>
          <Outlet />
        </div>

        {/* ── BOTTOM NAV BAR ──────────────────────────── */}
        {!hideNav && (
          <div style={s.bottomNav}>
            {TABS.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                style={({ isActive }) => ({
                  ...s.tab,
                  color: isActive ? '#E23744' : '#9CA3AF',
                })}
              >
                {({ isActive }) => (
                  <>
                    <div style={{
                      ...s.iconWrap,
                      background: isActive ? 'rgba(226,55,68,0.08)' : 'transparent',
                    }}>
                      <tab.Icon active={isActive} />
                    </div>
                    <span style={{
                      ...s.tabLabel,
                      color:      isActive ? '#E23744' : '#9CA3AF',
                      fontWeight: isActive ? 700 : 500,
                    }}>
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────
const s = {
  viewport: {
    width: '100vw', minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a0a0c 0%, #1a1a2e 100%)',
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  phone: {
    width: '100%', maxWidth: 430, minHeight: '100vh',
    background: '#F7F7F7', display: 'flex', flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 0 80px rgba(226,55,68,0.15), 0 0 40px rgba(0,0,0,0.6)',
  },
  topBar: {
    background: 'linear-gradient(135deg, #E23744 0%, #C0202E 100%)',
    padding: '14px 16px 12px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 2px 12px rgba(226,55,68,0.3)',
  },
  logoRow: { display: 'flex', alignItems: 'baseline', gap: 6 },
  logoText: {
    color: '#fff', fontSize: 22, fontWeight: 800,
    fontStyle: 'italic', letterSpacing: -0.5,
  },
  partnerBadge: {
    color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4, padding: '2px 6px', letterSpacing: 0.5,
  },
  shieldChip: {
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    borderRadius: 20, padding: '5px 10px',
    display: 'flex', alignItems: 'center', gap: 5,
    color: '#fff', fontSize: 12, fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.2)',
  },
  liveChip: {
    background: '#10B981', color: '#fff', fontSize: 9,
    fontWeight: 800, padding: '1px 5px', borderRadius: 3,
    letterSpacing: 0.5, marginLeft: 2,
  },
  content: {
    flex: 1, overflowY: 'auto', overflowX: 'hidden',
    paddingBottom: 76,
  },
  bottomNav: {
    position: 'fixed', bottom: 0, left: '50%',
    transform: 'translateX(-50%)',
    width: '100%', maxWidth: 430,
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid #F0F0F0',
    display: 'flex', justifyContent: 'space-around',
    padding: '8px 0 14px', zIndex: 100,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 3, textDecoration: 'none', flex: 1, transition: 'color 0.2s',
  },
  iconWrap: {
    width: 44, height: 32, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s',
  },
  tabLabel: {
    fontSize: 10, letterSpacing: 0.2, transition: 'all 0.2s',
  },
}
