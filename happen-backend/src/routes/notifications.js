import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET /api/notifications
router.get('/', verifyToken, (req, res) => {
  const notifs = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY is_read ASC, created_at DESC
    LIMIT 10
  `).all([req.user.id])
  res.json(notifs)
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', verifyToken, (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get([req.params.id, req.user.id])
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' })
  }
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run([req.params.id])
  res.json({ message: 'Marked as read' })
})

// PATCH /api/notifications/read-all
router.patch('/read-all', verifyToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run([req.user.id])
  res.json({ message: 'All marked as read' })
})

export default router
