// ─────────────────────────────────────────────────────────
// WORKERS PAGE — WorkersPage.jsx (Enhanced)
// ─────────────────────────────────────────────────────────
// Shows all enrolled workers with:
//   - Skeleton loading states
//   - City emoji icons
//   - Risk score color-coding
//   - Mini earnings sparkline (last 4 weeks)
//   - Search / filter bar
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import axios from 'axios'

const CITY_ICON = { Bangalore: '🌆', Mumbai: '🌊', Delhi: '🏛️' }
const PLATFORM_COLOR = {
  zomato: { color: '#E23744', bg: 'rgba(226,55,68,0.12)' },
  swiggy: { color: '#FC8019', bg: 'rgba(252,128,25,0.12)' }
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
}

// Mini sparkline using inline SVG (no extra lib needed)
function Sparkline({ data = [], color = '#f59e0b' }) {
  if (!data.length) return null
  const last4 = data.slice(-6)
  const min = Math.min(...last4)
  const max = Math.max(...last4)
  const range = max - min || 1
  const w = 70, h = 28
  const pts = last4.map((v, i) => {
    const x = (i / (last4.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// Risk score badge
function RiskBadge({ score }) {
  const color = score >= 1.3 ? '#ef4444' : score >= 1.0 ? '#f59e0b' : '#10b981'
  const label = score >= 1.3 ? 'High' : score >= 1.0 ? 'Med' : 'Low'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 100,
      fontSize: 11, fontWeight: 700, color,
      background: `${color}18`
    }}>
      {label} {score?.toFixed(2)}
    </span>
  )
}

// Skeleton row
function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6,7,8].map(i => (
        <td key={i}>
          <div className="skeleton" style={{ height: 16, width: i === 1 ? 100 : 60, borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  )
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [cityFilter, setCityFilter] = useState('all')

  useEffect(() => {
    axios.get('/api/workers')
      .then(res => { setWorkers(res.data.workers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cities = [...new Set(workers.map(w => w.city))]

  const filtered = workers.filter(w => {
    const matchCity   = cityFilter === 'all' || w.city === cityFilter
    const matchSearch = !search || 
      (w.name || '').toLowerCase().includes(search.toLowerCase()) ||
      w.city.toLowerCase().includes(search.toLowerCase()) ||
      w.zone.includes(search)
    return matchCity && matchSearch
  })

  const avgPremium = workers.length
    ? (workers.reduce((s, w) => s + (w.calculatedPremium || 0), 0) / workers.length).toFixed(0)
    : 0
  const totalPremiumPool = workers.reduce((s, w) => s + (w.calculatedPremium || 0), 0).toFixed(0)

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h2>👷 Worker Profiles</h2>
          <p>All enrolled gig workers with earnings, risk scores and weekly premiums</p>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card amber">
          <div className="label">Total Workers</div>
          <div className="value amber">{workers.length}</div>
          <div className="stat-sub">across {cities.length} cities</div>
        </div>
        <div className="stat-card green">
          <div className="label">Active</div>
          <div className="value green">{workers.filter(w => w.isActive).length}</div>
          <div className="stat-sub">currently on shift</div>
        </div>
        <div className="stat-card amber">
          <div className="label">Avg Premium / Week</div>
          <div className="value amber">₹{avgPremium}</div>
          <div className="stat-sub">per worker</div>
        </div>
        <div className="stat-card">
          <div className="label">Weekly Premium Pool</div>
          <div className="value">₹{totalPremiumPool}</div>
          <div className="stat-sub">total collected</div>
        </div>
      </div>

      {/* ── FILTERS ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <input
          type="text"
          placeholder="🔍  Search by name, city, zone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 220,
            padding: '8px 14px', background: '#0f1520',
            border: '1px solid #1e2d45', borderRadius: 8,
            color: '#f1f5f9', fontSize: 13, outline: 'none'
          }}
        />
        {/* City filter tabs */}
        {['all', ...cities].map(city => (
          <button
            key={city}
            onClick={() => setCityFilter(city)}
            style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: 12,
              background: cityFilter === city ? 'rgba(245,158,11,0.15)' : 'transparent',
              color:      cityFilter === city ? '#f59e0b' : '#64748b',
              border:     `1px solid ${cityFilter === city ? 'rgba(245,158,11,0.3)' : '#1e2d45'}`,
              transition: 'all 0.15s'
            }}
          >
            {city === 'all' ? `All (${workers.length})` : `${CITY_ICON[city] || '📍'} ${city}`}
          </button>
        ))}
      </div>

      {/* ── TABLE ──────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-header">
          <span>Enrolled Workers</span>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
            {filtered.length} / {workers.length} shown
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>City / Zone</th>
              <th>Platforms</th>
              <th>12-Wk Avg</th>
              <th>Trend</th>
              <th>Risk Score</th>
              <th>Weekly Premium</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    <div className="empty-icon">👷</div>
                    {workers.length === 0
                      ? 'No workers found. Run node prisma/seed.js first.'
                      : 'No workers match your search filter.'}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(worker => (
                <tr key={worker.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{worker.name || '—'}</div>
                    <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                      {worker.workerHash.substring(0, 12)}…
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {CITY_ICON[worker.city] || '📍'} {worker.city}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Zone {worker.zone}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(worker.platforms || []).map(p => {
                        const pc = PLATFORM_COLOR[p] || PLATFORM_COLOR.zomato
                        return (
                          <span key={p} style={{
                            fontSize: 11, fontWeight: 700,
                            padding: '2px 8px', borderRadius: 20,
                            color: pc.color, background: pc.bg
                          }}>
                            {p === 'zomato' ? '🍕' : '🛵'} {p}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{avg(worker.weeklyEarningsHistory)}/wk</td>
                  <td>
                    <Sparkline data={worker.weeklyEarningsHistory} color="#f59e0b" />
                  </td>
                  <td>
                    <RiskBadge score={worker.zoneRiskScore} />
                  </td>
                  <td>
                    <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 15 }}>
                      ₹{worker.calculatedPremium}
                    </span>
                    <span style={{ color: '#64748b', fontSize: 11 }}>/wk</span>
                  </td>
                  <td>
                    <span className={`badge ${worker.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                      {worker.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
