import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema({
  booked_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, required: true },
  start_time: { type: Date, required: true },
  end_time:   { type: Date, required: true },
  notes:      { type: String, default: '' },
}, { timestamps: true })

const resourceSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  type:     { type: String, enum: ['room','equipment','lab','vehicle','other'], default: 'room' },
  capacity: { type: Number, default: 1 },
  location: { type: String, default: '' },
  bookings: [bookingSchema],
  is_active:{ type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('Resource', resourceSchema)
