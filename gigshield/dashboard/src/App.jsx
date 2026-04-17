// ─────────────────────────────────────────────────────────
//  App.jsx — RouteSafe Insurance Dashboard Root
//  Two routing trees:
//    /app/*   → Mobile-first Zomato partner clone (phone)
//    /*       → Admin dashboard with sidebar (laptop)
// ─────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import MissionControl  from './pages/MissionControl'
import WorkersPage     from './pages/WorkersPage'
import ClaimsPage      from './pages/ClaimsPage'
import SimulatePage    from './pages/SimulatePage'
import RegisterPage    from './pages/RegisterPage'
import PoliciesPage    from './pages/PoliciesPage'
import AnalyticsPage   from './pages/AnalyticsPage'
import PaymentPage        from './pages/PaymentPage'
import PaymentHistoryPage from './pages/PaymentHistoryPage'
import RiskDashboardPage  from './pages/RiskDashboardPage'

// Mobile App (Zomato Partner Clone)
import AppLayout    from './pages/app/AppLayout'
import AppHome      from './pages/app/AppHome'
import AppRegister  from './pages/app/AppRegister'
import AppDashboard from './pages/app/AppDashboard'
import AppMonitor   from './pages/app/AppMonitor'
import AppClaims    from './pages/app/AppClaims'

import './index.css'

// Navigation tells the RouteSafe Insurance story:
//  Live Monitor → Register Worker → Pay Premium → Run Simulation → Review Data
const NAV_ITEMS = [
  // ── Core Demo Flow ─────────────────────────
  { to: '/',               label: 'Mission Control', icon: '🎮', group: 'DEMO'     },
  { to: '/simulate',       label: 'Simulation',      icon: '⚡', group: 'DEMO'     },
  { to: '/register',       label: 'Register Worker', icon: '📲', group: 'DEMO'     },
  { to: '/payment',        label: 'Pay Premium',     icon: '💳', group: 'DEMO'     },
  // ── Analytics & Data ───────────────────────
  { to: '/analytics',      label: 'Analytics',       icon: '📊', group: 'DATA'     },
  { to: '/risk',           label: 'Risk Engine',     icon: '🧠', group: 'DATA'     },
  { to: '/workers',        label: 'Workers',         icon: '👷', group: 'DATA'     },
  { to: '/claims',         label: 'Claims',          icon: '📋', group: 'DATA'     },
  { to: '/policies',       label: 'Policies',        icon: '📄', group: 'DATA'     },
  { to: '/payment-history',label: 'Pay History',     icon: '🧾', group: 'DATA'     },
]

// ── SIDEBAR STATUS INDICATOR ──────────────────────────────
function SidebarFooter() {
  const [backendOk, setBackendOk] = useState(true) // optimistic default

  useEffect(() => {
    // Initial check — silent, no UI flash
    fetch('http://localhost:4000/')
      .then(r => { if (r.ok) setBackendOk(true) })
      .catch(() => {}) // stay optimistic on first load

    // Poll every 5 minutes — not aggressive, won't cause reconnecting flash
    const interval = setInterval(() => {
      fetch('http://localhost:4000/')
        .then(r => setBackendOk(r.ok))
        .catch(() => setBackendOk(false))
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="sidebar-footer">
      <div className="status-row">
        <span className={`status-dot ${backendOk ? 'connected' : 'disconnected'}`} />
        <span>
          {backendOk ? 'API Connected' : 'Reconnecting...'}
        </span>
      </div>
      <div className="status-row">
        <span className="status-dot connected" />
        <span>RouteSafe Insurance v4 · DEVTrails</span>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── MOBILE APP (judge's phone) ──────────────────── */}
        <Route path="/app" element={<AppLayout />}>
          <Route index           element={<AppHome />} />
          <Route path="register" element={<AppRegister />} />
          <Route path="dashboard" element={<AppDashboard />} />
          <Route path="monitor"  element={<AppMonitor />} />
          <Route path="claims"   element={<AppClaims />} />
        </Route>

        {/* ── ADMIN DASHBOARD (laptop) ────────────────────── */}
        <Route path="/*" element={
          <div className="app-layout">
            <aside className="sidebar">
              {/* Brand */}
              <div className="sidebar-logo">
                <h1>🛡️ RouteSafe Insurance</h1>
                <p>DEVTrails 2026 · Phase 4</p>
              </div>

              {/* Navigation — grouped for clarity */}
              <nav className="sidebar-nav">
                {/* Demo Flow group */}
                <div style={{ fontSize: 9, color: '#334155', fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase', padding: '10px 12px 4px' }}>DEMO FLOW</div>
                {NAV_ITEMS.filter(i => i.group === 'DEMO').map(item => (
                  <NavLink
                    key={item.to} to={item.to} end={item.to === '/'}
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
                {/* Data group */}
                <div style={{ fontSize: 9, color: '#334155', fontWeight: 800, letterSpacing: 1.5,
                  textTransform: 'uppercase', padding: '14px 12px 4px' }}>ANALYTICS & DATA</div>
                {NAV_ITEMS.filter(i => i.group === 'DATA').map(item => (
                  <NavLink
                    key={item.to} to={item.to} end={item.to === '/'}
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* System status footer */}
              <SidebarFooter />
            </aside>

            <main className="main-content">
              <Routes>
                <Route path="/"               element={<MissionControl />} />
                <Route path="/analytics"      element={<AnalyticsPage />} />
                <Route path="/risk"           element={<RiskDashboardPage />} />
                <Route path="/payment"        element={<PaymentPage />} />
                <Route path="/payment-history" element={<PaymentHistoryPage />} />
                <Route path="/register"       element={<RegisterPage />} />
                <Route path="/policies"       element={<PoliciesPage />} />
                <Route path="/workers"        element={<WorkersPage />} />
                <Route path="/claims"         element={<ClaimsPage />} />
                <Route path="/simulate"       element={<SimulatePage />} />
              </Routes>
            </main>
          </div>
        } />

      </Routes>
    </BrowserRouter>
  )
}

export default App
