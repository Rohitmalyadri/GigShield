// App.jsx — The root of the React dashboard
// Sets up the page layout: sidebar on the left, pages on the right
// Uses react-router-dom so each nav link shows a different page

import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import WorkersPage from './pages/WorkersPage'
import ClaimsPage  from './pages/ClaimsPage'
import SimulatePage from './pages/SimulatePage'
import './index.css'

// The icons are just emoji for simplicity — no extra icon library needed
const NAV_ITEMS = [
  { to: '/',          label: 'Workers',   icon: '👷' },
  { to: '/claims',    label: 'Claims',    icon: '📋' },
  { to: '/simulate',  label: 'Simulate',  icon: '🌧️' },
]

function App() {
  return (
    // BrowserRouter enables URL-based navigation
    <BrowserRouter>
      <div className="app-layout">

        {/* ── LEFT SIDEBAR ─────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>GigShield</h1>        {/* Brand name */}
            <p>Admin Dashboard</p>    {/* Subtitle */}
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              // NavLink automatically adds the "active" class
              // when its URL matches the current page
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'} // "end" prevents / from matching all routes
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* ── MAIN CONTENT AREA ────────────────────────── */}
        <main className="main-content">
          <Routes>
            <Route path="/"         element={<WorkersPage />}  />
            <Route path="/claims"   element={<ClaimsPage />}   />
            <Route path="/simulate" element={<SimulatePage />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  )
}

export default App
