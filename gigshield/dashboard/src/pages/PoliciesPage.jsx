// ─────────────────────────────────────────────────────────
// POLICIES PAGE — PoliciesPage.jsx
// ─────────────────────────────────────────────────────────
// Shows all active and historical insurance policies.
// Linked to the workers and claims tables.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import axios from 'axios'

// Platform colors for badges
const PLATFORM_COLORS = {
  zomato: { color: '#E23744', bg: 'rgba(226,55,68,0.12)' },
  swiggy: { color: '#FC8019', bg: 'rgba(252,128,25,0.12)' }
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')   // 'all' | 'active' | 'expired'

  useEffect(() => {
    axios.get('/api/policies')
      .then(res => {
        setPolicies(res.data.policies || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Summary stats
  const activePolicies  = policies.filter(p => !p.isExpired && p.coverageActive)
  const expiredPolicies = policies.filter(p => p.isExpired)
  const totalPremiums   = policies.reduce((s, p) => s + (p.premiumAmount || 0), 0)
  const totalPaid       = policies.reduce((s, p) => s + (p.totalPaidOut || 0), 0)

  // Filtered view
  const visible = policies.filter(p => {
    if (filter === 'active')  return !p.isExpired && p.coverageActive
    if (filter === 'expired') return p.isExpired
    return true
  })

  return (
    <div>
      <div className="page-header">
        <h2>📄 Policy Management</h2>
        <p>All RouteSafe Insurance insurance policies — weekly parametric wage protection</p>
      </div>

      {/* ── STAT CARDS ───────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Policies</div>
          <div className="value amber">{policies.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Policies</div>
          <div className="value green">{activePolicies.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Premiums Collected</div>
          <div className="value amber">₹{totalPremiums.toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Paid Out</div>
          <div className="value" style={{ color: '#4ade80' }}>₹{totalPaid.toFixed(0)}</div>
        </div>
      </div>

      {/* ── FILTER TABS ──────────────────────────────── */}
      <div style={styles.filterRow}>
        {[
          { key: 'all',     label: `All (${policies.length})` },
          { key: 'active',  label: `Active (${activePolicies.length})` },
          { key: 'expired', label: `Expired (${expiredPolicies.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              ...styles.filterBtn,
              background: filter === tab.key ? '#1e40af' : 'transparent',
              color:      filter === tab.key ? '#93c5fd' : '#64748b',
              border:     `1px solid ${filter === tab.key ? '#1e40af' : '#1e293b'}`
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── POLICY CARDS GRID ────────────────────────── */}
      {loading ? (
        <div className="loading">Loading policies...</div>
      ) : visible.length === 0 ? (
        <div className="empty">
          No policies found. Register workers and run simulations to generate policies.
        </div>
      ) : (
        <div style={styles.cardGrid}>
          {visible.map(policy => {
            const worker   = policy.worker
            const isActive = !policy.isExpired && policy.coverageActive

            return (
              <div key={policy.id} style={{
                ...styles.policyCard,
                borderColor: isActive ? '#22c55e' : '#334155',
                opacity: policy.isExpired ? 0.75 : 1
              }}>

                {/* Card header */}
                <div style={styles.cardHeader}>
                  <div style={styles.cityRow}>
                    <span style={{ fontSize: 20 }}>
                      {{ Bangalore: '🌆', Mumbai: '🌊', Delhi: '🏛️' }[worker?.city] || '📍'}
                    </span>
                    <div>
                      <div style={styles.cityName}>{worker?.city || 'Unknown'}</div>
                      <div style={styles.zoneName}>Zone {worker?.zone}</div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    ...styles.statusBadge,
                    background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                    color: isActive ? '#22c55e' : '#64748b'
                  }}>
                    {isActive ? '● Active' : '○ Expired'}
                  </span>
                </div>

                {/* Platform badges */}
                <div style={styles.platformsRow}>
                  {(worker?.platforms || []).map(p => (
                    <span key={p} style={{
                      ...styles.platformBadge,
                      color:      (PLATFORM_COLORS[p] || PLATFORM_COLORS.zomato).color,
                      background: (PLATFORM_COLORS[p] || PLATFORM_COLORS.zomato).bg
                    }}>
                      {p === 'zomato' ? '🍕' : '🛵'} {p}
                    </span>
                  ))}
                </div>

                {/* Policy details */}
                <div style={styles.detailsBlock}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Coverage Period</span>
                    <span style={styles.detailValue}>
                      {fmt(policy.weekStartDate)} – {fmt(policy.weekEndDate)}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Weekly Premium</span>
                    <span style={{ ...styles.detailValue, color: '#fbbf24', fontWeight: 700 }}>
                      ₹{policy.premiumAmount?.toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Premium Paid</span>
                    <span style={styles.detailValue}>
                      {policy.premiumPaid
                        ? <span style={{ color: '#22c55e' }}>✓ Collected</span>
                        : <span style={{ color: '#f87171' }}>✗ Pending</span>
                      }
                    </span>
                  </div>
                </div>

                {/* Claims summary */}
                <div style={styles.claimsSummary}>
                  <div style={styles.claimStat}>
                    <div style={styles.claimNum}>{policy.claimsCount || 0}</div>
                    <div style={styles.claimLbl}>Claims</div>
                  </div>
                  <div style={styles.claimStat}>
                    <div style={{ ...styles.claimNum, color: '#22c55e' }}>{policy.claimsPaid || 0}</div>
                    <div style={styles.claimLbl}>Paid Out</div>
                  </div>
                  <div style={styles.claimStat}>
                    <div style={{ ...styles.claimNum, color: '#4ade80' }}>
                      ₹{(policy.totalPaidOut || 0).toFixed(0)}
                    </div>
                    <div style={styles.claimLbl}>Total ₹ Out</div>
                  </div>
                  <div style={styles.claimStat}>
                    <div style={{ ...styles.claimNum, color: '#fbbf24' }}>
                      {policy.premiumAmount > 0
                        ? `${(((policy.totalPaidOut || 0) / policy.premiumAmount) * 100).toFixed(0)}%`
                        : '—'
                      }
                    </div>
                    <div style={styles.claimLbl}>Loss Ratio</div>
                  </div>
                </div>

                {/* Worker hash */}
                <div style={styles.hashRow}>
                  <span style={{ color: '#475569', fontSize: 10 }}>RouteSafe Insurance ID: </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>
                    {(worker?.workerHash || '').substring(0, 20)}...
                  </span>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────
const styles = {
  filterRow: { display: 'flex', gap: 8, margin: '0 0 20px', flexWrap: 'wrap' },
  filterBtn: {
    padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
    fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16
  },
  policyCard: {
    background: '#0f172a', border: '1px solid',
    borderRadius: 16, padding: '18px 20px',
    display: 'flex', flexDirection: 'column', gap: 14
  },
  cardHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cityRow:       { display: 'flex', gap: 10, alignItems: 'center' },
  cityName:      { fontWeight: 700, fontSize: 16, color: '#f1f5f9' },
  zoneName:      { fontSize: 11, color: '#64748b', marginTop: 2 },
  statusBadge:   { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 },
  platformsRow:  { display: 'flex', gap: 6 },
  platformBadge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  detailsBlock:  { display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #1e293b', paddingTop: 12 },
  detailRow:     { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
  detailLabel:   { color: '#64748b' },
  detailValue:   { color: '#f1f5f9', fontWeight: 500 },
  claimsSummary: {
    display: 'flex', justifyContent: 'space-between',
    background: '#1e293b', borderRadius: 10, padding: '12px 16px'
  },
  claimStat:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  claimNum:   { fontWeight: 800, fontSize: 16, color: '#f1f5f9' },
  claimLbl:   { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  hashRow:    { display: 'flex', gap: 4, borderTop: '1px solid #1e293b', paddingTop: 10 }
}
