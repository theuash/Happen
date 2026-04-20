import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     { type: String, enum: ['info','success','warning','error'], default: 'info' },
  is_read:  { type: Boolean, default: false },
  link:     { type: String, default: null }, // frontend route to navigate to on click
  ref_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // employee this notif is about
}, { timestamps: true })

export default mongoose.model('Notification', notificationSchema)
