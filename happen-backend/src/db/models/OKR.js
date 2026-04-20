import mongoose from 'mongoose'

const keyResultSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  target:   { type: Number, default: 100 },   // target value
  current:  { type: Number, default: 0 },     // current progress
  unit:     { type: String, default: '%' },   // %, count, $, etc.
  done:     { type: Boolean, default: false },
})

const checkInSchema = new mongoose.Schema({
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:      { type: String, required: true },
  mood:      { type: String, enum: ['great','good','okay','struggling'], default: 'good' },
}, { timestamps: true })

const okrSchema = new mongoose.Schema({
  owner_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:      { type: String, required: true },
  quarter:    { type: String, required: true },  // e.g. "Q2 2026"
  key_results:[keyResultSchema],
  check_ins:  [checkInSchema],
  status:     { type: String, enum: ['on_track','at_risk','off_track','completed'], default: 'on_track' },
}, { timestamps: true })

export default mongoose.model('OKR', okrSchema)
