const bcrypt = require("bcryptjs");
const { pool } = require("../utils/db");
const { STORE_TABLE } = require("../utils/config");
const { roleMapIn, roleMapOut } = require("../utils/auth");

async function stats(req, res) {
  try {
    const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[{ totalStores }]] = await pool.query(`SELECT COUNT(*) AS totalStores FROM \`${STORE_TABLE}\``);
    const [[{ totalRatings }]] = await pool.query("SELECT COUNT(*) AS totalRatings FROM ratings");
    return res.json({ totalUsers, totalStores, totalRatings });
  } catch {
    return res.status(500).json({ message: "failed to load stats" });
  }
}

async function listUsers(req, res) {
  try {
    const { q = "", role = "" } = req.query || {};
    const params = [];
    const where = [];

    if (role && ["user", "admin", "store_owner"].includes(role)) {
      where.push("u.role = ?");
      params.push(role);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      where.push("(u.name LIKE ? OR u.email LIKE ? OR u.address LIKE ? OR u.role LIKE ?)");
      params.push(like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        u.id, u.name, u.email, u.address, u.role, u.created_at,
        CASE
          WHEN u.role = 'store_owner' THEN (
            SELECT ROUND(COALESCE(AVG(r.rating), 0), 1)
            FROM ratings r
            JOIN \`${STORE_TABLE}\` s ON s.id = r.store_id
            WHERE s.owner_id = u.id
          )
          ELSE NULL
        END AS ownerRating
      FROM users u
      ${whereSql}
      ORDER BY u.created_at DESC
    `;
    const [rows] = await pool.query(sql, params);
    return res.json(rows.map(r => ({ ...r, role: roleMapOut(r.role) })));
  } catch {
    return res.status(500).json({ message: "failed to load users" });
  }
}

async function getUser(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: "invalid user id" });

    const [[user]] = await pool.query("SELECT id, name, email, address, role, created_at FROM users WHERE id = ?", [userId]);
    if (!user) return res.status(404).json({ message: "user not found" });

    let ownerRating = null;
    if (user.role === "store_owner") {
      const [[o]] = await pool.query(
        `SELECT ROUND(COALESCE(AVG(r.rating), 0), 1) AS ownerRating
         FROM ratings r
         JOIN \`${STORE_TABLE}\` s ON s.id = r.store_id
         WHERE s.owner_id = ?`,
        [user.id]
      );
      ownerRating = Number(o?.ownerRating ?? 0);
    }
    return res.json({ ...user, role: roleMapOut(user.role), ownerRating });
  } catch {
    return res.status(500).json({ message: "failed to load user" });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, address = "", role = "user" } = req.body || {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
    const pwdOk = typeof password === "string" && password.length >= 6 && password.length <= 64;
    const nameOk = typeof name === "string" && name.trim().length >= 3 && name.trim().length <= 60;
    const allowed = new Set(["user", "admin", "store_owner"]);
    if (!emailOk || !pwdOk || !nameOk || !allowed.has(role)) {
      return res.status(400).json({ message: "invalid input" });
    }

    const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(409).json({ message: "email already in use" });

    const hash = await bcrypt.hash(password, 10);
    const dbRole = roleMapIn(role);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), email.trim(), hash, address?.trim() || "", dbRole]
    );

    return res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      email: email.trim(),
      address: address?.trim() || "",
      role
    });
  } catch {
    return res.status(500).json({ message: "failed to create user" });
  }
}

async function listStores(req, res) {
  try {
    const { q = "" } = req.query || {};
    const params = [];
    let where = "";
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      where = "WHERE s.name LIKE ? OR s.email LIKE ? OR s.address LIKE ?";
      params.push(like, like, like);
    }
    const sql = `
      SELECT
        s.id, s.name, s.email, s.address, s.image_url, s.owner_id,
        ROUND(COALESCE(AVG(r.rating), 0), 1) AS avgRating,
        COUNT(r.id) AS ratingsCount
      FROM \`${STORE_TABLE}\` s
      LEFT JOIN ratings r ON r.store_id = s.id
      ${where}
      GROUP BY s.id, s.name, s.email, s.address, s.image_url, s.owner_id
      ORDER BY s.created_at DESC
    `;
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "failed to load stores" });
  }
}

async function createStore(req, res) {
  try {
    const { name, email = "", address = "", owner_id = null, image_url = "" } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ message: "store name required" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "invalid email" });

    let ownerIdToSet = null;
    if (owner_id != null) {
      const ownerIdNum = Number(owner_id);
      if (!Number.isInteger(ownerIdNum) || ownerIdNum <= 0) return res.status(400).json({ message: "invalid owner_id" });
      const [[owner]] = await pool.query("SELECT id, role FROM users WHERE id = ?", [ownerIdNum]);
      if (!owner) return res.status(404).json({ message: "owner user not found" });
      if (owner.role !== "store_owner") return res.status(400).json({ message: "owner_id must be a store_owner" });
      ownerIdToSet = ownerIdNum;
    }

    const [result] = await pool.query(
      `INSERT INTO \`${STORE_TABLE}\` (name, email, address, owner_id, image_url)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), email.trim(), address.trim(), ownerIdToSet, image_url.trim()]
    );

    return res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      email: email.trim(),
      address: address.trim(),
      owner_id: ownerIdToSet,
      image_url: image_url.trim(),
      avgRating: 0.0,
      ratingsCount: 0
    });
  } catch {
    return res.status(500).json({ message: "failed to create store" });
  }
}

module.exports = { stats, listUsers, getUser, createUser, listStores, createStore };