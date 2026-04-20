import mongoose from 'mongoose'

const meetingSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendee_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  start_time:   { type: Date, required: true },
  end_time:     { type: Date, required: true },
  link:         { type: String, default: '' }, // video call link
  status:       { type: String, enum: ['scheduled', 'ongoing', 'done', 'cancelled'], default: 'scheduled' },
}, { timestamps: true })

export default mongoose.model('Meeting', meetingSchema)
