import mongoose from 'mongoose'

const leaveRequestSchema = new mongoose.Schema({
  user_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Annual: scheduled date (min 1 week ahead), Sick: today/tomorrow, Wellness: half-day, Emergency: no date
  start_date:       { type: String },   // YYYY-MM-DD, null for emergency
  end_date:         { type: String },   // YYYY-MM-DD, null for emergency
  days_count:       { type: Number, default: 1 },
  type:             { type: String, enum: ['annual','sick','wellness','emergency'], required: true },
  half_day:         { type: Boolean, default: false },
  am_pm:            { type: String, enum: ['AM','PM'], default: 'AM' },
  reason:           { type: String, default: null },
  status:           { type: String, enum: ['pending','approved','denied','queued','emergency'], default: 'pending' },
  queue_position:   { type: Number, default: null },
  priority_score:   { type: Number, default: 0 },
  proof_submitted:  { type: Boolean, default: false },
  proof_verified:   { type: Boolean, default: false },
  proof_url:        { type: String, default: null },
  proof_deadline:   { type: Date, default: null },
  manager_override: { type: Boolean, default: false },
  override_reason:  { type: String, default: null },
  override_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decision_date:    { type: Date, default: null },
  notified_hr:      { type: Boolean, default: false },
  notified_manager: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('LeaveRequest', leaveRequestSchema)
