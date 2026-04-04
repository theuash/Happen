import { createDatabase } from './database.js'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROLES = [
  { id: 1, name: 'admin', permissions: '["*"]' },
  { id: 2, name: 'manager', permissions: '["approve","view"]' },
  { id: 3, name: 'team_lead', permissions: '["approve","view"]' },
  { id: 4, name: 'hr', permissions: '["hr","view"]' },
  { id: 5, name: 'accounting', permissions: '["accounting","view"]' },
  { id: 6, name: 'employee', permissions: '[]' }
]

const TEAMS = [
  { name: 'Operations', workload_current: 0 },
  { name: 'Creative', workload_current: 0 },
  { name: 'Technical', workload_current: 0 },
  { name: 'HR', workload_current: 0 },
  { name: 'Accounting', workload_current: 0 },
  { name: 'Design', workload_current: 65 },
  { name: 'Development', workload_current: 89 },
  { name: 'Marketing', workload_current: 45 },
  { name: 'Client Success', workload_current: 70 },
  { name: 'System', workload_current: 0 }
]

const USERS = [
  // Leadership
  { email: 'michael@creativesolutions.com', password: 'MichaelMgr456!', first_name: 'Michael', last_name: 'Brown',     role: 'manager',    team: 'Operations', avatar: 'MB' },
  { email: 'olivia@creativesolutions.com',  password: 'OliviaDr789!',   first_name: 'Olivia',  last_name: 'Martinez',  role: 'manager',    team: 'Creative',   avatar: 'OM' },
  { email: 'thomas@creativesolutions.com',  password: 'ThomasTD456!',   first_name: 'Thomas',  last_name: 'Wright',    role: 'manager',    team: 'Technical',  avatar: 'TW' },
  { email: 'diana@creativesolutions.com',   password: 'DianaOM123!',    first_name: 'Diana',   last_name: 'Prince',    role: 'employee',   team: 'Operations', avatar: 'DP' },
  // HR
  { email: 'lisa@creativesolutions.com',    password: 'LisaHR789!',     first_name: 'Lisa',    last_name: 'Wong',      role: 'hr',         team: 'HR',         avatar: 'LW' },
  { email: 'kevin@creativesolutions.com',   password: 'KevinHR123!',    first_name: 'Kevin',   last_name: 'Park',      role: 'hr',         team: 'HR',         avatar: 'KP' },
  // Accounting
  { email: 'robert@creativesolutions.com',  password: 'RobertAcct789!', first_name: 'Robert',  last_name: 'Chen',      role: 'accounting', team: 'Accounting', avatar: 'RC' },
  { email: 'maria@creativesolutions.com',   password: 'MariaAcct456!',  first_name: 'Maria',   last_name: 'Garcia',    role: 'accounting', team: 'Accounting', avatar: 'MG' },
  { email: 'james.w@creativesolutions.com',password: 'JamesPayroll123!',first_name: 'James',  last_name: 'Wilson',    role: 'accounting', team: 'Accounting', avatar: 'JW' },
  // Design Team
  { email: 'sarah@creativesolutions.com',   password: 'SarahLead123!',  first_name: 'Sarah',   last_name: 'Chen',      role: 'team_lead',  team: 'Design',     avatar: 'SC' },
  { email: 'james.wu@creativesolutions.com',password: 'JamesWu123!',    first_name: 'James',   last_name: 'Wu',        role: 'employee',   team: 'Design',     avatar: 'JW' },
  { email: 'elena@creativesolutions.com',   password: 'ElenaRod456!',   first_name: 'Elena',   last_name: 'Rodriguez', role: 'employee',   team: 'Design',     avatar: 'ER' },
  { email: 'omar@creativesolutions.com',    password: 'OmarHas789!',    first_name: 'Omar',    last_name: 'Hassan',    role: 'employee',   team: 'Design',     avatar: 'OH' },
  { email: 'priya@creativesolutions.com',   password: 'PriyaKap123!',   first_name: 'Priya',   last_name: 'Kapoor',    role: 'employee',   team: 'Design',     avatar: 'PK' },
  // Dev Team
  { email: 'marcus@creativesolutions.com',  password: 'MarcusLead456!', first_name: 'Marcus',  last_name: 'Taylor',    role: 'team_lead',  team: 'Development',avatar: 'MT' },
  { email: 'andre@creativesolutions.com',   password: 'AndreDev789!',   first_name: 'Andre',   last_name: 'Johnson',   role: 'employee',   team: 'Development',avatar: 'AJ' },
  { email: 'yuki@creativesolutions.com',    password: 'YukiTan123!',    first_name: 'Yuki',    last_name: 'Tanaka',    role: 'employee',   team: 'Development',avatar: 'YT' },
  { email: 'lena@creativesolutions.com',    password: 'LenaFis456!',    first_name: 'Lena',    last_name: 'Fischer',   role: 'employee',   team: 'Development',avatar: 'LF' },
  { email: 'david.o@creativesolutions.com', password: 'DavidOk789!',    first_name: 'David',   last_name: 'Okafor',    role: 'employee',   team: 'Development',avatar: 'DO' },
  // Marketing Team
  { email: 'jessica@creativesolutions.com', password: 'JessicaLead789!',first_name: 'Jessica', last_name: 'Martinez',  role: 'team_lead',  team: 'Marketing',  avatar: 'JM' },
  { email: 'ryan@creativesolutions.com',    password: 'RyanOC123!',     first_name: 'Ryan',    last_name: "O'Connor",  role: 'employee',   team: 'Marketing',  avatar: 'RO' },
  { email: 'nadia@creativesolutions.com',   password: 'NadiaPet456!',   first_name: 'Nadia',   last_name: 'Petrova',   role: 'employee',   team: 'Marketing',  avatar: 'NP' },
  { email: 'wei@creativesolutions.com',     password: 'WeiZhang789!',   first_name: 'Wei',     last_name: 'Zhang',     role: 'employee',   team: 'Marketing',  avatar: 'WZ' },
  { email: 'chloe@creativesolutions.com',   password: 'ChloeDub123!',   first_name: 'Chloe',   last_name: 'Dubois',    role: 'employee',   team: 'Marketing',  avatar: 'CD' },
  // Client Success Team
  { email: 'david.k@creativesolutions.com', password: 'DavidLead123!',  first_name: 'David',   last_name: 'Kim',       role: 'team_lead',  team: 'Client Success', avatar: 'DK' },
  { email: 'sofia@creativesolutions.com',   password: 'SofiaRey456!',   first_name: 'Sofia',   last_name: 'Reyes',     role: 'employee',   team: 'Client Success', avatar: 'SR' },
  { email: 'ahmed@creativesolutions.com',   password: 'AhmedAl789!',    first_name: 'Ahmed',   last_name: 'Al-Rashid', role: 'employee',   team: 'Client Success', avatar: 'AA' },
  { email: 'emma@creativesolutions.com',    password: 'EmmaSul123!',    first_name: 'Emma',    last_name: 'Sullivan',  role: 'employee',   team: 'Client Success', avatar: 'ES' },
  { email: 'carlos@creativesolutions.com',  password: 'CarlosMen456!',  first_name: 'Carlos',  last_name: 'Mendez',    role: 'employee',   team: 'Client Success', avatar: 'CM' },
  // Admin
  { email: 'admin@happen.com',              password: 'Admin2026!',     first_name: 'Alex',    last_name: 'Rivera',    role: 'admin',      team: 'System',     avatar: 'AR' },
]

const LEAVE_REQUESTS = [
  { user: 'james.wu',  start: '2026-03-20', end: '2026-03-22', type: 'annual',    status: 'queued',    queue_position: 2 },
  { user: 'priya',     start: '2026-03-18', end: '2026-03-20', type: 'annual',    status: 'queued',    queue_position: 1 },
  { user: 'andre',     start: '2026-03-05', end: '2026-03-05', type: 'emergency', status: 'emergency', proof_submitted: 0 },
  { user: 'yuki',      start: '2026-03-10', end: '2026-03-12', type: 'annual',    status: 'approved' },
  { user: 'ryan',      start: '2026-03-15', end: '2026-03-16', type: 'annual',    status: 'queued',    queue_position: 1 },
  { user: 'sofia',     start: '2026-03-04', end: '2026-03-04', type: 'emergency', status: 'emergency', proof_submitted: 1 },
  { user: 'lena',      start: '2026-03-12', end: '2026-03-14', type: 'annual',    status: 'denied',    override_reason: 'Critical sprint in progress' },
]

function daysBetween(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = endDate - startDate
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

async function seed() {
  const db = createDatabase('happen.db')
  await db.init()

  // Load and execute schema first (CREATE TABLE IF NOT EXISTS)
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  db.exec(schema)

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (existing.count > 0) {
    console.log('Database already seeded')
    db.close()
    return
  }

  console.log('Seeding database...')

  // Seed roles
  for (const role of ROLES) {
    db.prepare('INSERT INTO roles (id, name, permissions) VALUES (?, ?, ?)').run([role.id, role.name, role.permissions])
  }

  // Seed teams and map name->id
  const teamIdMap = {}
  for (const team of TEAMS) {
    const info = db.prepare('INSERT INTO teams (name, workload_current) VALUES (?, ?)').run([team.name, team.workload_current])
    teamIdMap[team.name] = info.lastInsertRowid
    console.log(`Seeded team ${team.name} with id ${info.lastInsertRowid}`)
  }
  console.log('teamIdMap:', teamIdMap)

  // Seed users and map email->id
  const userIdByEmail = {}
  for (const user of USERS) {
    const hashed = bcrypt.hashSync(user.password, 10)
    const info = db.prepare(`
      INSERT INTO users (email, password_hash, password_plain, first_name, last_name, role, team_id, avatar, leave_balance_annual, leave_balance_sick)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 20, 10)
    `).run([user.email, hashed, user.password, user.first_name, user.last_name, user.role, teamIdMap[user.team], user.avatar])
    userIdByEmail[user.email] = info.lastInsertRowid
  }

  // Set team_lead_id for teams that have a manager or team_lead
  for (const user of USERS) {
    if (['team_lead', 'manager'].includes(user.role)) {
      const teamId = teamIdMap[user.team]
      if (teamId) {
        db.prepare('UPDATE teams SET team_lead_id = ? WHERE id = ?').run([userIdByEmail[user.email], teamId])
      }
    }
  }

  // Seed leave requests
  for (const req of LEAVE_REQUESTS) {
    // Find user by email prefix (local part)
    const userEntry = USERS.find(u => u.email.split('@')[0] === req.user)
    if (!userEntry) {
      console.warn(`User not found for leave request: ${req.user}`)
      continue
    }
    const userId = userIdByEmail[userEntry.email]
    const daysCount = daysBetween(req.start, req.end)

    const status = req.status
    const queuePosition = req.queue_position || null
    const proofSubmitted = req.proof_submitted || 0
    const overrideReason = req.override_reason || null
    const managerOverride = 0
    const overrideBy = null
    const decisionDate = (status === 'approved' || status === 'denied') ? new Date().toISOString() : null

    const info = db.prepare(`
      INSERT INTO leave_requests (
        user_id, start_date, end_date, days_count, type, reason,
        status, queue_position, priority_score, proof_submitted,
        proof_url, proof_deadline, manager_override, override_reason,
        override_by, decision_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      userId, req.start, req.end, daysCount, req.type, null,
      status, queuePosition, 0, proofSubmitted,
      null, null, managerOverride, overrideReason,
      overrideBy, decisionDate
    ])

    // If status is denied with override_reason, create an override record
    if (status === 'denied' && overrideReason) {
      const teamLeadUser = USERS.find(u => u.team === userEntry.team && ['team_lead','manager'].includes(u.role))
      if (teamLeadUser) {
        const managerId = userIdByEmail[teamLeadUser.email]
        db.prepare('INSERT INTO overrides (manager_id, request_id, decision, reason, visible_to_employee) VALUES (?, ?, ?, ?, ?)').run([
          managerId,
          info.lastInsertRowid,
          'denied',
          overrideReason,
          1
        ])
      }
    }
  }

  // Seed audit_logs
  const actions = [
    { action: 'login', details: 'User logged in' },
    { action: 'leave_request.created', details: 'Leave request submitted' },
    { action: 'leave_request.approved', details: 'Leave request approved by manager' },
    { action: 'leave_request.denied', details: 'Leave request denied' },
    { action: 'password.reset', details: 'Password reset by admin' }
  ]
  for (const user of USERS) {
    const uid = userIdByEmail[user.email]
    const numLogs = Math.floor(Math.random() * 4) + 2
    for (let i = 0; i < numLogs; i++) {
      const act = actions[Math.floor(Math.random() * actions.length)]
      const created_at = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      db.prepare('INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)').run([
        uid,
        act.action,
        act.details,
        '127.0.0.1',
        created_at
      ])
    }
  }

  // Seed donations
  for (let i = 0; i < 20; i++) {
    const donor = USERS[Math.floor(Math.random() * USERS.length)]
    const recipient = USERS[Math.floor(Math.random() * USERS.length)]
    if (donor.email === recipient.email) continue
    const days = Math.floor(Math.random() * 5) + 1
    const created_at = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
    db.prepare('INSERT INTO donations (donor_id, recipient_id, campaign_name, days, created_at) VALUES (?, ?, ?, ?, ?)').run([
      userIdByEmail[donor.email],
      userIdByEmail[recipient.email],
      null,
      days,
      created_at
    ])
  }

  // Seed notifications
  const notificationTemplates = [
    { title: 'Leave Request Update', message: 'Your leave request has been approved.', type: 'info' },
    { title: 'Leave Request Update', message: 'Your leave request has been denied.', type: 'error' },
    { title: 'New Donation', message: 'You have received a donation of X days.', type: 'success' },
    { title: 'Team Workload', message: 'Your team workload is currently high.', type: 'warning' },
    { title: 'Welcome', message: 'Welcome to Happen!', type: 'info' }
  ]
  for (const user of USERS) {
    const uid = userIdByEmail[user.email]
    const numNotifs = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < numNotifs; i++) {
      const templ = notificationTemplates[Math.floor(Math.random() * notificationTemplates.length)]
      const message = templ.message.replace('X', Math.floor(Math.random()*3+1).toString())
      const created_at = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      db.prepare('INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (?, ?, ?, ?, ?)').run([
        uid,
        templ.title,
        message,
        templ.type,
        created_at
      ])
    }
  }

  console.log('Seeding completed')
  db.close()
}

seed().catch(console.error)
