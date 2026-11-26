const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/config");
const { pool } = require('../utils/db');

async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = /^Bearer ([^ ]+)$/i.exec(hdr)?.[1];
  if (!token) return res.status(401).json({ message: "unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: 'store-rating', audience: 'store-rating-web' });
    if (!Number.isSafeInteger(payload.sub) || !['user', 'admin', 'store_owner'].includes(payload.role)) return res.status(401).json({ message: 'invalid token' });
    const [[user]] = await pool.query('SELECT id, role, token_version FROM users WHERE id = ?', [payload.sub]);
    if (!user || user.role !== payload.role || user.token_version !== payload.ver) return res.status(401).json({ message: 'session expired' });
    req.user = { sub: user.id, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') return res.status(401).json({ message: 'invalid or expired token' });
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };
