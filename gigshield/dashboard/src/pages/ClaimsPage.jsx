// ClaimsPage.jsx — Shows all claims from the database
// Fetches from GET /api/claims and shows gate results,
// payout amounts, and fraud check outcomes

import { useEffect, useState } from 'react'
import axios from 'axios'

// Helper: pick the right badge class based on payout status
function statusBadge(status) {
  if (!status) return 'badge badge-pending'
  if (status === 'approved')           return 'badge badge-approved'
  if (status.includes('rejected'))     return 'badge badge-rejected'
  if (status.includes('duplicate'))    return 'badge badge-duplicate'
  return 'badge badge-pending'
}

// Helper: format a date/time string into a human-readable format
function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export default function ClaimsPage() {
  const [claims, setClaims]   = useState([])
  const [loading, setLoading] = useState(true)

  // Auto-refresh claims every 10 seconds so new ones appear automatically
  useEffect(() => {
    const fetchClaims = () => {
      axios.get('/api/claims')
        .then(res => { setClaims(res.data.claims); setLoading(false) })
        .catch(() => setLoading(false))
    }
    fetchClaims()                      // Fetch immediately on page load
    const interval = setInterval(fetchClaims, 10000) // Then every 10s
    return () => clearInterval(interval)  // Cleanup when page unmounts
  }, [])

  // Count claims by status for the summary row
  const approved  = claims.filter(c => c.payoutStatus === 'approved').length
  const rejected  = claims.filter(c => c.payoutStatus === 'rejected').length
  const pending   = claims.filter(c => c.payoutStatus === 'pending_fraud_check').length
  const totalPaid = claims
    .filter(c => c.payoutStatus === 'approved')
    .reduce((s, c) => s + (c.payoutAmount || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h2>📋 Claims Feed</h2>
        <p>Live claim pipeline. Auto-refreshes every 10 seconds.</p>
      </div>

      {/* Summary stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Claims</div>
          <div className="value">{claims.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Approved</div>
          <div className="value green">{approved}</div>
        </div>
        <div className="stat-card">
          <div className="label">Rejected</div>
          <div className="value red">{rejected}</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending Check</div>
          <div className="value">{pending}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Paid Out</div>
          <div className="value amber">₹{totalPaid.toFixed(0)}</div>
        </div>
      </div>

      {/* Claims table */}
      <div className="table-card">
        <div className="table-header">All Claims (Most Recent First)</div>
        {loading ? (
          <div className="loading">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="empty">
            No claims yet. Use the Simulate page to trigger one!
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Disruption Type</th>
                <th>Gate 1</th>
                <th>Gate 2</th>
                <th>Fraud OK</th>
                <th>Hours Lost</th>
                <th>Payout (₹)</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(claim => (
                <tr key={claim.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {claim.id.substring(0, 8)}...
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {claim.disruptionType.replace('_', ' ')}
                  </td>
                  {/* Gate pass/fail indicators */}
                  <td><span className={`gate ${claim.gate1Passed ? 'pass' : 'fail'}`} /></td>
                  <td><span className={`gate ${claim.gate2Passed ? 'pass' : 'fail'}`} /></td>
                  <td><span className={`gate ${claim.fraudCheckPassed ? 'pass' : 'fail'}`} /></td>
                  <td>{claim.hoursLost}h</td>
                  <td style={{ fontWeight: 600 }}>
                    {claim.payoutAmount > 0 ? `₹${claim.payoutAmount}` : '—'}
                  </td>
                  <td>
                    <span className={statusBadge(claim.payoutStatus)}>
                      {claim.payoutStatus?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>{fmtDate(claim.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
