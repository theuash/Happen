import jwt from 'jsonwebtoken'

export const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' })
  }
  try {
    const token = auth.split(' ')[1]
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
