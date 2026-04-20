import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:     { type: String, required: true },
  details:    { type: String },
  ip_address: { type: String },
}, { timestamps: true })

export default mongoose.model('AuditLog', auditLogSchema)
