import express from 'express'
import LeaveRequest from '../db/models/LeaveRequest.js'
import User from '../db/models/User.js'
import Team from '../db/models/Team.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

const todayStr = () => new Date().toISOString().split('T')[0]

// GET /api/current-leaves
// Returns everyone currently on leave (approved/emergency, today falls within range)
router.get('/', verifyToken, requireRole('manager', 'hr', 'admin'), async (req, res) => {
  try {
    const today = todayStr()

    const active = await LeaveRequest.find({
      status: { $in: ['approved', 'emergency'] },
      $or: [
        { start_date: { $lte: today }, end_date: { $gte: today } },
        { type: 'emergency', start_date: null },
      ],
    })
      .populate({
        path: 'user_id',
        select: 'first_name last_name email avatar role team_id hire_date',
        populate: { path: 'team_id', select: 'name workload_current team_lead_id' },
      })
      .sort({ createdAt: -1 })
      .lean()

    // Enrich with team lead info
    const enriched = await Promise.all(active.map(async (lr) => {
      const teamLead = lr.user_id?.team_id?.team_lead_id
        ? await User.findById(lr.user_id.team_id.team_lead_id, 'first_name last_name email avatar').lean()
        : null

      return {
        ...lr,
        id: lr._id,
        employee: {
          id:         lr.user_id?._id,
          first_name: lr.user_id?.first_name,
          last_name:  lr.user_id?.last_name,
          email:      lr.user_id?.email,
          avatar:     lr.user_id?.avatar,
          role:       lr.user_id?.role,
          hire_date:  lr.user_id?.hire_date,
          team: lr.user_id?.team_id ? {
            id:               lr.user_id.team_id._id,
            name:             lr.user_id.team_id.name,
            workload_current: lr.user_id.team_id.workload_current,
          } : null,
          team_lead: teamLead ? {
            id:         teamLead._id,
            first_name: teamLead.first_name,
            last_name:  teamLead.last_name,
            email:      teamLead.email,
            avatar:     teamLead.avatar,
          } : null,
        },
      }
    }))

    res.json(enriched)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/current-leaves/employee/:userId
// Full profile: all leave history + team + work performance ratio
router.get('/employee/:userId', verifyToken, requireRole('manager', 'hr', 'admin'), async (req, res) => {
  try {
    const emp = await User.findById(req.params.userId)
      .populate('team_id', 'name workload_current team_lead_id')
      .lean()

    if (!emp) return res.status(404).json({ error: 'Employee not found' })

    // All leave history
    const allLeaves = await LeaveRequest.find({ user_id: emp._id })
      .sort({ createdAt: -1 })
      .lean()

    // Team lead info
    const teamLead = emp.team_id?.team_lead_id
      ? await User.findById(emp.team_id.team_lead_id, 'first_name last_name email avatar').lean()
      : null

    // Work performance ratio — based on leave usage vs balance
    const totalAnnualUsed = allLeaves
      .filter(l => l.type === 'annual' && l.status === 'approved')
      .reduce((s, l) => s + (l.days_count || 0), 0)
    const totalSickUsed = allLeaves
      .filter(l => l.type === 'sick' && l.status === 'approved')
      .reduce((s, l) => s + (l.days_count || 0), 0)
    const emergencyCount = allLeaves.filter(l => l.type === 'emergency').length
    const deniedCount    = allLeaves.filter(l => l.status === 'denied').length

    // Simple performance score: 100 - (sick days * 5) - (emergency * 10) - (denied * 2)
    const performanceScore = Math.max(0, Math.min(100,
      100 - (totalSickUsed * 5) - (emergencyCount * 10) - (deniedCount * 2)
    ))

    const { password_hash, password_plain, __v, ...safeEmp } = emp

    res.json({
      employee: {
        ...safeEmp,
        id: emp._id,
        team: emp.team_id ? {
          id:               emp.team_id._id,
          name:             emp.team_id.name,
          workload_current: emp.team_id.workload_current,
        } : null,
        team_lead: teamLead ? {
          id:         teamLead._id,
          first_name: teamLead.first_name,
          last_name:  teamLead.last_name,
          email:      teamLead.email,
          avatar:     teamLead.avatar,
        } : null,
      },
      leave_history: allLeaves.map(l => ({ ...l, id: l._id })),
      stats: {
        total_leaves:      allLeaves.length,
        annual_days_used:  totalAnnualUsed,
        sick_days_used:    totalSickUsed,
        emergency_count:   emergencyCount,
        denied_count:      deniedCount,
        performance_score: performanceScore,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
