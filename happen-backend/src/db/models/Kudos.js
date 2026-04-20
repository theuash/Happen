import mongoose from 'mongoose'

const kudosSchema = new mongoose.Schema({
  from_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:   { type: String, required: true },
  value:     { type: String, enum: ['teamwork','innovation','leadership','helpfulness','excellence','above_beyond'], default: 'excellence' },
  reactions: [{ user_id: mongoose.Schema.Types.ObjectId, emoji: String }],
  is_announcement: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('Kudos', kudosSchema)
