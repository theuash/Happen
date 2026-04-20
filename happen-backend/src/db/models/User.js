import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  email:                { type: String, required: true, unique: true, lowercase: true },
  password_hash:        { type: String, required: true },
  password_plain:       { type: String },
  first_name:           { type: String, required: true },
  last_name:            { type: String, required: true },
  role:                 { type: String, enum: ['admin','manager','hr','team_lead','accounting','employee'], required: true },
  team_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  avatar:               { type: String, default: '' },
  hire_date:            { type: Date, default: Date.now },
  leave_balance_annual: { type: Number, default: 20 },
  leave_balance_sick:   { type: Number, default: 10 },
  wellness_days_used:   { type: Number, default: 0 },
  emergency_leaves_used:{ type: Number, default: 0 },
  last_login:           { type: Date, default: null },
  is_active:            { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
