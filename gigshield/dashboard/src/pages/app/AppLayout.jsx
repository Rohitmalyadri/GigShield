// ─────────────────────────────────────────────────────────
// APP LAYOUT — Mobile shell for all /app/* routes
// ─────────────────────────────────────────────────────────
// Wraps child routes with Zomato-style top bar + bottom nav.
// Light theme (white bg) matching the real Zomato partner app.
// Constrains width to 430px for authentic mobile feel.
// ─────────────────────────────────────────────────────────

import { Outlet, NavLink, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/app',           icon: '🏠', label: 'Home',    end: true },
  { to: '/app/dashboard', icon: '💰', label: 'Earnings' },
  { to: '/app/monitor',   icon: '🛡️', label: 'Shield' },
  { to: '/app/claims',    icon: '📋', label: 'Claims' },
]

export default function AppLayout() {
  const location = useLocation()
  // Hide bottom nav on register page (full-screen form)
  const hideNav = location.pathname.includes('/register')

  return (
    <div style={s.viewport}>
      <div style={s.phone}>

        {/* ── TOP BAR — Zomato red ──────────────────── */}
        <div style={s.topBar}>
          <div style={s.logoRow}>
            <span style={s.logoText}>zomato</span>
            <span style={s.partnerBadge}>partner</span>
          </div>
          <div style={s.shieldChip}>
            <span style={{ fontSize: 12 }}>🛡️</span>
            <span>RouteSafe Insurance</span>
          </div>
        </div>

        {/* ── PAGE CONTENT ──────────────────────────── */}
        <div style={s.content}>
          <Outlet />
        </div>

        {/* ── BOTTOM NAV BAR ────────────────────────── */}
        {!hideNav && (
          <div style={s.bottomNav}>
            {TABS.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                style={({ isActive }) => ({
                  ...s.tab,
                  color: isActive ? '#E23744' : '#9CA3AF'
                })}
              >
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                <span style={s.tabLabel}>{tab.label}</span>
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
    width: '100vw',
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '0',
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflowX: 'hidden'
  },
  phone: {
    width: '100%',
    maxWidth: 430,
    minHeight: '100vh',
    background: '#F7F7F7',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 0 60px rgba(0,0,0,0.5)'
  },
  topBar: {
    background: 'linear-gradient(135deg, #E23744 0%, #D42F3F 100%)',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  logoRow: {
    display: 'flex', alignItems: 'baseline', gap: 6
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 800,
    fontStyle: 'italic',
    letterSpacing: -0.5
  },
  partnerBadge: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4,
    padding: '1px 6px'
  },
  shieldChip: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingBottom: 72   // Space for bottom nav
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 430,
    background: '#FFFFFF',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '6px 0 10px',
    zIndex: 100
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    textDecoration: 'none',
    flex: 1,
    transition: 'color 0.2s'
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.3
  }
}
