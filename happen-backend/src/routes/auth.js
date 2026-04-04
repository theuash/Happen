import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get([email])
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // Update last_login
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run([new Date().toISOString(), user.id])

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, team_id: user.team_id, name: `${user.first_name} ${user.last_name}`, avatar: user.avatar },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  // Return user data (exclude password hashes)
  const { password_hash, password_plain, ...userData } = user
  res.json({ token, user: userData })
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // In JWT, logout is client-side; just return success
  res.status(200).json({ message: 'Logged out' })
})

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, email, first_name, last_name, role, team_id, avatar, hire_date, leave_balance_annual, leave_balance_sick, wellness_days_used, emergency_leaves_used, last_login, is_active FROM users WHERE id = ?').get([req.user.id])
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json(user)
})

export default router

