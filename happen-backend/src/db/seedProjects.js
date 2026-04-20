import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import Team from './models/Team.js'
import User from './models/User.js'
import Project from './models/Project.js'

const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }

const COMPLETION_MSG = 'Completed the requirements gathering session with all stakeholders. Documented all functional and non-functional requirements in the project wiki. Held three separate meetings with different department heads to ensure comprehensive coverage. All requirements have been reviewed and signed off by the product owner. The documentation is now available for the entire team to reference throughout the sprint.'

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected')

  await Project.deleteMany({})

  const teamNames = ['Design', 'Development', 'Marketing', 'Client Success']
  const teams = await Team.find({ name: { $in: teamNames } }).lean()

  for (const team of teams) {
    const lead = await User.findOne({ team_id: team._id, role: 'team_lead' }).lean()
    const members = await User.find({ team_id: team._id, role: 'employee' }, '_id').lean()
    const mids = members.map(m => m._id)
    if (!lead || !mids.length) { console.log('Skipping', team.name); continue }

    await Project.create({
      name: `${team.name} Q2 Sprint`,
      description: `Main quarterly sprint for ${team.name} team covering all active deliverables and milestones.`,
      team_id: team._id,
      team_lead_id: lead._id,
      status: 'active',
      tasks: [
        {
          title: 'Requirements gathering and stakeholder alignment',
          description: 'Collect all requirements from stakeholders and document them clearly in the project wiki.',
          assigned_to: mids,
          due_date: addDays(3),
          priority: 'high',
          completed_by: mids.slice(0, 1).map(uid => ({
            user_id: uid,
            message: COMPLETION_MSG,
            completed_at: new Date(),
          })),
        },
        {
          title: 'Design mockups and wireframes',
          description: 'Create detailed wireframes for all screens and get approval from stakeholders.',
          assigned_to: mids,
          due_date: addDays(7),
          priority: 'high',
          completed_by: [],
        },
        {
          title: 'Core feature development',
          description: 'Implement all primary features as defined in the approved requirements document.',
          assigned_to: mids,
          due_date: addDays(12),
          priority: 'medium',
          completed_by: [],
        },
        {
          title: 'Integration and testing',
          description: 'Run full integration tests and fix all critical and high-priority bugs.',
          assigned_to: mids,
          due_date: addDays(16),
          priority: 'medium',
          completed_by: [],
        },
        {
          title: 'Final review and deployment',
          description: 'Conduct final code review, update documentation, and deploy to production.',
          assigned_to: mids,
          due_date: addDays(20),
          priority: 'low',
          completed_by: [],
        },
      ],
    })
    console.log('Created project for', team.name)
  }

  const count = await Project.countDocuments()
  console.log(`✅ Seeded ${count} projects`)
  await mongoose.disconnect()
}

seed().catch(e => { console.error(e); process.exit(1) })
