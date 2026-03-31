import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import MissionControl from './pages/MissionControl'
import WorkersPage    from './pages/WorkersPage'
import ClaimsPage     from './pages/ClaimsPage'
import SimulatePage   from './pages/SimulatePage'
import RegisterPage   from './pages/RegisterPage'   // NEW
import PoliciesPage   from './pages/PoliciesPage'   // NEW
import './index.css'

const NAV_ITEMS = [
  { to: '/',           label: 'Mission Control', icon: '🎮' },
  { to: '/register',   label: 'Register',        icon: '📲' },  // NEW
  { to: '/policies',   label: 'Policies',        icon: '📄' },  // NEW
  { to: '/workers',    label: 'Workers',         icon: '👷' },
  { to: '/claims',     label: 'Claims',          icon: '📋' },
  { to: '/simulate',   label: 'Simulate',        icon: '🌧️' },
]

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>GigShield</h1>
            <p>DEVTrails 2026</p>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
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

        <main className="main-content">
          <Routes>
            <Route path="/"          element={<MissionControl />} />
            <Route path="/register"  element={<RegisterPage />}   />
            <Route path="/policies"  element={<PoliciesPage />}   />
            <Route path="/workers"   element={<WorkersPage />}    />
            <Route path="/claims"    element={<ClaimsPage />}     />
            <Route path="/simulate"  element={<SimulatePage />}   />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

