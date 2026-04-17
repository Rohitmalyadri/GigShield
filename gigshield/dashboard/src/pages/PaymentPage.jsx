// ─────────────────────────────────────────────────────────
// PAYMENT PAGE — PaymentPage.jsx
// ─────────────────────────────────────────────────────────
// Handles the full Razorpay checkout flow:
//   1. Worker selects amount (or auto-fill from premium)
//   2. Click "Pay with Razorpay"
//   3. Backend creates order → Returns order_id
//   4. Razorpay modal opens
//   5. On success → backend verifies signature
//   6. Show success/failure screen
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import axios from 'axios'

// ── STATUS BANNER ─────────────────────────────────────────
function StatusBanner({ status, data }) {
  if (!status) return null

  const isSuccess = status === 'success'
  const isFailure = status === 'failed'
  const isPending = status === 'pending'

  return (
    <div style={{
      padding: '24px',
      borderRadius: 14,
      marginBottom: 24,
      background: isSuccess ? 'rgba(16,185,129,0.12)'
                : isFailure ? 'rgba(239,68,68,0.12)'
                : 'rgba(59,130,246,0.12)',
      border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.3)'
               : isFailure ? 'rgba(239,68,68,0.3)'
               : 'rgba(59,130,246,0.3)'}`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>
        {isSuccess ? '✅' : isFailure ? '❌' : '⏳'}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 800,
        color: isSuccess ? '#10b981' : isFailure ? '#ef4444' : '#3b82f6'
      }}>
        {isSuccess ? 'Payment Successful!' : isFailure ? 'Payment Failed' : 'Processing...'}
      </div>
      {isSuccess && data && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: '#f59e0b', fontSize: 28, fontWeight: 900 }}>
            ₹{data.amount}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            Payment ID: <code style={{ color: '#60a5fa' }}>{data.paymentId}</code>
          </div>
          <div style={{ color: '#10b981', fontSize: 13, marginTop: 4 }}>
            {data.message}
          </div>
        </div>
      )}
      {isFailure && (
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
          Payment could not be verified. Please try again.
        </div>
      )}
    </div>
  )
}

// ── WORKER SELECTOR CHIP ──────────────────────────────────
function WorkerChip({ worker, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        border: `1px solid ${selected ? 'rgba(245,158,11,0.5)' : '#1e2d45'}`,
        background: selected ? 'rgba(245,158,11,0.1)' : '#0f1520',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{worker.name}</div>
        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
          {worker.city} · Zone {worker.zone}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#f59e0b', fontWeight: 800 }}>
          ₹{worker.calculatedPremium || worker.currentWeeklyPremium || 0}
        </div>
        <div style={{ color: '#64748b', fontSize: 10 }}>/week</div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════
export default function PaymentPage() {
  const [workers,        setWorkers]        = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [amount,         setAmount]         = useState('')
  const [description,    setDescription]    = useState('RouteSafe Insurance Weekly Premium')
  const [loading,        setLoading]        = useState(false)
  const [workersLoading, setWorkersLoading] = useState(true)
  const [paymentStatus,  setPaymentStatus]  = useState(null) // null | 'success' | 'failed' | 'pending'
  const [paymentData,    setPaymentData]    = useState(null)
  const [error,          setError]          = useState(null)

  // Load workers on mount
  useEffect(() => {
    axios.get('/api/workers')
      .then(res => {
        setWorkers(res.data.workers || [])
        setWorkersLoading(false)
      })
      .catch(() => setWorkersLoading(false))
  }, [])

  // Auto-fill amount when worker selected
  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker)
    const premium = worker.calculatedPremium || worker.currentWeeklyPremium || 0
    if (premium > 0) setAmount(Math.round(premium).toString())
    setDescription(`RouteSafe Insurance Weekly Premium — ${worker.name} (${worker.city})`)
    setPaymentStatus(null)
    setError(null)
  }

  // ── MAIN PAYMENT HANDLER ────────────────────────────────
  const handlePayment = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    setLoading(true)
    setError(null)
    setPaymentStatus('pending')

    try {
      // ── STEP 3: Call backend to create Razorpay order ───
      const orderRes = await axios.post('/api/payment/create-order', {
        amount:      Number(amount),
        currency:    'INR',
        workerHash:  selectedWorker?.workerHash || null,
        description: description,
      })

      const { orderId, keyId, amount: amountPaise, currency } = orderRes.data

      // ── STEP 4: Configure and open Razorpay modal ───────
      const options = {
        key:      keyId,                      // rzp_test_XXXX (public key)
        amount:   amountPaise,               // In paise
        currency: currency,
        name:     'RouteSafe Insurance',
        description: description,
        image:    '🛡️',
        order_id: orderId,                   // From Razorpay

        // ── STEP 5a: On payment success ────────────────────
        handler: async (response) => {
          try {
            // Verify on backend
            const verifyRes = await axios.post('/api/payment/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })

            if (verifyRes.data.success) {
              setPaymentStatus('success')
              setPaymentData(verifyRes.data)
            } else {
              setPaymentStatus('failed')
            }
          } catch {
            setPaymentStatus('failed')
          } finally {
            setLoading(false)
          }
        },

        prefill: {
          name:  selectedWorker?.name  || 'RouteSafe Insurance User',
          email: 'worker@RouteSafe Insurance.in',
          contact: '9876543210',
        },

        theme: { color: '#f59e0b' },   // Amber brand color

        // ── STEP 5b: On payment failure / modal close ──────
        modal: {
          ondismiss: () => {
            setPaymentStatus(null)
            setLoading(false)
          }
        }
      }

      // Open the Razorpay checkout modal
      const rzp = new window.Razorpay(options)

      // Handle payment failure inside the modal
      rzp.on('payment.failed', (response) => {
        console.error('[Razorpay] Payment failed:', response.error)
        setPaymentStatus('failed')
        setError(`Payment failed: ${response.error.description}`)
        setLoading(false)
      })

      rzp.open()

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create order')
      setPaymentStatus(null)
      setLoading(false)
    }
  }

  const resetPayment = () => {
    setPaymentStatus(null)
    setPaymentData(null)
    setError(null)
  }

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h2>💳 Pay Premium</h2>
          <p>Collect weekly insurance premiums from enrolled workers via Razorpay</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Payment Form ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status banner */}
          <StatusBanner status={paymentStatus} data={paymentData} />
          {paymentStatus === 'success' && (
            <button onClick={resetPayment} style={{
              padding: '10px', borderRadius: 8, cursor: 'pointer',
              background: 'transparent', border: '1px solid #1e2d45',
              color: '#64748b', fontSize: 13, fontWeight: 600
            }}>
              ← Start New Payment
            </button>
          )}

          {paymentStatus !== 'success' && (
            <>
              {/* Worker selection */}
              <div style={{
                background: '#0f1520', border: '1px solid #1e2d45',
                borderRadius: 14, padding: 20
              }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                  Select Worker (optional — auto-fills premium amount)
                </div>

                {workersLoading ? (
                  <div style={{ color: '#64748b', fontSize: 13 }}>Loading workers...</div>
                ) : workers.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    No workers found. Seed the database first.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {workers.map(w => (
                      <WorkerChip
                        key={w.id}
                        worker={w}
                        selected={selectedWorker?.id === w.id}
                        onClick={() => handleSelectWorker(w)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Payment form */}
              <div style={{
                background: '#0f1520', border: '1px solid #1e2d45',
                borderRadius: 14, padding: 20
              }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                  Payment Details
                </div>

                {/* Amount */}
                <label style={labelStyle}>Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#f59e0b', fontWeight: 700, fontSize: 16
                  }}>₹</span>
                  <input
                    type="number"
                    placeholder="75"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(null) }}
                    style={{ ...inputStyle, paddingLeft: 32 }}
                    min="1"
                  />
                </div>

                {/* Description */}
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={inputStyle}
                />

                {/* Error */}
                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginTop: 12,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444', fontSize: 13
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Pay button */}
                <button
                  onClick={handlePayment}
                  disabled={loading || !amount}
                  style={{
                    marginTop: 20, width: '100%', padding: '14px',
                    background: loading || !amount
                      ? '#334155'
                      : 'linear-gradient(135deg, #d97706, #f59e0b)',
                    border: 'none', borderRadius: 10,
                    color: loading || !amount ? '#64748b' : '#000',
                    fontWeight: 800, fontSize: 15, cursor: loading ? 'wait' : !amount ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading || !amount ? 'none' : '0 4px 16px rgba(245,158,11,0.3)'
                  }}
                >
                  {loading ? (
                    <>⏳ Opening Razorpay...</>
                  ) : (
                    <>💳 Pay ₹{amount || '0'} with Razorpay</>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: 12, color: '#334155', fontSize: 11 }}>
                  🔒 Secured by Razorpay · Test Mode Active
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Info Panel ───────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* How it works */}
          <div style={{
            background: '#0f1520', border: '1px solid #1e2d45',
            borderRadius: 14, padding: 20
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#f1f5f9' }}>
              💡 How Razorpay Integration Works
            </div>
            {[
              ['1️⃣', 'Select worker', 'Premium amount auto-fills from their earnings profile'],
              ['2️⃣', 'Create order', 'Backend calls Razorpay API and saves a PENDING record'],
              ['3️⃣', 'Pay in modal', 'Razorpay secure checkout opens (use test card)'],
              ['4️⃣', 'Verify signature', 'Backend validates HMAC SHA256 — prevents tampering'],
              ['5️⃣', 'DB updated', 'Payment status → SUCCESS or FAILED in PostgreSQL'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Test card */}
          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 14, padding: 20
          }}>
            <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
              🧪 Razorpay Test Card Details
            </div>
            {[
              ['Card Number', '4111 1111 1111 1111'],
              ['Expiry',      'Any future date'],
              ['CVV',         'Any 3 digits'],
              ['OTP',         '1234'],
              ['UPI ID',      'success@razorpay'],
            ].map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '7px 0', borderBottom: '1px solid #1e2d45',
                fontSize: 12
              }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <code style={{ color: '#f1f5f9', fontSize: 12 }}>{val}</code>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── STYLES ─────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 11, color: '#64748b',
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
  marginBottom: 6, marginTop: 14
}
const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#161d2e', border: '1px solid #1e2d45',
  borderRadius: 8, color: '#f1f5f9', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s'
}
