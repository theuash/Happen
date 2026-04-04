import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/accounting/summary
router.get('/summary', verifyToken, requireRole('accounting', 'admin'), (req, res) => {
  // Static demo numbers, but we could calculate some from data
  // Example: total payroll sum (mock), leave deductions sum, pending corrections count, unpaid leaves count
  // We can compute some from leave_requests that are approved and maybe multiply by average daily rate
  // For now, return static
  res.json({
    total_payroll: 248500,
    leave_deductions: 3200,
    pending_corrections: 2,
    unpaid_leaves: 3
  })
})

// GET /api/accounting/departments
router.get('/departments', verifyToken, requireRole('accounting', 'admin'), (req, res) => {
  // Per team: days_taken, paid_days, unpaid_days, cost_impact
  const teams = db.prepare('SELECT id, name FROM teams').all()
  const result = teams.map(team => {
    // Sum of days_count for approved/emergency leaves (assuming paid)
    const taken = db.prepare(`
      SELECT SUM(days_count) as total FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE u.team_id = ? AND lr.status IN ('approved','emergency')
    `).get([team.id]).total || 0
    const paid_days = taken
    // Unpaid days: maybe from requests that are denied but taken? We'll set 0 for demo.
    const unpaid_days = 0
    // Cost impact: assume $200 per day
    const cost_impact = taken * 200
    return {
      team_id: team.id,
      team_name: team.name,
      days_taken: taken,
      paid_days: paid_days,
      unpaid_days: unpaid_days,
      cost_impact: cost_impact
    }
  })
  res.json(result)
})

// GET /api/accounting/integrations
router.get('/integrations', verifyToken, requireRole('accounting', 'admin'), (req, res) => {
  res.json({
    gusto: { status: 'connected', last_sync: '1h ago' },
    adp: { status: 'connected' }
  })
})

// GET /api/employees/:id/payroll
router.get('/employees/:id/payroll', verifyToken, requireRole('accounting', 'admin'), (req, res) => {
  const user = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get([req.params.id])
  if (!user) {
    return res.status(404).json({ error: 'Employee not found' })
  }
  // Mock payroll data
  res.json({
    employee_id: req.params.id,
    employee_name: `${user.first_name} ${user.last_name}`,
    hours_worked: 160,
    leave_days: 10,
    base_pay: 5000,
    deductions: 800,
    net_pay: 4200
  })
})

export default router
