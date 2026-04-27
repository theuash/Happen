import express from 'express'
import Donation from '../db/models/Donation.js'
import User from '../db/models/User.js'
import Notification from '../db/models/Notification.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// ── GET /api/donations/pool  — all unclaimed pool donations (FCFS) ────────────
router.get('/pool', verifyToken, async (req, res) => {
  try {
    const pool = await Donation.find({ is_pool: true, status: 'pool_available' })
      .populate('donor_id', 'first_name last_name avatar team_id')
      .sort({ createdAt: 1 }) // oldest first = FCFS
      .lean()
    res.json(pool.map(d => ({ ...d, id: d._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/donations/history  — my sent + received donations ────────────────
router.get('/history', verifyToken, async (req, res) => {
  try {
    const [sent, received, claimed] = await Promise.all([
      Donation.find({ donor_id: req.user.id })
        .populate('recipient_id', 'first_name last_name avatar')
        .populate('claimed_by', 'first_name last_name avatar')
        .sort({ createdAt: -1 }).lean(),
      Donation.find({ recipient_id: req.user.id })
        .populate('donor_id', 'first_name last_name avatar')
        .sort({ createdAt: -1 }).lean(),
      Donation.find({ claimed_by: req.user.id })
        .populate('donor_id', 'first_name last_name avatar')
        .sort({ createdAt: -1 }).lean(),
    ])
    res.json({
      sent:     sent.map(d => ({ ...d, id: d._id })),
      received: received.map(d => ({ ...d, id: d._id })),
      claimed:  claimed.map(d => ({ ...d, id: d._id })),
    })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/donations  — donate to a person OR drop into pool ───────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { recipient_id, days, message, is_pool } = req.body

    if (!days || days < 1 || days > 10) {
      return res.status(400).json({ error: 'Days must be between 1 and 10' })
    }
    if (!is_pool && !recipient_id) {
      return res.status(400).json({ error: 'Specify a recipient or donate to the pool' })
    }
    if (recipient_id && recipient_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot donate to yourself' })
    }

    // Check donor balance
    const donor = await User.findById(req.user.id).lean()
    if (!donor) return res.status(404).json({ error: 'User not found' })
    if (donor.leave_balance_annual < days) {
      return res.status(400).json({
        error: `Insufficient balance. You have ${donor.leave_balance_annual} annual day(s) remaining.`,
        balance: donor.leave_balance_annual,
      })
    }

    // Deduct from donor
    await User.findByIdAndUpdate(req.user.id, { $inc: { leave_balance_annual: -days } })

    if (is_pool) {
      // Drop into pool — no recipient yet
      const donation = await Donation.create({
        donor_id: req.user.id,
        is_pool: true,
        days,
        message: message || '',
        status: 'pool_available',
      })
      const populated = await Donation.findById(donation._id).populate('donor_id', 'first_name last_name avatar').lean()
      return res.json({
        donation: { ...populated, id: populated._id },
        message: `${days} day(s) added to the leave pool. Anyone can claim them on a first-come-first-served basis.`,
      })
    }

    // Direct donation to a specific person
    const recipient = await User.findById(recipient_id).lean()
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' })

    // Credit recipient
    await User.findByIdAndUpdate(recipient_id, { $inc: { leave_balance_annual: days } })

    const donation = await Donation.create({
      donor_id: req.user.id,
      recipient_id,
      is_pool: false,
      days,
      message: message || '',
      status: 'delivered',
    })

    // Notify recipient
    await Notification.create({
      user_id: recipient_id,
      title: '🎁 Leave Days Received!',
      message: `${donor.first_name} ${donor.last_name} donated ${days} annual leave day(s) to you.${message ? ` Note: "${message}"` : ''}`,
      type: 'success',
      link: '/donation',
    })

    const populated = await Donation.findById(donation._id)
      .populate('donor_id', 'first_name last_name avatar')
      .populate('recipient_id', 'first_name last_name avatar')
      .lean()

    res.json({
      donation: { ...populated, id: populated._id },
      message: `${days} day(s) donated to ${recipient.first_name} ${recipient.last_name} successfully!`,
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/donations/:id/claim  — claim a pool donation (FCFS) ─────────────
router.post('/:id/claim', verifyToken, async (req, res) => {
  try {
    // Atomic find-and-update to prevent race conditions
    const donation = await Donation.findOneAndUpdate(
      { _id: req.params.id, is_pool: true, status: 'pool_available' },
      { claimed_by: req.user.id, claimed_at: new Date(), status: 'pool_claimed' },
      { new: true }
    ).populate('donor_id', 'first_name last_name').lean()

    if (!donation) {
      return res.status(409).json({ error: 'This donation has already been claimed by someone else.' })
    }

    // Credit the claimer
    await User.findByIdAndUpdate(req.user.id, { $inc: { leave_balance_annual: donation.days } })

    // Notify donor
    const claimer = await User.findById(req.user.id, 'first_name last_name').lean()
    await Notification.create({
      user_id: donation.donor_id._id,
      title: '✅ Pool Donation Claimed',
      message: `${claimer.first_name} ${claimer.last_name} claimed your ${donation.days} day(s) from the leave pool.`,
      type: 'info',
      link: '/donation',
    })

    res.json({
      donation: { ...donation, id: donation._id },
      message: `${donation.days} day(s) added to your annual leave balance!`,
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

export default router
