import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/admin/users
router.get('/users', verifyToken, requireRole('admin'), (req, res) => {
  const users = db.prepare(`
    SELECT id, email, first_name, last_name, role, team_id, last_login, is_active
    FROM users
    ORDER BY id
  `).all()
  res.json(users)
})

// POST /api/admin/users
router.post('/users', verifyToken, requireRole('admin'), (req, res) => {
  const { email, password, first_name, last_name, role, team_id } = req.body
  if (!email || !password || !first_name || !last_name || !role) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  // Check if email exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get([email])
  if (existing) {
    return res.status(400).json({ error: 'Email already exists' })
  }
  const hashed = bcrypt.hashSync(password, 10)
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, password_plain, first_name, last_name, role, team_id, avatar, leave_balance_annual, leave_balance_sick)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 20, 10)
  `).run([email, hashed, password, first_name, last_name, role, team_id || null, first_name[0] + last_name[0]])
  const newUser = db.prepare('SELECT id, email, first_name, last_name, role, team_id FROM users WHERE id = ?').get([info.lastInsertRowid])
  res.status(201).json(newUser)
})

// PATCH /api/admin/users/:id
router.patch('/users/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { email, first_name, last_name, role, team_id, is_active } = req.body
  const fields = []
  const params = []
  if (email) { fields.push('email = ?'); params.push(email) }
  if (first_name) { fields.push('first_name = ?'); params.push(first_name) }
  if (last_name) { fields.push('last_name = ?'); params.push(last_name) }
  if (role) { fields.push('role = ?'); params.push(role) }
  if (team_id !== undefined) { fields.push('team_id = ?'); params.push(team_id) }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0) }
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }
  params.push(req.params.id)
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
  db.prepare(sql).run(params)
  const updated = db.prepare('SELECT id, email, first_name, last_name, role, team_id, is_active FROM users WHERE id = ?').get([req.params.id])
  res.json(updated)
})

// PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', verifyToken, requireRole('admin'), (req, res) => {
  const { new_password } = req.body
  if (!new_password) {
    return res.status(400).json({ error: 'new_password required' })
  }
  const hashed = bcrypt.hashSync(new_password, 10)
  // We update password_hash, but should we also update password_plain for admin vault? Yes, store plain in password_plain.
  db.prepare('UPDATE users SET password_hash = ?, password_plain = ? WHERE id = ?').run([hashed, new_password, req.params.id])

  // Log audit
  db.prepare('INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)').run([
    req.user.id,
    'password.reset',
    `Reset password for user ${req.params.id}`,
    req.ip || '127.0.0.1'
  ])

  res.json({ message: 'Password reset' })
})

// GET /api/admin/passwords (LOG THIS ACCESS!)
router.get('/passwords', verifyToken, requireRole('admin'), (req, res) => {
  // Log this access
  db.prepare('INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)').run([
    req.user.id,
    'admin.view_passwords',
    'Accessed admin password vault',
    req.ip || '127.0.0.1'
  ])
  // Return users with password_plain
  const users = db.prepare('SELECT id, email, first_name, last_name, password_plain FROM users').all()
  res.json(users)
})

// GET /api/admin/audit-logs (paginated)
router.get('/audit-logs', verifyToken, requireRole('admin'), (req, res) => {
  const { user, action, from, to, page = 1, limit = 50 } = req.query
  let offset = (parseInt(page, 10) - 1) * parseInt(limit, 10)
  offset = offset < 0 ? 0 : offset

  let query = 'SELECT * FROM audit_logs WHERE 1=1'
  const params = []
  if (user) { query += ' AND user_id = ?'; params.push(user) }
  if (action) { query += ' AND action = ?'; params.push(action) }
  if (from) { query += ' AND created_at >= ?'; params.push(from) }
  if (to) { query += ' AND created_at <= ?'; params.push(to) }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit, 10), offset)

  const logs = db.prepare(query).all(params)
  // Also get total count for pagination? Not required, but can add
  res.json(logs)
})

// POST /api/admin/impersonate
router.post('/impersonate', verifyToken, requireRole('admin'), (req, res) => {
  const { target_user_id } = req.body
  if (!target_user_id) {
    return res.status(400).json({ error: 'target_user_id required' })
  }
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get([target_user_id])
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found or inactive' })
  }
  // Log impersonation
  db.prepare('INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)').run([
    req.user.id,
    'admin.impersonate',
    `Impersonated user ${target_user_id}`,
    req.ip || '127.0.0.1'
  ])
  // Generate new JWT for target user with impersonated_by claim
  const token = jwt.sign(
    {
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      team_id: targetUser.team_id,
      name: `${targetUser.first_name} ${targetUser.last_name}`,
      avatar: targetUser.avatar,
      impersonated_by: req.user.id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
  const { password_hash, password_plain, ...userData } = targetUser
  res.json({ token, user: userData, impersonated: true })
})

export default router
