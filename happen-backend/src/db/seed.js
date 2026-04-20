import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import Team from './models/Team.js'
import User from './models/User.js'
import LeaveRequest from './models/LeaveRequest.js'
import Notification from './models/Notification.js'
import AuditLog from './models/AuditLog.js'

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB Atlas')

  // Wipe existing data
  await Promise.all([
    Team.deleteMany({}),
    User.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ])
  console.log('Cleared existing data')

  // ── Teams ──────────────────────────────────────────────────────────────────
  const teamDefs = [
    { name: 'Design',        workload_current: 65, workload_threshold_high: 80 },
    { name: 'Development',   workload_current: 89, workload_threshold_high: 80 },
    { name: 'Marketing',     workload_current: 45, workload_threshold_high: 80 },
    { name: 'Client Success',workload_current: 70, workload_threshold_high: 80 },
    { name: 'HR',            workload_current: 20, workload_threshold_high: 80 },
    { name: 'Accounting',    workload_current: 30, workload_threshold_high: 80 },
    { name: 'System',        workload_current: 0,  workload_threshold_high: 80 },
  ]
  const teams = await Team.insertMany(teamDefs)
  const T = Object.fromEntries(teams.map(t => [t.name, t._id]))
  console.log('Teams seeded')

  // ── Users ──────────────────────────────────────────────────────────────────
  // ONE manager only (Michael Brown), proper team lead per team
  const userDefs = [
    // Admin
    { email: 'admin@happen.com',               password: 'Admin2026!',       first_name: 'Alex',     last_name: 'Rivera',    role: 'admin',      team: 'System',        avatar: 'AR' },
    // Single Manager
    { email: 'michael@creativesolutions.com',  password: 'MichaelMgr456!',   first_name: 'Michael',  last_name: 'Brown',     role: 'manager',    team: 'System',        avatar: 'MB' },
    // HR
    { email: 'lisa@creativesolutions.com',     password: 'LisaHR789!',       first_name: 'Lisa',     last_name: 'Wong',      role: 'hr',         team: 'HR',            avatar: 'LW' },
    { email: 'kevin@creativesolutions.com',    password: 'KevinHR123!',      first_name: 'Kevin',    last_name: 'Park',      role: 'hr',         team: 'HR',            avatar: 'KP' },
    // Accounting
    { email: 'robert@creativesolutions.com',   password: 'RobertAcct789!',   first_name: 'Robert',   last_name: 'Chen',      role: 'accounting', team: 'Accounting',    avatar: 'RC' },
    { email: 'maria@creativesolutions.com',    password: 'MariaAcct456!',    first_name: 'Maria',    last_name: 'Garcia',    role: 'accounting', team: 'Accounting',    avatar: 'MG' },
    // Design Team Lead + members
    { email: 'sarah@creativesolutions.com',    password: 'SarahLead123!',    first_name: 'Sarah',    last_name: 'Chen',      role: 'team_lead',  team: 'Design',        avatar: 'SC' },
    { email: 'james.wu@creativesolutions.com', password: 'JamesWu123!',      first_name: 'James',    last_name: 'Wu',        role: 'employee',   team: 'Design',        avatar: 'JW' },
    { email: 'elena@creativesolutions.com',    password: 'ElenaRod456!',     first_name: 'Elena',    last_name: 'Rodriguez', role: 'employee',   team: 'Design',        avatar: 'ER' },
    { email: 'omar@creativesolutions.com',     password: 'OmarHas789!',      first_name: 'Omar',     last_name: 'Hassan',    role: 'employee',   team: 'Design',        avatar: 'OH' },
    { email: 'priya@creativesolutions.com',    password: 'PriyaKap123!',     first_name: 'Priya',    last_name: 'Kapoor',    role: 'employee',   team: 'Design',        avatar: 'PK' },
    // Development Team Lead + members
    { email: 'marcus@creativesolutions.com',   password: 'MarcusLead456!',   first_name: 'Marcus',   last_name: 'Taylor',    role: 'team_lead',  team: 'Development',   avatar: 'MT' },
    { email: 'andre@creativesolutions.com',    password: 'AndreDev789!',     first_name: 'Andre',    last_name: 'Johnson',   role: 'employee',   team: 'Development',   avatar: 'AJ' },
    { email: 'yuki@creativesolutions.com',     password: 'YukiTan123!',      first_name: 'Yuki',     last_name: 'Tanaka',    role: 'employee',   team: 'Development',   avatar: 'YT' },
    { email: 'lena@creativesolutions.com',     password: 'LenaFis456!',      first_name: 'Lena',     last_name: 'Fischer',   role: 'employee',   team: 'Development',   avatar: 'LF' },
    { email: 'david.o@creativesolutions.com',  password: 'DavidOk789!',      first_name: 'David',    last_name: 'Okafor',    role: 'employee',   team: 'Development',   avatar: 'DO' },
    // Marketing Team Lead + members
    { email: 'jessica@creativesolutions.com',  password: 'JessicaLead789!',  first_name: 'Jessica',  last_name: 'Martinez',  role: 'team_lead',  team: 'Marketing',     avatar: 'JM' },
    { email: 'ryan@creativesolutions.com',     password: 'RyanOC123!',       first_name: 'Ryan',     last_name: "O'Connor",  role: 'employee',   team: 'Marketing',     avatar: 'RO' },
    { email: 'nadia@creativesolutions.com',    password: 'NadiaPet456!',     first_name: 'Nadia',    last_name: 'Petrova',   role: 'employee',   team: 'Marketing',     avatar: 'NP' },
    { email: 'wei@creativesolutions.com',      password: 'WeiZhang789!',     first_name: 'Wei',      last_name: 'Zhang',     role: 'employee',   team: 'Marketing',     avatar: 'WZ' },
    // Client Success Team Lead + members
    { email: 'david.k@creativesolutions.com',  password: 'DavidLead123!',    first_name: 'David',    last_name: 'Kim',       role: 'team_lead',  team: 'Client Success',avatar: 'DK' },
    { email: 'sofia@creativesolutions.com',    password: 'SofiaRey456!',     first_name: 'Sofia',    last_name: 'Reyes',     role: 'employee',   team: 'Client Success',avatar: 'SR' },
    { email: 'ahmed@creativesolutions.com',    password: 'AhmedAl789!',      first_name: 'Ahmed',    last_name: 'Al-Rashid', role: 'employee',   team: 'Client Success',avatar: 'AA' },
    { email: 'emma@creativesolutions.com',     password: 'EmmaSul123!',      first_name: 'Emma',     last_name: 'Sullivan',  role: 'employee',   team: 'Client Success',avatar: 'ES' },
    { email: 'carlos@creativesolutions.com',   password: 'CarlosMen456!',    first_name: 'Carlos',   last_name: 'Mendez',    role: 'employee',   team: 'Client Success',avatar: 'CM' },
  ]

  const createdUsers = []
  for (const u of userDefs) {
    const hash = bcrypt.hashSync(u.password, 10)
    const doc = await User.create({
      email: u.email,
      password_hash: hash,
      password_plain: u.password,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      team_id: T[u.team] || null,
      avatar: u.avatar,
      hire_date: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000),
    })
    createdUsers.push({ ...u, _id: doc._id })
  }
  console.log(`Seeded ${createdUsers.length} users`)

  const byEmail = Object.fromEntries(createdUsers.map(u => [u.email, u]))

  // Assign team_lead_id to each team
  const leadMap = {
    'Design':         byEmail['sarah@creativesolutions.com']._id,
    'Development':    byEmail['marcus@creativesolutions.com']._id,
    'Marketing':      byEmail['jessica@creativesolutions.com']._id,
    'Client Success': byEmail['david.k@creativesolutions.com']._id,
  }
  for (const [teamName, leadId] of Object.entries(leadMap)) {
    await Team.findByIdAndUpdate(T[teamName], { team_lead_id: leadId })
  }
  console.log('Team leads assigned')

  // ── Leave Requests ─────────────────────────────────────────────────────────
  const today = new Date()
  const fmt = (d) => d.toISOString().split('T')[0]
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

  const leaveDefs = [
    // Queued (Design team, workload 65%)
    { email: 'james.wu@creativesolutions.com', type: 'annual',    start: addDays(today, 10), end: addDays(today, 12), status: 'queued',    queue_position: 2 },
    { email: 'priya@creativesolutions.com',    type: 'annual',    start: addDays(today, 8),  end: addDays(today, 10), status: 'queued',    queue_position: 1 },
    { email: 'elena@creativesolutions.com',    type: 'annual',    start: addDays(today, 14), end: addDays(today, 16), status: 'queued',    queue_position: 3 },
    // Approved
    { email: 'yuki@creativesolutions.com',     type: 'annual',    start: addDays(today, 7),  end: addDays(today, 9),  status: 'approved' },
    { email: 'sofia@creativesolutions.com',    type: 'sick',      start: today,              end: today,              status: 'approved' },
    { email: 'ryan@creativesolutions.com',     type: 'wellness',  start: today,              end: today,              status: 'approved', half_day: true, am_pm: 'PM' },
    { email: 'nadia@creativesolutions.com',    type: 'annual',    start: addDays(today, 9),  end: addDays(today, 11), status: 'approved' },
    // Emergency
    { email: 'andre@creativesolutions.com',    type: 'emergency', start: null,               end: null,               status: 'emergency', proof_submitted: false },
    { email: 'lena@creativesolutions.com',     type: 'emergency', start: null,               end: null,               status: 'emergency', proof_submitted: true },
    // Denied
    { email: 'david.o@creativesolutions.com',  type: 'annual',    start: addDays(today, 5),  end: addDays(today, 7),  status: 'denied',   override_reason: 'Critical sprint in progress' },
    // Past approved (for calendar history)
    { email: 'omar@creativesolutions.com',     type: 'sick',      start: addDays(today,-5),  end: addDays(today,-5),  status: 'approved' },
    { email: 'carlos@creativesolutions.com',   type: 'annual',    start: addDays(today,-10), end: addDays(today,-8),  status: 'approved' },
    { email: 'wei@creativesolutions.com',      type: 'wellness',  start: addDays(today,-3),  end: addDays(today,-3),  status: 'approved', half_day: true, am_pm: 'AM' },
    { email: 'ahmed@creativesolutions.com',    type: 'annual',    start: addDays(today,-15), end: addDays(today,-13), status: 'approved' },
    { email: 'emma@creativesolutions.com',     type: 'sick',      start: addDays(today,-2),  end: addDays(today,-1),  status: 'approved' },
  ]

  const managerUser = byEmail['michael@creativesolutions.com']

  for (const l of leaveDefs) {
    const u = byEmail[l.email]
    if (!u) continue
    const days = l.start && l.end ? Math.ceil((l.end - l.start) / (1000 * 60 * 60 * 24)) + 1 : 1
    const lr = await LeaveRequest.create({
      user_id:        u._id,
      start_date:     l.start ? fmt(l.start) : null,
      end_date:       l.end   ? fmt(l.end)   : null,
      days_count:     l.half_day ? 0.5 : days,
      type:           l.type,
      half_day:       l.half_day || false,
      am_pm:          l.am_pm || 'AM',
      status:         l.status,
      queue_position: l.queue_position || null,
      proof_submitted:l.proof_submitted || false,
      override_reason:l.override_reason || null,
      override_by:    l.override_reason ? managerUser._id : null,
      decision_date:  ['approved','denied','emergency'].includes(l.status) ? new Date() : null,
      proof_deadline: l.type === 'emergency' ? new Date(Date.now() + 24*60*60*1000) : null,
    })

    // Notify team lead for pending/queued
    if (['queued','pending'].includes(l.status)) {
      const team = await Team.findById(u.team_id)
      if (team?.team_lead_id) {
        await Notification.create({
          user_id: team.team_lead_id,
          title: 'New Leave Request',
          message: `${u.first_name} ${u.last_name} submitted a ${l.type} leave request.`,
          type: 'info',
        })
      }
      // Also notify manager
      await Notification.create({
        user_id: managerUser._id,
        title: 'New Leave Request',
        message: `${u.first_name} ${u.last_name} (${l.type}) — queued at position ${l.queue_position || 1}.`,
        type: 'info',
      })
    }

    // Notify HR + manager for emergency
    if (l.type === 'emergency') {
      const hrUsers = await User.find({ role: 'hr' })
      for (const hr of hrUsers) {
        await Notification.create({
          user_id: hr._id,
          title: '🚨 Emergency Leave',
          message: `${u.first_name} ${u.last_name} has taken emergency leave. Proof required within 24 hours.`,
          type: 'error',
        })
      }
      await Notification.create({
        user_id: managerUser._id,
        title: '🚨 Emergency Leave',
        message: `${u.first_name} ${u.last_name} has taken emergency leave.`,
        type: 'error',
      })
    }
  }
  console.log('Leave requests seeded')

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  const actions = [
    { action: 'login',                   details: 'User logged in' },
    { action: 'leave_request.created',   details: 'Leave request submitted' },
    { action: 'leave_request.approved',  details: 'Leave request approved' },
    { action: 'leave_request.denied',    details: 'Leave request denied' },
    { action: 'password.reset',          details: 'Password reset by admin' },
  ]
  for (const u of createdUsers) {
    const count = Math.floor(Math.random() * 4) + 2
    for (let i = 0; i < count; i++) {
      const act = actions[Math.floor(Math.random() * actions.length)]
      await AuditLog.create({
        user_id: u._id,
        action: act.action,
        details: act.details,
        ip_address: '127.0.0.1',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      })
    }
  }
  console.log('Audit logs seeded')

  // ── Welcome notifications ──────────────────────────────────────────────────
  for (const u of createdUsers) {
    await Notification.create({
      user_id: u._id,
      title: 'Welcome to Happen!',
      message: `Hi ${u.first_name}, your account is ready. Explore your dashboard.`,
      type: 'info',
    })
  }
  console.log('Notifications seeded')

  await mongoose.disconnect()
  console.log('✅ Seeding complete!')
}

seed().catch(e => { console.error(e); process.exit(1) })
