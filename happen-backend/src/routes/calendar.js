import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/company/workload
router.get('/workload', verifyToken, requireRole('manager', 'hr', 'admin'), (req, res) => {
  const teams = db.prepare('SELECT id, name, workload_current, workload_threshold_high, team_lead_id FROM teams').all()
  // Optionally include lead name
  const result = teams.map(t => {
    const lead = t.team_lead_id ? db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get([t.team_lead_id]) : null
    return {
      id: t.id,
      name: t.name,
      workload_current: t.workload_current,
      threshold: t.workload_threshold_high,
      team_lead: lead ? `${lead.first_name} ${lead.last_name}` : null
    }
  })
  res.json(result)
})

// GET /api/company/burnout-risk
router.get('/burnout-risk', verifyToken, requireRole('manager', 'hr', 'admin'), (req, res) => {
  // Employees with >45 days since last leave OR workload >80% for 2+ weeks
  // Since we don't track workload per employee, we only check last leave
  const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  const atRisk = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.team_id, t.name as team_name,
           MAX(lr.end_date) as last_leave_end
    FROM users u
    LEFT JOIN leave_requests lr ON u.id = lr.user_id AND lr.status = 'approved'
    JOIN teams t ON u.team_id = t.id
    WHERE lr.end_date IS NULL OR lr.end_date < ?
    GROUP BY u.id
    HAVING COUNT(lr.id) = 0 OR MAX(lr.end_date) < ?
  `).all([fortyFiveDaysAgo, fortyFiveDaysAgo])

  // Also check team workload >80% and maybe flag those teams' members? But the spec says "employees with >45 days since last leave OR workload >80% for 2+ weeks". Since we don't have 2-week workload history, we skip.
  res.json(atRisk)
})

// GET /api/company/overrides
router.get('/overrides', verifyToken, requireRole('manager', 'hr', 'admin'), (req, res) => {
  // Last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const overrides = db.prepare(`
    SELECT o.*, m.first_name as manager_first, m.last_name as manager_last, m.email as manager_email,
           u.first_name as employee_first, u.last_name as employee_last, u.email as employee_email
    FROM overrides o
    JOIN users m ON o.manager_id = m.id
    JOIN leave_requests lr ON o.request_id = lr.id
    JOIN users u ON lr.user_id = u.id
    WHERE o.created_at >= ?
    ORDER BY o.created_at DESC
  `).all([thirtyDaysAgo])
  res.json(overrides)
})

// GET /api/company/calendar?month=&year=
router.get('/calendar', verifyToken, requireRole('manager', 'hr', 'admin'), (req, res) => {
  const { month, year } = req.query
  if (!month || !year) {
    return res.status(400).json({ error: 'month and year query parameters required' })
  }
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ error: 'Invalid month or year' })
  }
  const firstDay = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`
  const lastDayDate = new Date(yearNum, monthNum, 0)
  const lastDay = lastDayDate.toISOString().split('T')[0]

  const leaves = db.prepare(`
    SELECT lr.start_date, lr.end_date, lr.type, lr.status,
           u.first_name, u.last_name, u.team_id, t.name as team_name
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    JOIN teams t ON u.team_id = t.id
    WHERE lr.status IN ('approved','emergency')
      AND lr.start_date <= ? AND lr.end_date >= ?
    ORDER BY lr.start_date
  `).all([lastDay, firstDay])

  res.json(leaves)
})

export default router
