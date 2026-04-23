// backend-node/middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function requireAuth(req, res, next) {
  // 1. Try Authorization header first
  const header = req.headers.authorization;
  let token = null;

  if (header && header.startsWith("Bearer ")) {
    token = header.slice(7);
  }

  // 2. Fallback: token from query string (?token=...)
  //    Needed for direct-URL exports (browser can't send headers)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = { requireAuth };

