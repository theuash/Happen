import mongoose from 'mongoose'

const donationSchema = new mongoose.Schema({
  donor_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Direct donation to a specific person
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Drop into the pool (anyone can claim FCFS)
  is_pool:      { type: Boolean, default: false },
  days:         { type: Number, required: true, min: 1 },
  message:      { type: String, default: '' },
  // Pool claim tracking
  claimed_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  claimed_at:   { type: Date, default: null },
  // Status
  status: {
    type: String,
    enum: ['pending', 'delivered', 'pool_available', 'pool_claimed'],
    default: 'pending',
  },
}, { timestamps: true })

export default mongoose.model('Donation', donationSchema)
