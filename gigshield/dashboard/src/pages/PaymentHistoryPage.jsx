// ─────────────────────────────────────────────────────────
// PAYMENT HISTORY PAGE — PaymentHistoryPage.jsx
// ─────────────────────────────────────────────────────────
// Displays all payments from PostgreSQL with:
//   - Status filter tabs (All / Success / Failed / Pending)
//   - Auto-refresh every 30s
//   - Color-coded status badges
//   - Revenue total at top
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import axios from 'axios'

function statusStyle(status) {
  switch (status) {
    case 'SUCCESS': return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' }
    case 'FAILED':  return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' }
    default:        return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' }
  }
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function SkeletonRow() {
  return (
    <tr>{[1,2,3,4,5,6].map(i => (
      <td key={i}><div className="skeleton" style={{ height: 14, width: i===1 ? 100 : 60, borderRadius: 4 }} /></td>
    ))}</tr>
  )
}

export default function PaymentHistoryPage() {
  const [payments,   setPayments]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('ALL')
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    let controller = new AbortController()

    const fetch = () => {
      controller.abort()
      controller = new AbortController()
      axios.get('/api/payment/history', { signal: controller.signal })
        .then(res => {
          setPayments(res.data.payments || [])
          setLoading(false)
          setLastUpdate(new Date())
        })
        .catch(err => { if (!axios.isCancel(err)) setLoading(false) })
    }

    fetch()
    const interval = setInterval(fetch, 30000)
    return () => { clearInterval(interval); controller.abort() }
  }, [])

  // ── STATS ─────────────────────────────────────────────
  const successPayments = payments.filter(p => p.status === 'SUCCESS')
  const failedCount     = payments.filter(p => p.status === 'FAILED').length
  const pendingCount    = payments.filter(p => p.status === 'PENDING').length
  const totalRevenue    = successPayments.reduce((s, p) => s + p.amount, 0) / 100
  const lossRatio       = payments.length > 0
    ? ((failedCount / payments.length) * 100).toFixed(1)
    : '0.0'

  // ── FILTER ────────────────────────────────────────────
  const visible = filter === 'ALL'
    ? payments
    : payments.filter(p => p.status === filter)

  const TABS = [
    { key: 'ALL',     label: `All (${payments.length})` },
    { key: 'SUCCESS', label: `Success (${successPayments.length})` },
    { key: 'FAILED',  label: `Failed (${failedCount})` },
    { key: 'PENDING', label: `Pending (${pendingCount})` },
  ]

  const tabColor = { SUCCESS: '#10b981', FAILED: '#ef4444', PENDING: '#f59e0b', ALL: '#60a5fa' }

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h2>🧾 Payment History</h2>
          <p>
            All Razorpay transactions · auto-refreshes every 30s
            {lastUpdate && (
              <span style={{ color: '#475569', marginLeft: 8 }}>
                · Updated {lastUpdate.toLocaleTimeString('en-IN')}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card amber">
          <div className="label">Total Collections</div>
          <div className="value amber">₹{totalRevenue.toFixed(2)}</div>
          <div className="stat-sub">{successPayments.length} successful payments</div>
        </div>
        <div className="stat-card green">
          <div className="label">Success Count</div>
          <div className="value green">{successPayments.length}</div>
          <div className="stat-sub">verified payments</div>
        </div>
        <div className="stat-card red">
          <div className="label">Failed Count</div>
          <div className="value red">{failedCount}</div>
          <div className="stat-sub">signature mismatches</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending</div>
          <div className="value">{pendingCount}</div>
          <div className="stat-sub">awaiting verification</div>
        </div>
        <div className={`stat-card ${parseFloat(lossRatio) < 20 ? 'green' : parseFloat(lossRatio) < 50 ? 'amber' : 'red'}`}>
          <div className="label">Payment Loss Ratio</div>
          <div className={`value ${parseFloat(lossRatio) < 20 ? 'green' : parseFloat(lossRatio) < 50 ? 'amber' : 'red'}`}>
            {lossRatio}%
          </div>
          <div className="stat-sub">failed / total payments</div>
        </div>
      </div>

      {/* ── FILTER TABS ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: 12, transition: 'all 0.15s',
              background: filter === tab.key ? `${tabColor[tab.key]}18` : 'transparent',
              color:      filter === tab.key ? tabColor[tab.key] : '#64748b',
              border:     `1px solid ${filter === tab.key ? `${tabColor[tab.key]}40` : '#1e2d45'}`
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TABLE ──────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-header">
          <span>Transactions</span>
          <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12 }}>
            {visible.length} records
          </span>
        </div>

        {loading ? (
          <table><tbody>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</tbody></table>
        ) : visible.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            {payments.length === 0
              ? 'No payments yet. Go to Pay Premium and make a test payment!'
              : `No ${filter.toLowerCase()} payments found.`}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Payment ID</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p => {
                const s = statusStyle(p.status)
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                      {p.orderId}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                      {p.paymentId || <span style={{ color: '#334155' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description || 'RouteSafe Insurance Premium'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                      ₹{(p.amount / 100).toFixed(2)}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 100,
                        fontSize: 11, fontWeight: 700,
                        color: s.color, background: s.bg,
                        border: `1px solid ${s.border}`
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>{fmtDate(p.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
