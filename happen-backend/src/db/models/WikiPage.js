import mongoose from 'mongoose'

const wikiPageSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  slug:       { type: String, required: true, unique: true },
  content:    { type: String, default: '' },
  category:   { type: String, enum: ['sop','onboarding','policy','general'], default: 'general' },
  author_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_pinned:  { type: Boolean, default: false },
  tags:       [{ type: String }],
}, { timestamps: true })

export default mongoose.model('WikiPage', wikiPageSchema)
