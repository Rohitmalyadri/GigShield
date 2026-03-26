// WorkersPage.jsx — Shows all 3 workers from the database
// Fetches from GET /api/workers and displays their earnings,
// risk scores, and calculated weekly premium

import { useEffect, useState } from 'react'
import axios from 'axios'

export default function WorkersPage() {
  // useState holds the list of workers (starts empty)
  const [workers, setWorkers]   = useState([])
  // Loading state so we show a spinner while fetching
  const [loading, setLoading]   = useState(true)

  // useEffect runs once when the page loads
  useEffect(() => {
    // Fetch all workers from our backend API
    axios.get('/api/workers')
      .then(res => {
        setWorkers(res.data.workers)  // Store the list
        setLoading(false)             // Hide spinner
      })
      .catch(err => {
        console.error('Failed to load workers:', err)
        setLoading(false)
      })
  }, []) // Empty array means "run only on first load"

  // Helper: calculate the average of an array of numbers
  function avg(arr) {
    if (!arr || arr.length === 0) return 0
    return (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(0)
  }

  return (
    <div>
      {/* Page title */}
      <div className="page-header">
        <h2>👷 Worker Profiles</h2>
        <p>All enrolled workers with their earnings profiles and current weekly premiums</p>
      </div>

      {/* Summary stat cards at the top */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Workers</div>
          <div className="value amber">{workers.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active</div>
          <div className="value green">{workers.filter(w => w.isActive).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Cities Covered</div>
          <div className="value">{new Set(workers.map(w => w.city)).size}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg Premium/Week</div>
          <div className="value amber">
            ₹{workers.length
              ? (workers.reduce((s, w) => s + (w.calculatedPremium||0), 0) / workers.length).toFixed(0)
              : 0}
          </div>
        </div>
      </div>

      {/* Workers table */}
      <div className="table-card">
        <div className="table-header">Enrolled Workers</div>
        {loading ? (
          <div className="loading">Loading workers...</div>
        ) : workers.length === 0 ? (
          <div className="empty">No workers found. Run the seed script first.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Worker Hash</th>
                <th>City</th>
                <th>Zone</th>
                <th>Platforms</th>
                <th>12-Wk Avg Earnings</th>
                <th>Weekly Premium</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => (
                <tr key={worker.id}>
                  {/* Show first 12 chars of hash only */}
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {worker.workerHash.substring(0, 12)}...
                  </td>
                  <td>{worker.city}</td>
                  <td>{worker.zone}</td>
                  {/* Show each platform as a small badge */}
                  <td>
                    {worker.platforms.map(p => (
                      <span key={p} className="badge badge-pending" style={{ marginRight: 4 }}>
                        {p}
                      </span>
                    ))}
                  </td>
                  <td>₹{avg(worker.weeklyEarningsHistory)}/wk</td>
                  <td style={{ color: '#f59e0b', fontWeight: 600 }}>
                    ₹{worker.calculatedPremium}
                  </td>
                  <td>
                    <span className={`badge ${worker.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                      {worker.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
