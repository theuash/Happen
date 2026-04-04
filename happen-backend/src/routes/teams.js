import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/teams/:teamId/workload
router.get('/:teamId/workload', verifyToken, (req, res) => {
  const team = db.prepare('SELECT workload_current, workload_threshold_high FROM teams WHERE id = ?').get([req.params.teamId])
  if (!team) {
    return res.status(404).json({ error: 'Team not found' })
  }
  // Trend: not tracked, assume stable
  const trend = 'stable'
  // Upcoming deadlines: next 5 approved leaves in this team
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  // Get start of month and end of month for filtering upcoming leaves within this month
  const firstDay = `${year}-${(month+1).toString().padStart(2, '0')}-01`
  const lastDayDate = new Date(year, month+1, 0)
  const lastDay = lastDayDate.toISOString().split('T')[0]

  const upcoming = db.prepare(`
    SELECT lr.start_date, lr.end_date, u.first_name, u.last_name
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    WHERE u.team_id = ? AND lr.status IN ('approved','emergency')
      AND lr.start_date <= ? AND lr.end_date >= ?
    ORDER BY lr.start_date
    LIMIT 5
  `).all([req.params.teamId, lastDay, firstDay])

  res.json({
    workload_current: team.workload_current,
    threshold: team.workload_threshold_high,
    trend,
    upcoming_deadlines: upcoming
  })
})

// GET /api/teams/:teamId/requests (pending/queued) - restricted
router.get('/:teamId/requests', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), (req, res) => {
  // Verify that the user is authorized for this team: either they manage the team or are HR/admin
  const user = db.prepare('SELECT role, team_id FROM users WHERE id = ?').get([req.user.id])
  if (!['hr', 'admin'].includes(user.role) && user.team_id != req.params.teamId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const requests = db.prepare(`
    SELECT lr.*, u.first_name, u.last_name, u.avatar, u.email
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    WHERE u.team_id = ? AND lr.status IN ('pending','queued')
    ORDER BY lr.created_at DESC
  `).all([req.params.teamId])
  res.json(requests)
})

// GET /api/teams/:teamId/queue
router.get('/:teamId/queue', verifyToken, (req, res) => {
  const queue = db.prepare(`
    SELECT lr.*, u.first_name, u.last_name, u.avatar
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    WHERE u.team_id = ? AND lr.status = 'queued'
    ORDER BY lr.priority_score DESC, lr.created_at ASC
  `).all([req.params.teamId])
  res.json(queue)
})

// GET /api/teams/:teamId/calendar
router.get('/:teamId/calendar', verifyToken, (req, res) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = `${year}-${(month+1).toString().padStart(2, '0')}-01`
  const lastDayDate = new Date(year, month+1, 0)
  const lastDay = lastDayDate.toISOString().split('T')[0]

  const leaves = db.prepare(`
    SELECT lr.start_date, lr.end_date, lr.type, u.first_name, u.last_name
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    WHERE u.team_id = ? AND lr.status IN ('approved','emergency')
      AND lr.start_date <= ? AND lr.end_date >= ?
    ORDER BY lr.start_date
  `).all([req.params.teamId, lastDay, firstDay])

  res.json(leaves)
})

// GET /api/teams/:teamId/analytics
router.get('/:teamId/analytics', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), (req, res) => {
  const user = db.prepare('SELECT role, team_id FROM users WHERE id = ?').get([req.user.id])
  if (!['hr', 'admin'].includes(user.role) && user.team_id != req.params.teamId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Basic stats
  const teamSize = db.prepare('SELECT COUNT(*) as count FROM users WHERE team_id = ?').get([req.params.teamId]).count
  const totalLeaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE u.team_id = ?').get([req.params.teamId]).count
  const approvedLeaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE u.team_id = ? AND lr.status = "approved"').get([req.params.teamId]).count
  const deniedLeaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE u.team_id = ? AND lr.status = "denied"').get([req.params.teamId]).count
  const queuedLeaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE u.team_id = ? AND lr.status = "queued"').get([req.params.teamId]).count
  const emergencyLeaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE u.team_id = ? AND lr.status = "emergency"').get([req.params.teamId]).count

  // Burnout indicators: employees with last leave end >45 days ago OR current workload >80% (but workload is team-level, not per employee)
  // For demo, just return empty array or few IDs
  const burnoutEmployees = [] // could compute from leave_requests but complex

  // Overtime not tracked, return empty
  const overtime = []

  res.json({
    team_size: teamSize,
    leaves: {
      total: totalLeaves,
      approved: approvedLeaves,
      denied: deniedLeaves,
      queued: queuedLeaves,
      emergency: emergencyLeaves
    },
    burnout_indicators: burnoutEmployees,
    overtime_tracking: overtime
  })
})

export default router
