// ─────────────────────────────────────────────────────────
// ANALYTICS PAGE — AnalyticsPage.jsx
// ─────────────────────────────────────────────────────────
// Displays financial KPIs and operational metrics for the
// RouteSafe Insurance admin dashboard, including:
//   - Overall Loss Ratio gauge
//   - Claims Trend over time (bar chart)
//   - Premium vs Payout comparison (stacked bar)
//   - City breakdown (claims + loss ratios per city)
//   - Worker enrollment by platform (pie chart)
// All data is fetched fresh from /api/policies and /api/claims
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
  CartesianGrid, RadialBarChart, RadialBar
} from 'recharts'

// ── COLOR PALETTE ─────────────────────────────────────────
const COLORS = {
  amber:  '#f59e0b',
  green:  '#10b981',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  slate:  '#64748b'
}
const PIE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444']

// ── CUSTOM TOOLTIP ────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f1520', border: '1px solid #1e2d45',
      borderRadius: 10, padding: '10px 14px', fontSize: 12
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#f1f5f9', fontWeight: 600 }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toFixed(0) : p.value}
        </div>
      ))}
    </div>
  )
}

// ── LOSS RATIO COLOR HELPER ────────────────────────────────
function lossRatioColor(ratio) {
  if (ratio < 60)  return COLORS.green
  if (ratio < 90)  return COLORS.amber
  return COLORS.red
}

function lossRatioLabel(ratio) {
  if (ratio < 60)  return '✅ Healthy'
  if (ratio < 90)  return '⚠️ Monitor'
  return '🔴 Critical'
}

// ── GAUGE COMPONENT ───────────────────────────────────────
function LossRatioGauge({ ratio }) {
  const color = lossRatioColor(ratio)
  const data = [{ name: 'ratio', value: Math.min(ratio, 100) }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <RadialBarChart
        width={200} height={120} cx={100} cy={110}
        innerRadius={70} outerRadius={100}
        startAngle={180} endAngle={0}
        data={[{ value: 100, fill: '#1e2d45' }, { value: Math.min(ratio, 100), fill: color }]}
        barSize={18}
      >
        <RadialBar dataKey="value" cornerRadius={8} />
      </RadialBarChart>
      <div style={{ marginTop: -60, textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>
          {ratio.toFixed(1)}%
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Loss Ratio</div>
        <div style={{
          display: 'inline-block',
          marginTop: 8,
          padding: '3px 12px',
          borderRadius: 100,
          fontSize: 11,
          fontWeight: 700,
          background: `${color}18`,
          color
        }}>
          {lossRatioLabel(ratio)}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const [policies, setPolicies] = useState([])
  const [claims,   setClaims]   = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get('/api/policies'),
      axios.get('/api/claims')
    ]).then(([pRes, cRes]) => {
      setPolicies(pRes.data.policies || [])
      setClaims(cRes.data.claims   || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ── DERIVED METRICS ────────────────────────────────────
  const totalPremiums  = policies.reduce((s, p) => s + (p.premiumAmount || 0), 0)
  const totalPaidOut   = claims
    .filter(c => c.payoutStatus === 'approved' || c.payoutStatus === 'simulated')
    .reduce((s, c) => s + (c.payoutAmount || 0), 0)
  const lossRatio      = totalPremiums > 0 ? (totalPaidOut / totalPremiums) * 100 : 0

  const approvedClaims = claims.filter(c => c.payoutStatus === 'approved').length
  const rejectedClaims = claims.filter(c => c.payoutStatus?.includes('rejected')).length
  const approvalRate   = claims.length > 0 ? (approvedClaims / claims.length * 100) : 0

  const activeWorkers  = policies.filter(p => !p.isExpired && p.coverageActive).length

  // ── CITY BREAKDOWN ─────────────────────────────────────
  const cityMap = {}
  policies.forEach(p => {
    const city = p.worker?.city || 'Unknown'
    if (!cityMap[city]) cityMap[city] = { city, premiums: 0, claims: 0, paidOut: 0 }
    cityMap[city].premiums += p.premiumAmount || 0
    cityMap[city].claims   += p.claimsCount   || 0
    cityMap[city].paidOut  += p.totalPaidOut  || 0
  })
  const cityData = Object.values(cityMap).map(d => ({
    ...d,
    lossRatio: d.premiums > 0 ? Math.round((d.paidOut / d.premiums) * 100) : 0
  }))

  // ── CLAIMS TREND (last 14 days, grouped by day) ────────
  const trendMap = {}
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    trendMap[key] = { date: key, approved: 0, rejected: 0, total: 0 }
  }
  claims.forEach(c => {
    const key = new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    if (trendMap[key]) {
      trendMap[key].total++
      if (c.payoutStatus === 'approved') trendMap[key].approved++
      else if (c.payoutStatus?.includes('rejected')) trendMap[key].rejected++
    }
  })
  const trendData = Object.values(trendMap)

  // ── PLATFORM PIE ───────────────────────────────────────
  const platformMap = {}
  policies.forEach(p => {
    (p.worker?.platforms || []).forEach(plat => {
      platformMap[plat] = (platformMap[plat] || 0) + 1
    })
  })
  const platformData = Object.entries(platformMap).map(([name, value]) => ({ name, value }))

  // ── DISRUPTION TYPE BREAKDOWN ──────────────────────────
  const typeMap = {}
  claims.forEach(c => {
    const t = c.disruptionType?.replace(/_/g, ' ') || 'Unknown'
    typeMap[t] = (typeMap[t] || 0) + 1
  })
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }))

  if (loading) {
    return (
      <div className="page-fade">
        <div className="page-header">
          <div className="page-header-left">
            <h2>📊 Analytics</h2>
            <p>Loading financial metrics...</p>
          </div>
        </div>
        <div className="stats-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: 100 }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h2>📊 Analytics & Loss Ratio</h2>
          <p>Financial health, claims performance, and actuarial metrics</p>
        </div>
      </div>

      {/* ── KPI CARDS ──────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card amber">
          <div className="label">Total Premiums</div>
          <div className="value amber">₹{totalPremiums.toFixed(0)}</div>
          <div className="stat-sub">{policies.length} policies issued</div>
        </div>
        <div className="stat-card green">
          <div className="label">Total Paid Out</div>
          <div className="value green">₹{totalPaidOut.toFixed(0)}</div>
          <div className="stat-sub">{approvedClaims} approved claims</div>
        </div>
        <div className={`stat-card ${lossRatio < 60 ? 'green' : lossRatio < 90 ? 'amber' : 'red'}`}>
          <div className="label">Loss Ratio</div>
          <div className={`value ${lossRatio < 60 ? 'green' : lossRatio < 90 ? 'amber' : 'red'}`}>
            {lossRatio.toFixed(1)}%
          </div>
          <div className="stat-sub">{lossRatioLabel(lossRatio)}</div>
        </div>
        <div className="stat-card blue">
          <div className="label">Claim Approval Rate</div>
          <div className="value blue">{approvalRate.toFixed(1)}%</div>
          <div className="stat-sub">{claims.length} total claims</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Policies</div>
          <div className="value">{activeWorkers}</div>
          <div className="stat-sub">workers covered this week</div>
        </div>
        <div className="stat-card red">
          <div className="label">Rejected Claims</div>
          <div className="value red">{rejectedClaims}</div>
          <div className="stat-sub">fraud / gate failures</div>
        </div>
      </div>

      {/* ── LOSS RATIO + CITY BREAKDOWN ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>

        {/* Gauge */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
          <div className="chart-title" style={{ alignSelf: 'flex-start' }}>Portfolio Loss Ratio</div>
          <div className="chart-sub" style={{ alignSelf: 'flex-start' }}>Payout ÷ Premium collected</div>
          <LossRatioGauge ratio={lossRatio} />
          <div style={{ width: '100%', marginTop: 20, fontSize: 12, color: '#64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #1e2d45' }}>
              <span>🟢 Healthy</span><span>&lt; 60%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #1e2d45' }}>
              <span>🟡 Monitor</span><span>60–90%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #1e2d45' }}>
              <span>🔴 Critical</span><span>&gt; 90%</span>
            </div>
          </div>
        </div>

        {/* City breakdown */}
        <div className="chart-card">
          <div className="chart-title">City-Level Loss Ratios</div>
          <div className="chart-sub">Premiums collected vs payouts by city</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cityData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
              <XAxis dataKey="city" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              <Bar dataKey="premiums" name="Premiums"  fill={COLORS.amber}  radius={[4,4,0,0]} />
              <Bar dataKey="paidOut"  name="Paid Out"  fill={COLORS.green}  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── CLAIMS TREND ───────────────────────────────── */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Claims Trend (Last 14 Days)</div>
          <div className="chart-sub">Approved vs rejected claims over time</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              <Bar dataKey="approved" name="Approved" fill={COLORS.green} radius={[3,3,0,0]} stackId="a" />
              <Bar dataKey="rejected" name="Rejected" fill={COLORS.red}   radius={[3,3,0,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform pie */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-title">Workers by Platform</div>
          <div className="chart-sub">Policy distribution across gig platforms</div>
          {platformData.length === 0 ? (
            <div className="empty"><div className="empty-icon">📊</div>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#334155' }}
                >
                  {platformData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── CITY LOSS RATIO TABLE ───────────────────────── */}
      <div className="table-card">
        <div className="table-header">
          <span>City Performance Summary</span>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
            Actuarial breakdown per market
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>City</th>
              <th>Total Premiums</th>
              <th>Total Claims</th>
              <th>Total Paid Out</th>
              <th>Loss Ratio</th>
              <th>Health</th>
            </tr>
          </thead>
          <tbody>
            {cityData.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                No data. Seed the database and run simulations.
              </td></tr>
            ) : cityData.map(city => (
              <tr key={city.city}>
                <td style={{ fontWeight: 700 }}>
                  {{ Bangalore: '🌆', Mumbai: '🌊', Delhi: '🏛️' }[city.city] || '📍'}{' '}
                  {city.city}
                </td>
                <td style={{ color: COLORS.amber }}>₹{city.premiums.toFixed(0)}</td>
                <td>{city.claims}</td>
                <td style={{ color: COLORS.green }}>₹{city.paidOut.toFixed(0)}</td>
                <td style={{ fontWeight: 800, color: lossRatioColor(city.lossRatio) }}>
                  {city.lossRatio}%
                </td>
                <td>
                  <span className={`loss-ratio-badge ${city.lossRatio < 60 ? 'healthy' : city.lossRatio < 90 ? 'warning' : 'critical'}`}>
                    {lossRatioLabel(city.lossRatio)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
