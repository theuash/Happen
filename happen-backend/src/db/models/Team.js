import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
  name:                  { type: String, required: true },
  workload_current:      { type: Number, default: 0 },
  workload_threshold_high: { type: Number, default: 80 },
  team_lead_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

export default mongoose.model('Team', teamSchema)
