const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/config");

function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const [, token] = hdr.split(" ");
  if (!token) return res.status(401).json({ message: "unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "invalid token" });
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