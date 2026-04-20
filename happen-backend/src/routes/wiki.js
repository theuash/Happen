import express from 'express'
import WikiPage from '../db/models/WikiPage.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()

router.get('/', verifyToken, async (req, res) => {
  try {
    const { q, category } = req.query
    const filter = {}
    if (category) filter.category = category
    if (q) filter.$or = [{ title: { $regex: q, $options: 'i' } }, { content: { $regex: q, $options: 'i' } }, { tags: { $in: [new RegExp(q, 'i')] } }]
    const pages = await WikiPage.find(filter).populate('author_id','first_name last_name').sort({ is_pinned: -1, updatedAt: -1 }).lean()
    res.json(pages.map(p => ({ ...p, id: p._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const page = await WikiPage.findById(req.params.id).populate('author_id','first_name last_name').lean()
    if (!page) return res.status(404).json({ error: 'Not found' })
    res.json({ ...page, id: page._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/', verifyToken, requireRole('manager','hr','admin','team_lead'), async (req, res) => {
  try {
    const { title, content, category, tags, is_pinned } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'title required' })
    const page = await WikiPage.create({ title: title.trim(), slug: slugify(title), content: content || '', category: category || 'general', author_id: req.user.id, tags: tags || [], is_pinned: is_pinned || false })
    res.json({ ...page.toObject(), id: page._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.patch('/:id', verifyToken, requireRole('manager','hr','admin','team_lead'), async (req, res) => {
  try {
    const page = await WikiPage.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true }).lean()
    if (!page) return res.status(404).json({ error: 'Not found' })
    res.json({ ...page, id: page._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id', verifyToken, requireRole('manager','hr','admin'), async (req, res) => {
  try {
    await WikiPage.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router
