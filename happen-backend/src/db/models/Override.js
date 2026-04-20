import mongoose from 'mongoose'

const overrideSchema = new mongoose.Schema({
  manager_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  request_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest', required: true },
  decision:            { type: String, enum: ['approved','denied'], required: true },
  reason:              { type: String, required: true },
  visible_to_employee: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('Override', overrideSchema)
