import mongoose from 'mongoose'

const completionSchema = new mongoose.Schema({
  user_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:      { type: String, required: true },   // min 50 words
  completed_at: { type: Date, default: Date.now },
  // Verification workflow
  verification_status: {
    type: String,
    enum: ['pending_review', 'verified', 'sent_back', 'auto_archived'],
    default: 'pending_review',
  },
  verified_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verified_at:   { type: Date, default: null },
  feedback:      { type: String, default: null },  // team lead feedback on send_back
  resubmit_count:{ type: Number, default: 0 },     // how many times sent back
}, { timestamps: true })

const taskSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  assigned_to:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completed_by: [completionSchema],
  due_date:     { type: String, default: null },
  priority:     { type: String, enum: ['low','medium','high'], default: 'medium' },
}, { timestamps: true })

const projectSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  team_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  team_lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tasks:        [taskSchema],
  status:       { type: String, enum: ['active','completed','paused'], default: 'active' },
}, { timestamps: true })

export default mongoose.model('Project', projectSchema)
