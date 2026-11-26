const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");

const roleMapIn = r => ({ admin: "admin", user: "user", owner: "store_owner", store_owner: "store_owner" }[r] || "user");
const roleMapOut = r => ({ admin: "admin", user: "user", store_owner: "owner" }[r] || "user");

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, ver: user.token_version || 0 }, JWT_SECRET, { expiresIn: "2h", algorithm: 'HS256', issuer: 'store-rating', audience: 'store-rating-web' });
}

module.exports = { roleMapIn, roleMapOut, signToken };
