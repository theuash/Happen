import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import User from './models/User.js'
import OKR from './models/OKR.js'
import WikiPage from './models/WikiPage.js'
import Resource from './models/Resource.js'
import Kudos from './models/Kudos.js'
import TimeEntry from './models/TimeEntry.js'

const today = new Date()
const fmt = (d) => d.toISOString().split('T')[0]
const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate()+n); return fmt(d) }

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected')
  await Promise.all([OKR.deleteMany({}), WikiPage.deleteMany({}), Resource.deleteMany({}), Kudos.deleteMany({}), TimeEntry.deleteMany({})])

  const get = (email) => User.findOne({ email }).lean()
  const manager = await get('michael@creativesolutions.com')
  const sarah   = await get('sarah@creativesolutions.com')
  const james   = await get('james.wu@creativesolutions.com')
  const lisa    = await get('lisa@creativesolutions.com')
  const marcus  = await get('marcus@creativesolutions.com')
  const andre   = await get('andre@creativesolutions.com')
  const jessica = await get('jessica@creativesolutions.com')
  const ryan    = await get('ryan@creativesolutions.com')

  // ── OKRs ──────────────────────────────────────────────────────────────────
  await OKR.create([
    {
      owner_id: james._id, manager_id: sarah._id,
      title: 'Improve Design System Coverage', quarter: 'Q2 2026',
      key_results: [
        { title: 'Document 50 reusable components', target: 50, current: 32, unit: 'components' },
        { title: 'Achieve 90% design token adoption', target: 90, current: 67, unit: '%' },
        { title: 'Reduce design review cycle time', target: 3, current: 5, unit: 'days' },
      ],
      status: 'at_risk',
      check_ins: [{ author_id: james._id, note: 'Made good progress on component docs this week. Struggling with token adoption due to legacy code.', mood: 'okay' }],
    },
    {
      owner_id: sarah._id, manager_id: manager._id,
      title: 'Build High-Performing Design Team', quarter: 'Q2 2026',
      key_results: [
        { title: 'Complete 4 team skill workshops', target: 4, current: 2, unit: 'workshops' },
        { title: 'Achieve team NPS score of 8+', target: 8, current: 7.2, unit: 'score' },
        { title: 'Zero critical design bugs in production', target: 0, current: 2, unit: 'bugs' },
      ],
      status: 'on_track',
      check_ins: [{ author_id: sarah._id, note: 'Team is energized. Second workshop completed last Friday. NPS trending up.', mood: 'great' }],
    },
    {
      owner_id: andre._id, manager_id: marcus._id,
      title: 'Improve API Performance', quarter: 'Q2 2026',
      key_results: [
        { title: 'Reduce average API response time to <200ms', target: 200, current: 340, unit: 'ms' },
        { title: 'Achieve 99.9% uptime', target: 99.9, current: 99.4, unit: '%' },
        { title: 'Write 80% test coverage', target: 80, current: 52, unit: '%' },
      ],
      status: 'at_risk',
    },
  ])
  console.log('OKRs seeded')

  // ── Wiki Pages ─────────────────────────────────────────────────────────────
  await WikiPage.create([
    { title: 'Employee Onboarding Guide', slug: 'employee-onboarding-guide', category: 'onboarding', is_pinned: true, author_id: lisa._id, tags: ['onboarding','hr','new-hire'],
      content: `# Welcome to Creative Solutions!\n\n## Your First Week\n\n### Day 1\n- Meet your team lead and get your equipment set up\n- Complete HR paperwork in the Happen portal\n- Review company values and culture deck\n- Set up all required software tools\n\n### Day 2-3\n- Shadow your team lead for project walkthroughs\n- Complete mandatory security training\n- Set up your development environment\n\n### Day 4-5\n- Begin your first assigned task\n- Schedule 1-on-1 with your manager\n- Join team standup meetings\n\n## Key Contacts\n- **HR**: Lisa Wong (lisa@creativesolutions.com)\n- **IT Support**: admin@happen.com\n- **Your Manager**: Michael Brown\n\n## Important Links\n- Leave requests: Use the Happen app\n- Time tracking: Happen > Timesheets\n- Company policies: This wiki!` },
    { title: 'Leave Policy & Guidelines', slug: 'leave-policy-guidelines', category: 'policy', is_pinned: true, author_id: lisa._id, tags: ['leave','policy','hr'],
      content: `# Leave Policy\n\n## Annual Leave\n- 20 days per year\n- Must be requested **at least 1 week in advance**\n- Subject to team workload (auto-denied if workload ≥ 80%)\n- Employees with overdue high-priority tasks cannot take annual leave\n\n## Sick Leave\n- 10 days per year\n- Can be taken for today or tomorrow only\n- Auto-approved — no manager approval needed\n\n## Wellness Half-Day\n- 2 per year\n- Only available when all today's tasks are completed\n- Select AM or PM\n\n## Emergency Leave\n- 3 per year\n- Instant — no dates required\n- Proof required within 24 hours\n- Notifies HR and manager immediately\n\n## Leave Queue\n- When team workload is 50-79%, annual leave goes into a queue\n- Manager/HR can grant queue leaves (once every 4 hours)\n- Queue is FIFO — first submitted, first approved` },
    { title: 'Code Review SOP', slug: 'code-review-sop', category: 'sop', author_id: marcus._id, tags: ['engineering','sop','code-review'],
      content: `# Code Review Standard Operating Procedure\n\n## Before Submitting a PR\n1. Self-review your diff — read every line\n2. Ensure all tests pass locally\n3. Write a clear PR description with context\n4. Link to the relevant task in the Projects board\n\n## Review Checklist\n- [ ] Code is readable and well-commented\n- [ ] No hardcoded secrets or credentials\n- [ ] Error handling is appropriate\n- [ ] Performance implications considered\n- [ ] Tests cover the new functionality\n\n## Response Time SLA\n- PRs must be reviewed within **24 hours** on business days\n- Critical fixes: **2 hours**\n\n## Approval Requirements\n- 1 approval for minor changes\n- 2 approvals for architecture changes\n- Team lead must approve all production deployments` },
    { title: 'Remote Work Guidelines', slug: 'remote-work-guidelines', category: 'policy', author_id: manager._id, tags: ['remote','policy','wfh'],
      content: `# Remote Work Policy\n\n## Core Hours\nAll team members must be available **10am–3pm** in their local timezone for meetings and collaboration.\n\n## Communication\n- Use Happen Messages for async communication\n- Respond to messages within **2 hours** during core hours\n- Update your status when stepping away\n\n## Meetings\n- Camera on for all team meetings\n- Use the Resource Scheduler to book virtual meeting rooms\n- Send agenda 24 hours before any meeting you organize\n\n## Equipment\n- Company equipment must be returned if you leave\n- Report any equipment issues to admin@happen.com\n- Home office stipend: $500/year (submit receipts to accounting)` },
    { title: 'Design System Documentation', slug: 'design-system-docs', category: 'sop', author_id: sarah._id, tags: ['design','components','ui'],
      content: `# Happen Design System\n\n## Color Palette\n- **Primary Orange**: #F4631E\n- **Success Green**: #22C55E\n- **Warning Amber**: #F59E0B\n- **Danger Red**: #EF4444\n- **Sidebar Dark**: #1A1A2E\n\n## Typography\n- Font: Inter (400, 500, 600)\n- Headings: font-bold\n- Body: text-sm or text-base\n\n## Component Library\nAll UI components are in \`frontend/src/components/ui/\`\n\n## Spacing\nUse Tailwind spacing scale. Prefer multiples of 4px.\n\n## Cards\nUse the \`.card\` utility class for all card containers.` },
  ])
  console.log('Wiki pages seeded')

  // ── Resources ──────────────────────────────────────────────────────────────
  const resources = await Resource.create([
    { name: 'Conference Room A', type: 'room', capacity: 10, location: 'Floor 2, East Wing',
      bookings: [{ booked_by: manager._id, title: 'Q2 Planning Session', start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0), end_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30), notes: 'Quarterly planning' }] },
    { name: 'Conference Room B', type: 'room', capacity: 6, location: 'Floor 2, West Wing', bookings: [] },
    { name: 'Design Lab', type: 'lab', capacity: 4, location: 'Floor 3, Creative Hub',
      bookings: [{ booked_by: sarah._id, title: 'Design Sprint', start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), end_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0) }] },
    { name: 'MacBook Pro 16" #1', type: 'equipment', capacity: 1, location: 'IT Storage Room', bookings: [] },
    { name: 'MacBook Pro 16" #2', type: 'equipment', capacity: 1, location: 'IT Storage Room', bookings: [] },
    { name: 'Sony A7 Camera Kit', type: 'equipment', capacity: 1, location: 'Marketing Closet', bookings: [] },
    { name: 'Company Van', type: 'vehicle', capacity: 8, location: 'Parking B2', bookings: [] },
  ])
  console.log('Resources seeded')

  // ── Kudos ──────────────────────────────────────────────────────────────────
  await Kudos.create([
    { from_id: sarah._id, to_id: james._id, message: 'James absolutely crushed the design system documentation this sprint. His attention to detail and the quality of his component docs has made the whole team more productive. Really appreciate the extra effort!', value: 'excellence', reactions: [{ user_id: manager._id, emoji: '🔥' }, { user_id: marcus._id, emoji: '👏' }] },
    { from_id: manager._id, to_id: sarah._id, message: 'Sarah has been an incredible team lead this quarter. She ran two amazing skill workshops and the team morale is at an all-time high. Her leadership style is exactly what we need.', value: 'leadership', reactions: [{ user_id: lisa._id, emoji: '❤️' }] },
    { from_id: marcus._id, to_id: andre._id, message: 'Andre jumped in to help debug a critical production issue at 9pm on a Friday without being asked. That kind of dedication is what makes our team special. Above and beyond!', value: 'above_beyond', reactions: [{ user_id: james._id, emoji: '🚀' }, { user_id: sarah._id, emoji: '🙌' }] },
    { from_id: lisa._id, to_id: jessica._id, message: 'Jessica organized the most seamless onboarding experience for our two new marketing hires. Everything was prepared, documented, and the new team members felt welcomed from day one.', value: 'teamwork' },
    { from_id: manager._id, to_id: manager._id, message: '🎉 We just hit our Q1 revenue target — 112% of goal! This is a team achievement. Every single one of you contributed to this milestone. Celebrating with team lunch on Friday!', value: 'excellence', is_announcement: true, reactions: [{ user_id: sarah._id, emoji: '🎉' }, { user_id: james._id, emoji: '🎉' }, { user_id: marcus._id, emoji: '🎉' }] },
  ])
  console.log('Kudos seeded')

  // ── Time Entries ───────────────────────────────────────────────────────────
  const entries = []
  const users = [james, andre, ryan, sarah, marcus]
  const descriptions = ['Frontend component development', 'API integration work', 'Code review and feedback', 'Design mockup iterations', 'Team standup and planning', 'Bug fixes and testing', 'Documentation writing', 'Client meeting preparation']
  for (const u of users) {
    for (let i = 0; i < 5; i++) {
      entries.push({ user_id: u._id, description: descriptions[Math.floor(Math.random()*descriptions.length)], date: addDays(-i), hours: Math.round((Math.random()*5+3)*4)/4, billable: Math.random() > 0.2, project_name: ['Design Q2 Sprint','Development Q2 Sprint','Marketing Q2 Sprint'][Math.floor(Math.random()*3)], approved: i > 1 })
    }
  }
  await TimeEntry.insertMany(entries)
  console.log('Time entries seeded')

  const counts = { okrs: await OKR.countDocuments(), wiki: await WikiPage.countDocuments(), resources: await Resource.countDocuments(), kudos: await Kudos.countDocuments(), timeEntries: await TimeEntry.countDocuments() }
  console.log('✅ Features seeded:', counts)
  await mongoose.disconnect()
}

seed().catch(e => { console.error(e); process.exit(1) })
