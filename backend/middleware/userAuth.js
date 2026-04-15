// Simple header-based identity for hackathon prototype.
// Frontend sends x-user-id and x-user-role with every request.
function userAuth(req, res, next) {
  const userId = req.headers['x-user-id']
  const userRole = req.headers['x-user-role']
  if (!userId || !userRole) {
    return res.status(401).json({ message: 'Not authenticated.' })
  }
  req.userId = userId
  req.userRole = userRole
  next()
}

module.exports = userAuth
