import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET /api/employees
router.get('/', verifyToken, (req, res) => {
  const { search } = req.query
  let query = `
    SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.team_id, t.name as team_name, u.avatar
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.is_active = 1
  `
  const params = []
  if (search) {
    query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)'
    const like = `%${search}%`
    params.push(like, like, like)
  }
  query += ' ORDER BY u.first_name, u.last_name'
  const employees = db.prepare(query).all(params)
  res.json(employees)
})

export default router
