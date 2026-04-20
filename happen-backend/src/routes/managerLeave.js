import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

function daysBetween(start, end) {
  return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
}

// POST /api/manager-leave  — schedule leave for manager or HR
// Rules: workload must be <= 50 (medium or less), auto-approved, broadcasts to all employees/team_leads/accounting
router.post('/', verifyToken, requireRole('manager', 'hr'), (req, res) => {
  const { start_date, end_date, reason } = req.body

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' })
  }

  const self = db.prepare('SELECT id, first_name, last_name, role, team_id FROM users WHERE id = ?').get([req.user.id])
  if (!self) return res.status(404).json({ error: 'User not found' })

  // Check company-wide workload — use average across all teams
  const teams = db.prepare('SELECT workload_current FROM teams').all()
  const avgWorkload = teams.length
    ? Math.round(teams.reduce((s, t) => s + (t.workload_current || 0), 0) / teams.length)
    : 0

  if (avgWorkload > 50) {
    return res.status(409).json({
      error: 'Leave cannot be scheduled right now',
      detail: `Company workload is currently ${avgWorkload}% (above the 50% threshold). Please try again when workload is medium or lower.`,
      workload: avgWorkload,
    })
  }

  const daysCount = daysBetween(start_date, end_date)

  // Insert as auto-approved leave
  const info = db.prepare(`
    INSERT INTO leave_requests (user_id, start_date, end_date, days_count, type, reason, status, decision_date, priority_score)
    VALUES (?, ?, ?, ?, 'annual', ?, 'approved', ?, 0)
  `).run([self.id, start_date, end_date, daysCount, reason || null, new Date().toISOString()])

  // Broadcast notification to: all employees, team_leads, accounting
  const recipients = db.prepare(`
    SELECT id FROM users
    WHERE role IN ('employee', 'team_lead', 'accounting') AND is_active = 1
  `).all()

  const roleLabel = self.role === 'hr' ? 'HR' : 'Manager'
  const title = `${roleLabel} Leave Notice`
  const message = `${self.first_name} ${self.last_name} (${roleLabel}) will be on leave from ${start_date} to ${end_date}.${reason ? ` Note: ${reason}` : ''}`

  const insertNotif = db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  )
  for (const r of recipients) {
    insertNotif.run([r.id, title, message, 'info'])
  }

  // Audit log
  db.prepare('INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)').run([
    self.id,
    'manager_leave.scheduled',
    `${self.first_name} ${self.last_name} scheduled leave ${start_date} → ${end_date}`,
    req.ip || '127.0.0.1',
  ])

  const created = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([info.lastInsertRowid])
  res.json({ leave: created, workload: avgWorkload, notified: recipients.length })
})

// GET /api/manager-leave — list all manager/HR scheduled leaves (visible to everyone)
router.get('/', verifyToken, (req, res) => {
  const leaves = db.prepare(`
    SELECT lr.*, u.first_name, u.last_name, u.role
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    WHERE u.role IN ('manager', 'hr') AND lr.status = 'approved'
    ORDER BY lr.start_date DESC
    LIMIT 20
  `).all()
  res.json(leaves)
})

export default router
