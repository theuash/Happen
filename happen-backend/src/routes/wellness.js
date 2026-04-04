import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// POST /api/wellness/request
router.post('/request', verifyToken, (req, res) => {
  // Check wellness days used
  const user = db.prepare('SELECT wellness_days_used, team_id FROM users WHERE id = ?').get([req.user.id])
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  if (user.wellness_days_used >= 2) {
    return res.status(400).json({ error: 'Wellness days limit reached' })
  }

  // Use today as the leave date (single day)
  const today = new Date().toISOString().split('T')[0]
  const start_date = today
  const end_date = today
  const days_count = 1

  // Insert leave request as approved
  const info = db.prepare(`
    INSERT INTO leave_requests (user_id, start_date, end_date, days_count, type, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run([req.user.id, start_date, end_date, days_count, 'wellness', 'approved'])

  // Increment wellness_days_used
  db.prepare('UPDATE users SET wellness_days_used = wellness_days_used + 1 WHERE id = ?').run([req.user.id])

  // Notify manager/team lead
  const team = db.prepare('SELECT team_lead_id FROM teams WHERE id = ?').get([user.team_id])
  if (team && team.team_lead_id) {
    const title = 'Wellness Leave Request'
    const message = `Employee ${req.user.name || 'Anonymous'} requested a wellness day (auto-approved).`
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run([team.team_lead_id, title, message, 'info'])
  }

  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([info.lastInsertRowid])
  res.json({ request, status: 'approved' })
})

export default router
