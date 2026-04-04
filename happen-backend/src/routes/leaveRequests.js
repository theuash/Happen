import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

function daysBetween(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = endDate - startDate
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

// POST /api/leave-requests
router.post('/', verifyToken, (req, res) => {
  const { start_date, end_date, type, reason, is_emergency } = req.body
  if (!start_date || !end_date || !type) {
    return res.status(400).json({ error: 'Missing required fields: start_date, end_date, type' })
  }
  if (!['annual', 'sick', 'wellness', 'emergency'].includes(type)) {
    return res.status(400).json({ error: 'Invalid leave type' })
  }

  // Get user
  const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get([req.user.id])
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const daysCount = daysBetween(start_date, end_date)
  let status = 'pending'
  let proof_deadline = null
  let queue_position = null
  let priority_score = 0

  // Emergency handling
  if (is_emergency || type === 'emergency') {
    status = 'emergency'
    // Proof deadline 24 hours from now
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
    proof_deadline = deadline.toISOString()
  } else {
    // Check team workload
    const team = db.prepare('SELECT workload_current FROM teams WHERE id = ?').get([user.team_id])
    const workload = team ? team.workload_current : 0
    if (workload < 50) {
      status = 'approved'
    } else {
      status = 'queued'
    }
  }

  // Insert leave request
  const info = db.prepare(`
    INSERT INTO leave_requests (user_id, start_date, end_date, days_count, type, reason, status, proof_deadline, priority_score, queue_position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run([req.user.id, start_date, end_date, daysCount, type, reason || null, status, proof_deadline, priority_score, queue_position])

  // Set decision_date if approved or emergency
  if (status === 'approved' || status === 'emergency') {
    db.prepare('UPDATE leave_requests SET decision_date = ? WHERE id = ?').run([new Date().toISOString(), info.lastInsertRowid])
  }

  // If queued, calculate queue_position based on FCFS
  if (status === 'queued') {
    // Use created_at for FIFO: position = count of queued requests with earlier or equal created_at but different id
    // Get this request's created_at
    const reqCreated = db.prepare('SELECT created_at FROM leave_requests WHERE id = ?').get([info.lastInsertRowid])
    const posCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM leave_requests
      WHERE status = 'queued' AND (created_at < ? OR (created_at = ? AND id < ?))
    `).get([reqCreated.created_at, reqCreated.created_at, info.lastInsertRowid])
    const position = posCount.cnt + 1
    db.prepare('UPDATE leave_requests SET queue_position = ? WHERE id = ?').run([position, info.lastInsertRowid])
  }

  // Notify manager/team lead
  const teamData = db.prepare('SELECT team_lead_id, name FROM teams WHERE id = ?').get([user.team_id])
  if (teamData && teamData.team_lead_id) {
    const userReq = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get([req.user.id])
    const title = 'New Leave Request'
    const message = `${userReq.first_name} ${userReq.last_name} submitted a ${type} leave request from ${start_date} to ${end_date}.`
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run([teamData.team_lead_id, title, message, 'info'])
  }

  // Return the created request
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([info.lastInsertRowid])
  res.json({ request, status, queue_position: status === 'queued' ? request.queue_position : null })
})

// GET /api/leave-requests/:id
router.get('/:id', verifyToken, (req, res) => {
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id])
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' })
  }
  // Check permission: owner, team_lead/manager/hr/admin for that team
  const user = db.prepare('SELECT role, team_id FROM users WHERE id = ?').get([req.user.id])
  const isOwner = request.user_id === req.user.id
  const isAuthorized = ['team_lead', 'manager', 'hr', 'admin'].includes(user.role)
  // If not owner and not authorized, check if user is manager/lead of the request's user team
  let canView = isOwner || isAuthorized
  if (!canView && ['team_lead', 'manager'].includes(user.role)) {
    const reqUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get([request.user_id])
    if (reqUser && reqUser.team_id === user.team_id) {
      canView = true
    }
  }
  if (!canView) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  res.json(request)
})

// PATCH /api/leave-requests/:id/approve
router.patch('/:id/approve', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), (req, res) => {
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id])
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' })
  }
  // Update status to approved
  db.prepare('UPDATE leave_requests SET status = ?, decision_date = ? WHERE id = ?').run(['approved', new Date().toISOString(), req.params.id])

  // Notify employee
  const employee = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get([request.user_id])
  const title = 'Leave Request Approved'
  const message = `Your leave request from ${request.start_date} to ${request.end_date} has been approved.`
  db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run([request.user_id, title, message, 'success'])

  res.json({ message: 'Approved', request: db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id]) })
})

// PATCH /api/leave-requests/:id/deny
router.patch('/:id/deny', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), (req, res) => {
  const { reason } = req.body
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id])
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' })
  }
  // Update status to denied
  db.prepare('UPDATE leave_requests SET status = ?, decision_date = ?, override_reason = ? WHERE id = ?').run(['denied', new Date().toISOString(), reason || null, req.params.id])

  // Notify employee
  const employee = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get([request.user_id])
  const title = 'Leave Request Denied'
  const message = `Your leave request from ${request.start_date} to ${request.end_date} has been denied.${reason ? ` Reason: ${reason}` : ''}`
  db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run([request.user_id, title, message, 'error'])

  res.json({ message: 'Denied', request: db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id]) })
})

// PATCH /api/leave-requests/:id/override
router.patch('/:id/override', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), (req, res) => {
  const { decision, reason } = req.body
  if (!decision || !['approved', 'denied'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' })
  }
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id])
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' })
  }
  // Update leave request status
  db.prepare('UPDATE leave_requests SET status = ?, decision_date = ?, override_reason = ? WHERE id = ?').run([decision, new Date().toISOString(), reason, req.params.id])

  // Insert into overrides
  db.prepare('INSERT INTO overrides (manager_id, request_id, decision, reason, visible_to_employee) VALUES (?, ?, ?, ?, ?)').run([req.user.id, req.params.id, decision, reason, 1])

  // Log audit
  db.prepare('INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)').run([req.user.id, 'leave_request.override', `Overrode leave request ${req.params.id} to ${decision}`, req.ip || '127.0.0.1'])

  // Notify employee and HR
  const employee = db.prepare('SELECT first_name, last_name, email FROM users WHERE id = ?').get([request.user_id])
  const empTitle = 'Leave Request Overridden'
  const empMessage = `Your leave request was overridden by a manager. Decision: ${decision}.${reason ? ` Reason: ${reason}` : ''}`
  db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run([request.user_id, empTitle, empMessage, 'warning'])

  // Notify HR (users with role 'hr')
  const hrUsers = db.prepare('SELECT id FROM users WHERE role = "hr"').all()
  for (const hr of hrUsers) {
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run([hr.id, 'Override Action', `Manager ${req.user.name} overrode leave request ${req.params.id} to ${decision}`, 'warning'])
  }

  res.json({ message: 'Override applied', request: db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id]) })
})

// POST /api/leave-requests/:id/proof
router.post('/:id/proof', verifyToken, (req, res) => {
  const { proof_url } = req.body
  if (!proof_url) {
    return res.status(400).json({ error: 'proof_url required' })
  }
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id])
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' })
  }
  if (request.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  // Update proof_submitted and proof_url
  db.prepare('UPDATE leave_requests SET proof_submitted = 1, proof_url = ? WHERE id = ?').run([proof_url, req.params.id])

  // Check deadline if past?
  // For simplicity, we won't convert to unpaid; just keep status

  res.json({ message: 'Proof submitted', request: db.prepare('SELECT * FROM leave_requests WHERE id = ?').get([req.params.id]) })
})

export default router
