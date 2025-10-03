const bcrypt = require("bcryptjs");
const { pool } = require("../utils/db");
const { roleMapIn, roleMapOut, signToken } = require("../utils/auth");

async function signup(req, res) {
  try {
    const { name, email, password, address = "", role = "user" } = req.body || {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
    const pwdOk = /^(?=.*[A-Z])(?=.*[^\w\s]).{8,16}$/.test(password || "");
    const nameOk = typeof name === "string" && name.trim().length >= 3 && name.trim().length <= 60;
    if (!emailOk || !pwdOk || !nameOk) return res.status(400).json({ message: "invalid input" });

    const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(409).json({ message: "email already in use" });

    const hash = await bcrypt.hash(password, 10);
    const dbRole = roleMapIn(role);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), email.trim(), hash, address?.trim() || "", dbRole]
    );
    const user = { id: result.insertId, name: name.trim(), email: email.trim(), address: address?.trim() || "", role: dbRole };
    const token = signToken(user);
    return res.status(201).json({ user: { ...user, role: roleMapOut(user.role) }, token });
  } catch {
    return res.status(500).json({ message: "signup failed" });
  }
}

async function login(req, res) {
  try {
    const { email, password, role } = req.body || {};
    const [rows] = await pool.query(
      "SELECT id, name, email, password, address, role, created_at FROM users WHERE email = ?",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: "invalid credentials" });
    const ok = await bcrypt.compare(password || "", user.password);
    if (!ok) return res.status(401).json({ message: "invalid credentials" });
    if (role && roleMapIn(role) !== user.role) return res.status(403).json({ message: "role mismatch" });

    const safeUser = { id: user.id, name: user.name, email: user.email, address: user.address, role: user.role, created_at: user.created_at };
    const token = signToken(safeUser);
    return res.json({ user: { ...safeUser, role: roleMapOut(safeUser.role) }, token });
  } catch {
    return res.status(500).json({ message: "login failed" });
  }
}

async function logout(req, res) {
  try {
    return res.json({ message: "logged out" });
  } catch {
    return res.status(500).json({ message: "logout failed" });
  }
}

async function me(req, res) {
  try {
    const [[user]] = await pool.query(
      "SELECT id, name, email, address, role, created_at FROM users WHERE id = ?",
      [req.user.sub]
    );
    if (!user) return res.status(404).json({ message: "not found" });
    return res.json({ user: { ...user, role: roleMapOut(user.role) } });
  } catch {
    return res.status(500).json({ message: "failed" });
  }
}

module.exports = { signup, login, logout, me };