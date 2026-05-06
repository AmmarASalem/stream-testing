function userAuth(req, res, next) {
  const rawId = req.headers['x-user-id']
  const userRole = req.headers['x-user-role']
  const userId = parseInt(rawId, 10)
  if (!rawId || !userRole || isNaN(userId)) {
    return res.status(401).json({ message: 'Not authenticated.' })
  }
  req.userId = userId
  req.userRole = userRole
  next()
}

module.exports = userAuth
