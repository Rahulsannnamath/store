const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");

const roleMapIn = r => ({ admin: "admin", user: "user", owner: "store_owner", store_owner: "store_owner" }[r] || "user");
const roleMapOut = r => ({ admin: "admin", user: "user", store_owner: "owner" }[r] || "user");

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

function getUserIdFromReq(req) {
  const hdr = req.headers.authorization || "";
  const [, token] = hdr.split(" ");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.sub;
  } catch {
    return null;
  }
}

module.exports = { roleMapIn, roleMapOut, signToken, getUserIdFromReq };