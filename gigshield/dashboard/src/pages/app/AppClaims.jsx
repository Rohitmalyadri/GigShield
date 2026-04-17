// ─────────────────────────────────────────────────────────
// APP CLAIMS — Claims history for the worker
// ─────────────────────────────────────────────────────────
// Shows all past claims with payout breakdowns.
// Fetches from GET /api/worker/:hash which includes claims.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function AppClaims() {
  const navigate = useNavigate()
  const [claims,  setClaims]  = useState([])
  const [loading, setLoading] = useState(true)
  const [worker,  setWorker]  = useState(null)

  const workerHash = sessionStorage.getItem('RouteSafe Insurance_worker_hash')

  useEffect(() => {
    if (!workerHash) {
      navigate('/app/register')
      return
    }
    axios.get(`/api/worker/${workerHash}`)
      .then(r => {
        setWorker(r.data.worker)
        setClaims(r.data.worker.recentClaims || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workerHash, navigate])

  const totalPaid = claims
    .filter(c => c.payoutStatus === 'approved' || c.payoutStatus === 'simulated')
    .reduce((s, c) => s + (c.payoutAmount || 0), 0)

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading claims...</div>
  }

  return (
    <div style={s.page}>

      {/* ── HEADER ──────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerTitle}>Claims History</div>
        <div style={s.headerSub}>All auto-processed insurance claims</div>
      </div>

      {/* ── SUMMARY STATS ───────────────────────────── */}
      <div style={s.statsRow}>
        <div style={s.statBox}>
          <div style={s.statNum}>{claims.length}</div>
          <div style={s.statLabel}>Total Claims</div>
        </div>
        <div style={s.statBox}>
          <div style={{ ...s.statNum, color: '#10B981' }}>
            {claims.filter(c => c.payoutStatus === 'approved' || c.payoutStatus === 'simulated').length}
          </div>
          <div style={s.statLabel}>Paid Out</div>
        </div>
        <div style={s.statBox}>
          <div style={{ ...s.statNum, color: '#10B981' }}>₹{totalPaid.toFixed(0)}</div>
          <div style={s.statLabel}>Total ₹</div>
        </div>
      </div>

      {/* ── CLAIMS LIST ─────────────────────────────── */}
      {claims.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1C' }}>No claims yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, lineHeight: 1.6 }}>
            When a disruption affects your zone,<br />
            RouteSafe Insurance will auto-file and process claims instantly.
          </div>
        </div>
      ) : (
        <div style={s.claimsList}>
          {claims.map(claim => {
            const approved = claim.payoutStatus === 'approved' || claim.payoutStatus === 'simulated'
            const rejected = claim.payoutStatus?.includes('rejected')
            return (
              <div key={claim.id} style={s.claimCard}>

                {/* Claim header */}
                <div style={s.claimHeader}>
                  <div style={s.claimLeft}>
                    <span style={{ fontSize: 20 }}>
                      {claim.disruptionType === 'heavy_rainfall' ? '🌧️' : '⚠️'}
                    </span>
                    <div>
                      <div style={s.claimTitle}>
                        {claim.disruptionType === 'heavy_rainfall' ? 'Heavy Rainfall' : claim.disruptionType}
                      </div>
                      <div style={s.claimDate}>
                        {new Date(claim.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    ...s.statusBadge,
                    background: approved ? '#ECFDF5' : rejected ? '#FEE2E5' : '#FFF3E6',
                    color: approved ? '#047857' : rejected ? '#E23744' : '#D97706'
                  }}>
                    {approved ? '✓ Paid' : rejected ? '✗ Rejected' : '⏳ Pending'}
                  </div>
                </div>

                {/* Gate results */}
                <div style={s.gatesRow}>
                  <div style={s.gateChip}>
                    {claim.gate1Passed ? '✅' : '❌'} Gate 1
                  </div>
                  <div style={s.gateChip}>
                    {claim.gate2Passed ? '✅' : '❌'} Gate 2
                  </div>
                  <div style={s.gateChip}>
                    {claim.fraudCheckPassed ? '✅' : '❌'} Fraud
                  </div>
                </div>

                {/* Payout breakdown */}
                {approved && (
                  <div style={s.breakdown}>
                    <div style={s.breakRow}>
                      <span>Hours lost</span>
                      <span style={{ fontWeight: 600 }}>{claim.hoursLost}h</span>
                    </div>
                    <div style={s.breakRow}>
                      <span>Payout rate</span>
                      <span style={{ fontWeight: 600, color: '#10B981' }}>75%</span>
                    </div>
                    <div style={{ ...s.breakRow, borderTop: '1px solid #F3F4F6', paddingTop: 8 }}>
                      <span style={{ fontWeight: 700, color: '#1C1C1C' }}>Amount credited</span>
                      <span style={{ fontWeight: 800, color: '#10B981', fontSize: 16 }}>
                        ₹{claim.payoutAmount?.toFixed(0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rejected reason */}
                {rejected && (
                  <div style={s.rejectedNote}>
                    {claim.payoutStatus === 'duplicate_rejected'
                      ? 'Duplicate claim — one payout per disruption event per worker.'
                      : claim.payoutStatus === 'fraud_rejected_gps'
                        ? 'GPS spoofing detected — claim rejected.'
                        : 'Claim did not pass validation gates.'}
                  </div>
                )}

                {/* Claim ID */}
                <div style={s.claimId}>
                  ID: {claim.id.substring(0, 8)}...
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
const s = {
  page: { padding: '0 0 24px', background: '#F7F7F7', minHeight: '100%' },

  header: { padding: '16px 16px 12px', background: '#fff', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#1C1C1C' },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  statsRow: {
    display: 'flex', gap: 8, padding: '0 16px', marginBottom: 12
  },
  statBox: {
    flex: 1, background: '#fff', borderRadius: 12,
    padding: '14px 12px', textAlign: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  statNum: { fontSize: 20, fontWeight: 800, color: '#1C1C1C' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 500 },

  empty: {
    margin: '0 16px', background: '#fff', borderRadius: 14,
    padding: '40px 20px', textAlign: 'center',
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
  },

  claimsList: {
    padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10
  },
  claimCard: {
    background: '#fff', borderRadius: 14, padding: '16px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
  },
  claimHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10
  },
  claimLeft: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  claimTitle: { fontSize: 14, fontWeight: 700, color: '#1C1C1C' },
  claimDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: {
    fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8
  },

  gatesRow: {
    display: 'flex', gap: 8, marginBottom: 10
  },
  gateChip: {
    fontSize: 12, fontWeight: 600, color: '#6B7280',
    background: '#F9FAFB', padding: '4px 10px', borderRadius: 6
  },

  breakdown: {
    background: '#F9FAFB', borderRadius: 10, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8
  },
  breakRow: {
    display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280'
  },

  rejectedNote: {
    background: '#FEE2E5', borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#E23744', lineHeight: 1.5, marginBottom: 8
  },

  claimId: {
    fontSize: 11, color: '#D1D5DB', fontFamily: 'monospace', marginTop: 4
  }
}
