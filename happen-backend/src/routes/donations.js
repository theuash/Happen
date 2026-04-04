import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET /api/donations/campaigns
router.get('/campaigns', verifyToken, (req, res) => {
  const campaigns = db.prepare('SELECT * FROM donation_campaigns').all()
  const result = campaigns.map(c => {
    const totalDonated = db.prepare('SELECT COALESCE(SUM(days), 0) as total FROM donations WHERE campaign_id = ?').get([c.id]).total
    const beneficiary = c.beneficiary_id ? db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get([c.beneficiary_id]) : null
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      goal_days: c.goal_days,
      total_donated: totalDonated,
      beneficiary: beneficiary ? `${beneficiary.first_name} ${beneficiary.last_name}` : null,
      remaining_goal: Math.max(0, c.goal_days - totalDonated)
    }
  })
  res.json(result)
})

// POST /api/donations
router.post('/', verifyToken, (req, res) => {
  const { campaign_id, recipient_id, days } = req.body
  if (!days || typeof days !== 'number' || days <= 0) {
    return res.status(400).json({ error: 'Valid days required' })
  }
  if (!campaign_id && !recipient_id) {
    return res.status(400).json({ error: 'Either campaign_id or recipient_id required' })
  }
  // Check donor balance
  const donor = db.prepare('SELECT leave_balance_annual FROM users WHERE id = ?').get([req.user.id])
  if (donor.leave_balance_annual < days) {
    return res.status(400).json({ error: 'Insufficient annual leave balance' })
  }
  // Deduct balance
  const newBalance = donor.leave_balance_annual - days
  db.prepare('UPDATE users SET leave_balance_annual = ? WHERE id = ?').run([newBalance, req.user.id])

  // Insert donation
  const info = db.prepare(`
    INSERT INTO donations (donor_id, recipient_id, campaign_name, days, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run([
    req.user.id,
    recipient_id || null,
    campaign_id || null,
    days,
    new Date().toISOString()
  ])

  // Determine notification recipient: if recipient_id, notify them; else if campaign_id, get campaign beneficiary and notify
  let notifyUserId = recipient_id
  if (!notifyUserId && campaign_id) {
    const campaign = db.prepare('SELECT beneficiary_id FROM donation_campaigns WHERE id = ?').get([campaign_id])
    if (campaign && campaign.beneficiary_id) {
      notifyUserId = campaign.beneficiary_id
    }
  }
  if (notifyUserId) {
    const donorName = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get([req.user.id])
    const title = 'Leave Day Donation Received'
    const message = `${donorName.first_name} ${donorName.last_name} donated ${days} day(s) to you.`
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run([notifyUserId, title, message, 'success'])
  }

  res.json({ message: 'Donation successful', donation_id: info.lastInsertRowid, new_balance: newBalance })
})

// GET /api/donations/history
router.get('/history', verifyToken, (req, res) => {
  const history = db.prepare(`
    SELECT d.*, u.first_name, u.last_name as recipient_name
    FROM donations d
    LEFT JOIN users u ON d.recipient_id = u.id
    WHERE d.donor_id = ?
    ORDER BY d.created_at DESC
  `).all([req.user.id])
  res.json(history)
})

export default router
