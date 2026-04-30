/**
 * HAPPEN — Master Seed File
 * Run: node src/db/seed.js
 * Wipes and re-seeds ALL collections in one go.
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import Team         from './models/Team.js'
import User         from './models/User.js'
import LeaveRequest from './models/LeaveRequest.js'
import Notification from './models/Notification.js'
import AuditLog     from './models/AuditLog.js'
import Project      from './models/Project.js'
import OKR          from './models/OKR.js'
import WikiPage     from './models/WikiPage.js'
import Resource     from './models/Resource.js'
import Kudos        from './models/Kudos.js'
import TimeEntry    from './models/TimeEntry.js'
import Donation     from './models/Donation.js'

// ── helpers ───────────────────────────────────────────────────────────────────
const pw   = (p) => bcrypt.hashSync(p, 10)
const fmt  = (d) => new Date(d).toISOString().split('T')[0]
const add  = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d) }
const past = (n) => add(-n)
const rnd  = (a) => a[Math.floor(Math.random() * a.length)]
const today = fmt(new Date())

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***@'))

  // ── WIPE ALL ──────────────────────────────────────────────────────────────
  await Promise.all([
    Team.deleteMany({}), User.deleteMany({}), LeaveRequest.deleteMany({}),
    Notification.deleteMany({}), AuditLog.deleteMany({}), Project.deleteMany({}),
    OKR.deleteMany({}), WikiPage.deleteMany({}), Resource.deleteMany({}),
    Kudos.deleteMany({}), TimeEntry.deleteMany({}), Donation.deleteMany({}),
  ])
  console.log('🗑  Cleared all collections')

  // ── TEAMS ─────────────────────────────────────────────────────────────────
  const teams = await Team.insertMany([
    { name: 'Design',         workload_current: 65, workload_threshold_high: 80 },
    { name: 'Development',    workload_current: 89, workload_threshold_high: 80 },
    { name: 'Marketing',      workload_current: 45, workload_threshold_high: 80 },
    { name: 'Client Success', workload_current: 70, workload_threshold_high: 80 },
    { name: 'HR',             workload_current: 20, workload_threshold_high: 80 },
    { name: 'Accounting',     workload_current: 30, workload_threshold_high: 80 },
    { name: 'System',         workload_current: 0,  workload_threshold_high: 80 },
  ])
  const T = Object.fromEntries(teams.map(t => [t.name, t._id]))
  console.log(`👥 Teams: ${teams.length}`)

  // ── USERS ─────────────────────────────────────────────────────────────────
  const userDefs = [
    { email:'admin@happen.com',               pass:'Admin2026!',       fn:'Alex',    ln:'Rivera',    role:'admin',      team:'System',        av:'AR' },
    { email:'michael@creativesolutions.com',  pass:'MichaelMgr456!',  fn:'Michael', ln:'Brown',     role:'manager',    team:'System',        av:'MB' },
    { email:'lisa@creativesolutions.com',     pass:'LisaHR789!',      fn:'Lisa',    ln:'Wong',      role:'hr',         team:'HR',            av:'LW' },
    { email:'kevin@creativesolutions.com',    pass:'KevinHR123!',     fn:'Kevin',   ln:'Park',      role:'hr',         team:'HR',            av:'KP' },
    { email:'robert@creativesolutions.com',   pass:'RobertAcct789!',  fn:'Robert',  ln:'Chen',      role:'accounting', team:'Accounting',    av:'RC' },
    { email:'maria@creativesolutions.com',    pass:'MariaAcct456!',   fn:'Maria',   ln:'Garcia',    role:'accounting', team:'Accounting',    av:'MG' },
    { email:'sarah@creativesolutions.com',    pass:'SarahLead123!',   fn:'Sarah',   ln:'Chen',      role:'team_lead',  team:'Design',        av:'SC' },
    { email:'james.wu@creativesolutions.com', pass:'JamesWu123!',     fn:'James',   ln:'Wu',        role:'employee',   team:'Design',        av:'JW' },
    { email:'elena@creativesolutions.com',    pass:'ElenaRod456!',    fn:'Elena',   ln:'Rodriguez', role:'employee',   team:'Design',        av:'ER' },
    { email:'omar@creativesolutions.com',     pass:'OmarHas789!',     fn:'Omar',    ln:'Hassan',    role:'employee',   team:'Design',        av:'OH' },
    { email:'priya@creativesolutions.com',    pass:'PriyaKap123!',    fn:'Priya',   ln:'Kapoor',    role:'employee',   team:'Design',        av:'PK' },
    { email:'marcus@creativesolutions.com',   pass:'MarcusLead456!',  fn:'Marcus',  ln:'Taylor',    role:'team_lead',  team:'Development',   av:'MT' },
    { email:'andre@creativesolutions.com',    pass:'AndreDev789!',    fn:'Andre',   ln:'Johnson',   role:'employee',   team:'Development',   av:'AJ' },
    { email:'yuki@creativesolutions.com',     pass:'YukiTan123!',     fn:'Yuki',    ln:'Tanaka',    role:'employee',   team:'Development',   av:'YT' },
    { email:'lena@creativesolutions.com',     pass:'LenaFis456!',     fn:'Lena',    ln:'Fischer',   role:'employee',   team:'Development',   av:'LF' },
    { email:'david.o@creativesolutions.com',  pass:'DavidOk789!',     fn:'David',   ln:'Okafor',    role:'employee',   team:'Development',   av:'DO' },
    { email:'jessica@creativesolutions.com',  pass:'JessicaLead789!', fn:'Jessica', ln:'Martinez',  role:'team_lead',  team:'Marketing',     av:'JM' },
    { email:'ryan@creativesolutions.com',     pass:'RyanOC123!',      fn:'Ryan',    ln:"O'Connor",  role:'employee',   team:'Marketing',     av:'RO' },
    { email:'nadia@creativesolutions.com',    pass:'NadiaPet456!',    fn:'Nadia',   ln:'Petrova',   role:'employee',   team:'Marketing',     av:'NP' },
    { email:'wei@creativesolutions.com',      pass:'WeiZhang789!',    fn:'Wei',     ln:'Zhang',     role:'employee',   team:'Marketing',     av:'WZ' },
    { email:'david.k@creativesolutions.com',  pass:'DavidLead123!',   fn:'David',   ln:'Kim',       role:'team_lead',  team:'Client Success',av:'DK' },
    { email:'sofia@creativesolutions.com',    pass:'SofiaRey456!',    fn:'Sofia',   ln:'Reyes',     role:'employee',   team:'Client Success',av:'SR' },
    { email:'ahmed@creativesolutions.com',    pass:'AhmedAl789!',     fn:'Ahmed',   ln:'Al-Rashid', role:'employee',   team:'Client Success',av:'AA' },
    { email:'emma@creativesolutions.com',     pass:'EmmaSul123!',     fn:'Emma',    ln:'Sullivan',  role:'employee',   team:'Client Success',av:'ES' },
    { email:'carlos@creativesolutions.com',   pass:'CarlosMen456!',   fn:'Carlos',  ln:'Mendez',    role:'employee',   team:'Client Success',av:'CM' },
  ]

  const created = []
  for (const u of userDefs) {
    const doc = await User.create({
      email: u.email, password_hash: pw(u.pass), password_plain: u.pass,
      first_name: u.fn, last_name: u.ln, role: u.role,
      team_id: T[u.team] || null, avatar: u.av,
      hire_date: new Date(Date.now() - Math.random() * 3 * 365 * 86400000),
    })
    created.push({ ...u, _id: doc._id })
  }
  const U = Object.fromEntries(created.map(u => [u.email, u]))
  console.log(`👤 Users: ${created.length}`)

  // Assign team leads
  for (const [name, email] of [
    ['Design',         'sarah@creativesolutions.com'],
    ['Development',    'marcus@creativesolutions.com'],
    ['Marketing',      'jessica@creativesolutions.com'],
    ['Client Success', 'david.k@creativesolutions.com'],
  ]) { await Team.findByIdAndUpdate(T[name], { team_lead_id: U[email]._id }) }

  // ── LEAVE REQUESTS ────────────────────────────────────────────────────────
  const mgr = U['michael@creativesolutions.com']
  const hrIds = created.filter(u => u.role === 'hr').map(u => u._id)

  const leaveDefs = [
    { e:'priya@creativesolutions.com',    type:'annual',    s:add(8),   en:add(10),  st:'queued',    qp:1 },
    { e:'james.wu@creativesolutions.com', type:'annual',    s:add(10),  en:add(12),  st:'queued',    qp:2 },
    { e:'elena@creativesolutions.com',    type:'annual',    s:add(14),  en:add(16),  st:'queued',    qp:3 },
    { e:'andre@creativesolutions.com',    type:'annual',    s:add(9),   en:add(11),  st:'queued',    qp:1 },
    { e:'david.o@creativesolutions.com',  type:'annual',    s:add(12),  en:add(14),  st:'queued',    qp:2 },
    { e:'sofia@creativesolutions.com',    type:'annual',    s:add(8),   en:add(9),   st:'queued',    qp:1 },
    { e:'yuki@creativesolutions.com',     type:'annual',    s:add(7),   en:add(9),   st:'approved' },
    { e:'nadia@creativesolutions.com',    type:'annual',    s:add(9),   en:add(11),  st:'approved' },
    { e:'ryan@creativesolutions.com',     type:'annual',    s:add(14),  en:add(16),  st:'approved' },
    { e:'omar@creativesolutions.com',     type:'sick',      s:today,    en:today,    st:'approved' },
    { e:'carlos@creativesolutions.com',   type:'sick',      s:today,    en:today,    st:'approved' },
    { e:'wei@creativesolutions.com',      type:'wellness',  s:today,    en:today,    st:'approved', hd:true, ap:'AM' },
    { e:'emma@creativesolutions.com',     type:'wellness',  s:today,    en:today,    st:'approved', hd:true, ap:'PM' },
    { e:'lena@creativesolutions.com',     type:'emergency', s:null,     en:null,     st:'emergency', ps:false },
    { e:'ahmed@creativesolutions.com',    type:'emergency', s:null,     en:null,     st:'emergency', ps:true  },
    { e:'david.o@creativesolutions.com',  type:'annual',    s:past(5),  en:past(3),  st:'denied',   or:'Critical sprint in progress' },
    { e:'james.wu@creativesolutions.com', type:'annual',    s:past(20), en:past(18), st:'approved' },
    { e:'priya@creativesolutions.com',    type:'sick',      s:past(10), en:past(10), st:'approved' },
    { e:'marcus@creativesolutions.com',   type:'annual',    s:past(15), en:past(13), st:'approved' },
    { e:'jessica@creativesolutions.com',  type:'annual',    s:past(8),  en:past(6),  st:'approved' },
  ]

  for (const l of leaveDefs) {
    const u = U[l.e]; if (!u) continue
    const days = l.s && l.en ? Math.ceil((new Date(l.en) - new Date(l.s)) / 86400000) + 1 : 1
    await LeaveRequest.create({
      user_id: u._id, type: l.type,
      start_date: l.s || null, end_date: l.en || null,
      days_count: l.hd ? 0.5 : days, half_day: l.hd || false, am_pm: l.ap || 'AM',
      status: l.st, queue_position: l.qp || null,
      proof_submitted: l.ps || false, override_reason: l.or || null,
      override_by: l.or ? mgr._id : null,
      decision_date: ['approved','denied','emergency'].includes(l.st) ? new Date() : null,
      proof_deadline: l.type === 'emergency' ? new Date(Date.now() + 86400000) : null,
    })
    if (l.st === 'queued') {
      const notifIds = [...hrIds, mgr._id]
      await Notification.insertMany(notifIds.map(id => ({
        user_id: id, title: 'New Leave Request in Queue',
        message: `${u.fn} ${u.ln} requested ${l.type} leave (queue #${l.qp}).`,
        type: 'info', link: `/current-leaves?employee=${u._id}`,
      })))
    }
    if (l.type === 'emergency') {
      const notifIds = [...hrIds, mgr._id]
      await Notification.insertMany(notifIds.map(id => ({
        user_id: id, title: '🚨 Emergency Leave',
        message: `${u.fn} ${u.ln} has taken emergency leave. Proof required within 24 hours.`,
        type: 'error', link: `/current-leaves?employee=${u._id}`,
      })))
    }
  }
  console.log('📋 Leave requests seeded')

  // ── AUDIT LOGS ────────────────────────────────────────────────────────────
  const auditActions = [
    { action:'login',                  details:'User logged in' },
    { action:'leave_request.created',  details:'Leave request submitted' },
    { action:'leave_request.approved', details:'Leave request approved' },
    { action:'leave_request.denied',   details:'Leave request denied' },
    { action:'password.reset',         details:'Password reset by admin' },
  ]
  for (const u of created) {
    const n = Math.floor(Math.random() * 4) + 2
    for (let i = 0; i < n; i++) {
      const a = rnd(auditActions)
      await AuditLog.create({ user_id: u._id, action: a.action, details: a.details, ip_address: '127.0.0.1',
        createdAt: new Date(Date.now() - Math.random() * 30 * 86400000) })
    }
  }
  console.log('📝 Audit logs seeded')

  // ── PROJECTS ──────────────────────────────────────────────────────────────
  const CMSG = 'Completed the requirements gathering session with all stakeholders. Documented all functional and non-functional requirements in the project wiki. Held three separate meetings with different department heads to ensure comprehensive coverage. All requirements have been reviewed and signed off by the product owner. The documentation is now available for the entire team to reference throughout the sprint.'
  for (const [tname, leadEmail] of [
    ['Design',         'sarah@creativesolutions.com'],
    ['Development',    'marcus@creativesolutions.com'],
    ['Marketing',      'jessica@creativesolutions.com'],
    ['Client Success', 'david.k@creativesolutions.com'],
  ]) {
    const lead = U[leadEmail]
    const members = created.filter(u => u.role === 'employee' && u.team === tname)
    if (!lead || !members.length) continue
    const mids = members.map(m => m._id)
    await Project.create({
      name: `${tname} Q2 Sprint`,
      description: `Main quarterly sprint for ${tname} team covering all active deliverables.`,
      team_id: T[tname], team_lead_id: lead._id, status: 'active',
      tasks: [
        { title: 'Requirements gathering and stakeholder alignment', description: 'Collect all requirements from stakeholders.', assigned_to: mids, due_date: add(3), priority: 'high',
          completed_by: mids.slice(0, 1).map(uid => ({ user_id: uid, message: CMSG, completed_at: new Date(), verification_status: 'verified', verified_at: new Date() })) },
        { title: 'Design mockups and wireframes', description: 'Create detailed wireframes for all screens.', assigned_to: mids, due_date: add(7), priority: 'high', completed_by: [] },
        { title: 'Core feature development', description: 'Implement all primary features.', assigned_to: mids, due_date: add(12), priority: 'medium', completed_by: [] },
        { title: 'Integration and testing', description: 'Run full integration tests and fix bugs.', assigned_to: mids, due_date: add(16), priority: 'medium', completed_by: [] },
        { title: 'Final review and deployment', description: 'Conduct final review and deploy to production.', assigned_to: mids, due_date: add(20), priority: 'low', completed_by: [] },
      ],
    })
  }
  console.log('🗂  Projects seeded')

  // ── OKRs ──────────────────────────────────────────────────────────────────
  const james  = U['james.wu@creativesolutions.com']
  const sarah  = U['sarah@creativesolutions.com']
  const andre  = U['andre@creativesolutions.com']
  const marcus = U['marcus@creativesolutions.com']
  await OKR.insertMany([
    { owner_id: james._id, manager_id: sarah._id, title: 'Improve Design System Coverage', quarter: 'Q2 2026', status: 'at_risk',
      key_results: [{ title: 'Document 50 reusable components', target: 50, current: 32, unit: 'components' }, { title: 'Achieve 90% design token adoption', target: 90, current: 67, unit: '%' }, { title: 'Reduce design review cycle time', target: 3, current: 5, unit: 'days' }],
      check_ins: [{ author_id: james._id, note: 'Made good progress on component docs this week. Struggling with token adoption due to legacy code.', mood: 'okay', createdAt: new Date() }] },
    { owner_id: sarah._id, manager_id: mgr._id, title: 'Build High-Performing Design Team', quarter: 'Q2 2026', status: 'on_track',
      key_results: [{ title: 'Complete 4 team skill workshops', target: 4, current: 2, unit: 'workshops' }, { title: 'Achieve team NPS score of 8+', target: 8, current: 7.2, unit: 'score' }, { title: 'Zero critical design bugs in production', target: 0, current: 2, unit: 'bugs' }],
      check_ins: [{ author_id: sarah._id, note: 'Team is energized. Second workshop completed last Friday. NPS trending up.', mood: 'great', createdAt: new Date() }] },
    { owner_id: andre._id, manager_id: marcus._id, title: 'Improve API Performance', quarter: 'Q2 2026', status: 'at_risk',
      key_results: [{ title: 'Reduce average API response time to <200ms', target: 200, current: 340, unit: 'ms' }, { title: 'Achieve 99.9% uptime', target: 99.9, current: 99.4, unit: '%' }, { title: 'Write 80% test coverage', target: 80, current: 52, unit: '%' }] },
  ])
  console.log('🎯 OKRs seeded')

  // ── WIKI PAGES ────────────────────────────────────────────────────────────
  const lisa    = U['lisa@creativesolutions.com']
  const jessica = U['jessica@creativesolutions.com']
  const ts = Date.now()
  await WikiPage.insertMany([
    { title: 'Employee Onboarding Guide', slug: `onboarding-${ts}`, category: 'onboarding', is_pinned: true, author_id: lisa._id, tags: ['onboarding','hr','new-hire'],
      content: '# Welcome to Creative Solutions!\n\n## Your First Week\n\n### Day 1\n- Meet your team lead and get your equipment set up\n- Complete HR paperwork in the Happen portal\n- Review company values and culture deck\n\n### Day 2-3\n- Shadow your team lead for project walkthroughs\n- Complete mandatory security training\n\n### Day 4-5\n- Begin your first assigned task\n- Schedule 1-on-1 with your manager\n\n## Key Contacts\n- **HR**: Lisa Wong (lisa@creativesolutions.com)\n- **Manager**: Michael Brown (michael@creativesolutions.com)' },
    { title: 'Leave Policy & Guidelines', slug: `leave-policy-${ts}`, category: 'policy', is_pinned: true, author_id: lisa._id, tags: ['leave','policy','hr'],
      content: '# Leave Policy\n\n## Annual Leave\n- 20 days per year\n- Must be requested **at least 1 week in advance**\n- Auto-denied if team workload >= 80%\n- Denied if you have overdue high-priority tasks\n\n## Sick Leave\n- 10 days per year · Today or tomorrow only · Auto-approved\n\n## Wellness Half-Day\n- 2 per year · Only when all today\'s tasks are complete\n\n## Emergency Leave\n- 3 per year · Instant · Notifies HR and manager · Proof within 24h\n\n## Leave Queue\n- Workload 50-79%: request goes to queue\n- Manager/HR can grant queue leaves (once every 4 hours)' },
    { title: 'Code Review SOP', slug: `code-review-${ts}`, category: 'sop', author_id: marcus._id, tags: ['engineering','sop','code-review'],
      content: '# Code Review SOP\n\n## Before Submitting a PR\n1. Self-review your diff — read every line\n2. Ensure all tests pass locally\n3. Write a clear PR description with context\n\n## Review Checklist\n- [ ] Code is readable and well-commented\n- [ ] No hardcoded secrets or credentials\n- [ ] Error handling is appropriate\n- [ ] Tests cover the new functionality\n\n## Response Time SLA\n- PRs must be reviewed within **24 hours** on business days\n- Critical fixes: **2 hours**' },
    { title: 'Remote Work Guidelines', slug: `remote-work-${ts}`, category: 'policy', author_id: mgr._id, tags: ['remote','policy','wfh'],
      content: '# Remote Work Policy\n\n## Core Hours\nAll team members must be available **10am-3pm** in their local timezone.\n\n## Communication\n- Use Happen Messages for async communication\n- Respond to messages within **2 hours** during core hours\n- Update your status when stepping away\n\n## Meetings\n- Camera on for all team meetings\n- Send agenda 24 hours before any meeting you organize' },
    { title: 'Design System Documentation', slug: `design-system-${ts}`, category: 'sop', author_id: sarah._id, tags: ['design','components','ui'],
      content: '# Happen Design System\n\n## Color Palette\n- **Primary Orange**: #F4631E\n- **Success Green**: #22C55E\n- **Warning Amber**: #F59E0B\n- **Danger Red**: #EF4444\n- **Sidebar Dark**: #1A1A2E\n\n## Typography\n- Font: Inter (400, 500, 600)\n\n## Cards\nUse the `.card` utility class for all card containers.\n\n## Spacing\nUse Tailwind spacing scale. Prefer multiples of 4px.' },
  ])
  console.log('📖 Wiki pages seeded')

  // ── RESOURCES ─────────────────────────────────────────────────────────────
  const now = new Date()
  const hr = (h, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  await Resource.insertMany([
    { name: 'Conference Room A', type: 'room', capacity: 10, location: 'Floor 2, East Wing',
      bookings: [{ booked_by: mgr._id, title: 'Q2 Planning Session', start_time: hr(10), end_time: hr(11, 30), notes: 'Quarterly planning' }] },
    { name: 'Conference Room B', type: 'room', capacity: 6, location: 'Floor 2, West Wing', bookings: [] },
    { name: 'Design Lab', type: 'lab', capacity: 4, location: 'Floor 3, Creative Hub',
      bookings: [{ booked_by: sarah._id, title: 'Design Sprint', start_time: hr(14), end_time: hr(17) }] },
    { name: 'MacBook Pro 16" #1', type: 'equipment', capacity: 1, location: 'IT Storage Room', bookings: [] },
    { name: 'MacBook Pro 16" #2', type: 'equipment', capacity: 1, location: 'IT Storage Room', bookings: [] },
    { name: 'Sony A7 Camera Kit', type: 'equipment', capacity: 1, location: 'Marketing Closet', bookings: [] },
    { name: 'Company Van', type: 'vehicle', capacity: 8, location: 'Parking B2', bookings: [] },
  ])
  console.log('🏢 Resources seeded')

  // ── KUDOS ─────────────────────────────────────────────────────────────────
  await Kudos.insertMany([
    { from_id: sarah._id, to_id: james._id, value: 'excellence', reactions: [{ user_id: mgr._id, emoji: '🔥' }, { user_id: marcus._id, emoji: '👏' }],
      message: 'James absolutely crushed the design system documentation this sprint. His attention to detail and the quality of his component docs has made the whole team more productive. Really appreciate the extra effort and dedication he brought to this task!' },
    { from_id: mgr._id, to_id: sarah._id, value: 'leadership', reactions: [{ user_id: lisa._id, emoji: '❤️' }],
      message: 'Sarah has been an incredible team lead this quarter. She ran two amazing skill workshops and the team morale is at an all-time high. Her leadership style is exactly what we need to keep growing as a company and as a team.' },
    { from_id: marcus._id, to_id: andre._id, value: 'above_beyond', reactions: [{ user_id: james._id, emoji: '🚀' }, { user_id: sarah._id, emoji: '🙌' }],
      message: 'Andre jumped in to help debug a critical production issue at 9pm on a Friday without being asked. That kind of dedication is what makes our team special. He stayed until the issue was fully resolved and documented the fix clearly.' },
    { from_id: lisa._id, to_id: jessica._id, value: 'teamwork',
      message: 'Jessica organized the most seamless onboarding experience for our two new marketing hires. Everything was prepared, documented, and the new team members felt welcomed from day one. Outstanding work on the process documentation.' },
    { from_id: mgr._id, to_id: mgr._id, value: 'excellence', is_announcement: true,
      reactions: [{ user_id: sarah._id, emoji: '🎉' }, { user_id: james._id, emoji: '🎉' }, { user_id: marcus._id, emoji: '🎉' }],
      message: '🎉 We just hit our Q1 revenue target — 112% of goal! This is a team achievement. Every single one of you contributed to this milestone. Celebrating with team lunch on Friday!' },
  ])
  console.log('🏆 Kudos seeded')

  // ── TIME ENTRIES ──────────────────────────────────────────────────────────
  const timeUsers = [james, andre, U['ryan@creativesolutions.com'], sarah, marcus]
  const descs = ['Frontend component development', 'API integration work', 'Code review and feedback', 'Design mockup iterations', 'Team standup and planning', 'Bug fixes and testing', 'Documentation writing', 'Client meeting preparation']
  const projNames = ['Design Q2 Sprint', 'Development Q2 Sprint', 'Marketing Q2 Sprint']
  const timeEntries = []
  for (const u of timeUsers) {
    for (let i = 0; i < 5; i++) {
      timeEntries.push({ user_id: u._id, description: rnd(descs), date: past(i), hours: Math.round((Math.random() * 5 + 3) * 4) / 4, billable: Math.random() > 0.2, project_name: rnd(projNames), approved: i > 1 })
    }
  }
  await TimeEntry.insertMany(timeEntries)
  console.log(`⏱  Time entries: ${timeEntries.length}`)

  // ── DONATIONS ─────────────────────────────────────────────────────────────
  // Direct: Sarah -> James (2 days)
  await User.findByIdAndUpdate(sarah._id, { $inc: { leave_balance_annual: -2 } })
  await User.findByIdAndUpdate(james._id, { $inc: { leave_balance_annual: 2 } })
  await Donation.create({ donor_id: sarah._id, recipient_id: james._id, is_pool: false, days: 2, message: 'Hope this helps with your project deadline!', status: 'delivered' })
  await Notification.create({ user_id: james._id, title: '🎁 Leave Days Received!', message: 'Sarah Chen donated 2 annual leave day(s) to you. Note: "Hope this helps with your project deadline!"', type: 'success', link: '/donation' })
  // Pool: Manager drops 3 days
  await User.findByIdAndUpdate(mgr._id, { $inc: { leave_balance_annual: -3 } })
  await Donation.create({ donor_id: mgr._id, is_pool: true, days: 3, message: 'Sharing some days with the team — use them well!', status: 'pool_available' })
  // Pool: Nadia drops 1 day
  const nadia = U['nadia@creativesolutions.com']
  await User.findByIdAndUpdate(nadia._id, { $inc: { leave_balance_annual: -1 } })
  await Donation.create({ donor_id: nadia._id, is_pool: true, days: 1, message: 'For anyone who needs a day off!', status: 'pool_available' })
  console.log('🎁 Donations seeded')

  // ── WELCOME NOTIFICATIONS ─────────────────────────────────────────────────
  await Notification.insertMany(created.map(u => ({
    user_id: u._id, title: 'Welcome to Happen!',
    message: `Hi ${u.fn}, your account is ready. Explore your dashboard.`, type: 'info',
  })))
  console.log('🔔 Welcome notifications sent')

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const counts = {
    Teams:         await Team.countDocuments(),
    Users:         await User.countDocuments(),
    LeaveRequests: await LeaveRequest.countDocuments(),
    Notifications: await Notification.countDocuments(),
    AuditLogs:     await AuditLog.countDocuments(),
    Projects:      await Project.countDocuments(),
    OKRs:          await OKR.countDocuments(),
    WikiPages:     await WikiPage.countDocuments(),
    Resources:     await Resource.countDocuments(),
    Kudos:         await Kudos.countDocuments(),
    TimeEntries:   await TimeEntry.countDocuments(),
    Donations:     await Donation.countDocuments(),
  }
  console.log('\n✅ SEEDING COMPLETE')
  console.table(counts)
  await mongoose.disconnect()
}

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1) })
