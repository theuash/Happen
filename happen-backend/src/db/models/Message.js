import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversation_id: { type: String, required: true, index: true }, // sorted pair: "userId1_userId2"
  sender_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:        { type: String, required: true },
  is_read:     { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('Message', messageSchema)
