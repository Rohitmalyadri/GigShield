// ─────────────────────────────────────────────────────────
// PAYMENT PAGE — PaymentPage.jsx  (Redesigned)
// ─────────────────────────────────────────────────────────
// LEFT  — Premium Collection  (worker pays their weekly premium)
// RIGHT — Batch Claim Payout  (ONE button pays ALL approved claims)
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

// ── LIVE PAYOUT LOG ROW ───────────────────────────────────
function PayoutRow({ item, index }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 120)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        12,
      padding:    '10px 14px',
      background: item.status === 'SUCCESS' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      borderRadius: 8,
      border:     `1px solid ${item.status === 'SUCCESS' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      opacity:    visible ? 1 : 0,
      transform:  visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'all 0.3s ease',
    }}>
      <span style={{ fontSize: 18 }}>{item.status === 'SUCCESS' ? '✅' : '❌'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{item.worker}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
          Zone {item.zone} · {item.orderId?.substring(0, 16)}...
        </div>
      </div>
      <div style={{
        fontWeight: 800, fontSize: 16,
        color: item.status === 'SUCCESS' ? '#10b981' : '#ef4444'
      }}>
        {item.status === 'SUCCESS' ? `₹${item.amount}` : 'FAILED'}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
export default function PaymentPage() {

  // ── PREMIUM COLLECTION STATE ────────────────────────────
  const [workers,        setWorkers]        = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [amount,         setAmount]         = useState('')
  const [description,    setDescription]    = useState('RouteSafe Insurance Weekly Premium')
  const [premLoading,    setPremLoading]    = useState(false)
  const [workersLoading, setWorkersLoading] = useState(true)
  const [premStatus,     setPremStatus]     = useState(null)  // null | 'success' | 'failed'
  const [premData,       setPremData]       = useState(null)
  const [premError,      setPremError]      = useState(null)

  // ── BATCH PAYOUT STATE ──────────────────────────────────
  const [batchLoading,    setBatchLoading]    = useState(false)
  const [batchDone,       setBatchDone]       = useState(false)
  const [batchResults,    setBatchResults]    = useState([])
  const [batchSummary,    setBatchSummary]    = useState(null)
  const [pendingSummary,  setPendingSummary]  = useState(null)  // { count, totalAmount, claims[] }
  const logRef = useRef(null)

  // ── LOAD DATA ───────────────────────────────────────────
  useEffect(() => {
    axios.get('/api/workers').then(r => {
      setWorkers(r.data.workers || [])
      setWorkersLoading(false)
    }).catch(() => setWorkersLoading(false))

    // Load pending payout summary
    axios.get('/api/payment/pending-summary').then(r => {
      setPendingSummary(r.data)
    }).catch(() => setPendingSummary({ count: 0, totalAmount: 0, claims: [] }))
  }, [])


  // Scroll log to bottom as results come in
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [batchResults])

  // ── PREMIUM PAYMENT ─────────────────────────────────────
  const handlePremiumPayment = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setPremError('Enter a valid amount.')
      return
    }
    setPremLoading(true)
    setPremError(null)
    try {
      const orderRes = await axios.post('/api/payment/create-order', {
        amount:     Number(amount),
        currency:   'INR',
        workerHash: selectedWorker?.workerHash || null,
        description,
      })
      const { orderId, keyId, amount: amountPaise, currency } = orderRes.data

      const rzp = new window.Razorpay({
        key:         keyId,
        amount:      amountPaise,
        currency,
        name:        'RouteSafe Insurance',
        description,
        order_id:    orderId,
        prefill:     { name: selectedWorker?.name || 'Worker', contact: '9876543210' },
        theme:       { color: '#f59e0b' },
        handler: async (resp) => {
          try {
            const vr = await axios.post('/api/payment/verify', {
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
            })
            setPremStatus(vr.data.success ? 'success' : 'failed')
            setPremData(vr.data)
          } catch { setPremStatus('failed') }
          finally { setPremLoading(false) }
        },
        modal: { ondismiss: () => { setPremStatus(null); setPremLoading(false) } }
      })
      rzp.on('payment.failed', () => { setPremStatus('failed'); setPremLoading(false) })
      rzp.open()
    } catch (err) {
      setPremError(err.response?.data?.error || err.message)
      setPremLoading(false)
    }
  }

  // ── BATCH PAYOUT via RAZORPAY ───────────────────────────
  const handleBatchPayout = async () => {
    if (!pendingSummary || pendingSummary.count === 0) return

    setBatchLoading(true)
    setBatchDone(false)
    setBatchResults([])
    setBatchSummary(null)

    try {
      // Step 1: Create a single Razorpay order for the total amount
      const orderRes = await axios.post('/api/payment/create-order', {
        amount:      pendingSummary.totalAmount,
        currency:    'INR',
        description: `GigShield Bulk Claim Payout — ${pendingSummary.count} workers`,
      })
      const { orderId, keyId, amount: amountPaise, currency } = orderRes.data

      // Step 2: Open real Razorpay checkout for total
      const rzp = new window.Razorpay({
        key:         keyId,
        amount:      amountPaise,
        currency,
        name:        'RouteSafe Insurance',
        description: `Payout to ${pendingSummary.count} workers · All approved claims`,
        order_id:    orderId,
        prefill:     { name: 'Admin — RouteSafe Insurance', contact: '9876543210' },
        theme:       { color: '#10b981' },  // Green for payout

        handler: async (resp) => {
          // Step 3: Payment done — verify then fire batch settlements
          try {
            // Verify the Razorpay signature first
            const verifyRes = await axios.post('/api/payment/verify', {
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
            })

            if (!verifyRes.data.success) {
              setBatchSummary({ error: 'Razorpay signature verification failed' })
              setBatchDone(true)
              setBatchLoading(false)
              return
            }

            // Step 4: Mark all approved claims paid, record real payment ID
            const batchRes = await axios.post('/api/payment/batch-payout', {
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id:   resp.razorpay_order_id,
            })

            const { results, totalFired, totalFailed, totalAmount } = batchRes.data

            // Step 5: Stream results for dramatic effect
            for (let i = 0; i < results.length; i++) {
              await new Promise(r => setTimeout(r, 120))
              setBatchResults(prev => [...prev, results[i]])
            }

            setBatchSummary({ totalFired, totalFailed, totalAmount, paymentId: resp.razorpay_payment_id })
            setBatchDone(true)
            setPendingSummary(prev => ({ ...prev, count: totalFailed > 0 ? totalFailed : 0 }))

          } catch (err) {
            setBatchSummary({ error: err.response?.data?.error || err.message })
            setBatchDone(true)
          } finally {
            setBatchLoading(false)
          }
        },

        modal: {
          ondismiss: () => {
            setBatchLoading(false)
            setBatchDone(false)
          }
        }
      })

      rzp.on('payment.failed', (resp) => {
        setBatchSummary({ error: `Payment failed: ${resp.error.description}` })
        setBatchDone(true)
        setBatchLoading(false)
      })

      rzp.open()

    } catch (err) {
      setBatchSummary({ error: err.response?.data?.error || err.message })
      setBatchDone(true)
      setBatchLoading(false)
    }
  }

  const resetBatch = () => {
    setBatchDone(false)
    setBatchResults([])
    setBatchSummary(null)
    axios.get('/api/payment/pending-summary').then(r => {
      setPendingSummary(r.data)
    }).catch(() => {})
  }

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h2>💳 Payments</h2>
          <p>Collect weekly premiums · Fire instant claim payouts</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ══ LEFT: PREMIUM COLLECTION ══════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={card}>
            <div style={sectionTitle}>📥 Collect Weekly Premium</div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              Worker pays their weekly insurance premium via Razorpay
            </div>

            {/* Premium success */}
            {premStatus === 'success' && (
              <div style={successBox}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: 18 }}>Payment Collected!</div>
                <div style={{ color: '#f59e0b', fontSize: 28, fontWeight: 900, margin: '8px 0' }}>
                  ₹{premData?.amount}
                </div>
                <div style={{ color: '#64748b', fontSize: 11 }}>
                  ID: <code>{premData?.paymentId}</code>
                </div>
                <button onClick={() => { setPremStatus(null); setPremData(null) }} style={ghostBtn}>
                  ← Collect Another
                </button>
              </div>
            )}

            {premStatus !== 'success' && (
              <>
                {/* Worker picker */}
                <div style={{ marginBottom: 16 }}>
                  <div style={fieldLabel}>Select Worker (auto-fills premium)</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {workersLoading ? (
                      <div style={{ color: '#64748b', fontSize: 13 }}>Loading...</div>
                    ) : workers.slice(0, 10).map(w => (
                      <div key={w.id} onClick={() => {
                        setSelectedWorker(w)
                        setAmount(Math.round(w.calculatedPremium || 0).toString())
                        setDescription(`RouteSafe — ${w.name} (${w.city})`)
                        setPremError(null)
                      }} style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${selectedWorker?.id === w.id ? 'rgba(245,158,11,0.5)' : '#1e2d45'}`,
                        background: selectedWorker?.id === w.id ? 'rgba(245,158,11,0.08)' : '#0d1a2d',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                          <div style={{ color: '#64748b', fontSize: 11 }}>{w.city} · Zone {w.zone}</div>
                        </div>
                        <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14 }}>
                          ₹{Math.round(w.calculatedPremium || 0)}/wk
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ marginBottom: 12 }}>
                  <div style={fieldLabel}>Amount (₹)</div>
                  <input
                    type="number" value={amount} placeholder="e.g. 75"
                    onChange={e => { setAmount(e.target.value); setPremError(null) }}
                    style={inputStyle} min="1"
                  />
                </div>

                {premError && (
                  <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>⚠️ {premError}</div>
                )}

                <button
                  onClick={handlePremiumPayment}
                  disabled={premLoading || !amount}
                  style={{
                    ...bigBtn,
                    background: premLoading || !amount ? '#334155' : 'linear-gradient(135deg, #d97706, #f59e0b)',
                    color:      premLoading || !amount ? '#64748b' : '#000',
                    cursor:     premLoading || !amount ? 'not-allowed' : 'pointer'
                  }}
                >
                  {premLoading ? '⏳ Opening Razorpay...' : `💳 Pay ₹${amount || '0'} with Razorpay`}
                </button>

                <div style={{ textAlign: 'center', marginTop: 8, color: '#334155', fontSize: 11 }}>
                  🔒 Razorpay Test Mode · Use card 4111 1111 1111 1111 · OTP: 1234
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ RIGHT: BATCH CLAIM PAYOUT ═════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={card}>
            <div style={sectionTitle}>🚀 Instant Batch Claim Payout</div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 20 }}>
              One button fires payouts for ALL approved claims simultaneously via Razorpay
            </div>

            {/* Pending count pill */}
            {!batchDone && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10, marginBottom: 20,
                background: (pendingSummary?.count || 0) > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${(pendingSummary?.count || 0) > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)'}`
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>
                    {pendingSummary === null ? '...' : pendingSummary.count} approved claims
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                    Total: <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                      ₹{(pendingSummary?.totalAmount || 0).toLocaleString()}
                    </span> waiting for payout
                  </div>
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 900,
                  color: (pendingSummary?.count || 0) > 0 ? '#f59e0b' : '#10b981'
                }}>
                  {pendingSummary === null ? '⏳' : (pendingSummary.count || 0) > 0 ? '💸' : '✓'}
                </div>
              </div>
            )}

            {/* THE BIG BUTTON */}
            {!batchDone && (
              <button
                onClick={handleBatchPayout}
                disabled={batchLoading || !pendingSummary || pendingSummary.count === 0}
                style={{
                  ...bigBtn,
                  width: '100%',
                  background: batchLoading || !pendingSummary || pendingSummary.count === 0
                    ? '#334155'
                    : 'linear-gradient(135deg, #059669, #10b981)',
                  color:   batchLoading || !pendingSummary || pendingSummary.count === 0 ? '#64748b' : '#fff',
                  cursor:  batchLoading || !pendingSummary || pendingSummary.count === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  boxShadow: batchLoading || !pendingSummary || pendingSummary.count === 0
                    ? 'none'
                    : '0 4px 24px rgba(16,185,129,0.35)'
                }}
              >
                {batchLoading
                  ? '⚡ Opening Razorpay...'
                  : !pendingSummary || pendingSummary.count === 0
                    ? '✓ All claims paid'
                    : `🚀 Pay ₹${(pendingSummary.totalAmount || 0).toLocaleString()} via Razorpay`
                }
              </button>
            )}

            {/* Live firing log */}
            {(batchLoading || batchResults.length > 0) && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  {batchLoading ? '⚡ Live Payout Stream' : '📋 Payout Results'}
                </div>
                <div
                  ref={logRef}
                  style={{
                    maxHeight: 300, overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 6
                  }}
                >
                  {batchResults.map((item, i) => (
                    <PayoutRow key={item.claimId} item={item} index={i} />
                  ))}
                  {batchLoading && batchResults.length === 0 && (
                    <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>
                      ⚡ Connecting to Razorpay...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary card after completion */}
            {batchDone && batchSummary && !batchSummary.error && (
              <div style={{
                marginTop: 20, padding: '20px', borderRadius: 12, textAlign: 'center',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)'
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: 18, marginBottom: 4 }}>
                  Batch Payout Complete!
                </div>
                <div style={{ color: '#f59e0b', fontSize: 32, fontWeight: 900, margin: '8px 0' }}>
                  ₹{(batchSummary.totalAmount || 0).toLocaleString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{batchSummary.totalFired}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Workers Paid</div>
                  </div>
                  {batchSummary.totalFailed > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{batchSummary.totalFailed}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Failed</div>
                    </div>
                  )}
                </div>
                {batchSummary.paymentId && (
                  <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
                    Razorpay TXN: <code style={{ color: '#60a5fa' }}>{batchSummary.paymentId}</code>
                  </div>
                )}
                <button onClick={resetBatch} style={{ ...ghostBtn, marginTop: 16 }}>
                  ← Reset
                </button>
              </div>
            )}

            {batchDone && batchSummary?.error && (
              <div style={{ marginTop: 16, color: '#ef4444', fontSize: 13 }}>
                ❌ Error: {batchSummary.error}
              </div>
            )}
          </div>

          {/* Info box */}
          <div style={{
            ...card,
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.15)'
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 12 }}>
              ⚡ How Batch Payout Works
            </div>
            {[
              ['🔍', 'Scan', 'Finds all claims where Gate 1 + Gate 2 + Fraud checks all passed'],
              ['💳', 'Fire', 'Creates a real Razorpay order for each — batch processed in parallel'],
              ['📝', 'Audit', 'Every payout logged to DB with order ID and timestamp'],
              ['✅', 'Close', 'Claims marked "paid" — cannot be double-paid'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── STYLES ──────────────────────────────────────────────────
const card = {
  background: '#0f1520', border: '1px solid #1e2d45',
  borderRadius: 14, padding: 20,
}
const sectionTitle = {
  fontSize: 15, fontWeight: 800, color: '#f1f5f9', marginBottom: 4
}
const fieldLabel = {
  fontSize: 11, color: '#64748b', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6
}
const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#161d2e', border: '1px solid #1e2d45',
  borderRadius: 8, color: '#f1f5f9', fontSize: 14,
  outline: 'none', boxSizing: 'border-box'
}
const bigBtn = {
  width: '100%', padding: '15px',
  border: 'none', borderRadius: 10,
  fontWeight: 800, fontSize: 15,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  transition: 'all 0.2s',
}
const successBox = {
  textAlign: 'center', padding: '20px 0'
}
const ghostBtn = {
  padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
  background: 'transparent', border: '1px solid #1e2d45',
  color: '#64748b', fontSize: 13, fontWeight: 600, marginTop: 8
}
