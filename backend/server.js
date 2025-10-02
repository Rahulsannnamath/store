const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server is up");
});

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const STORE_TABLE = process.env.STORE_TABLE || "storedata"; // set STORE_TABLE=stores in .env if your table is 'stores'
const roleMapIn = r => ({ admin: "admin", user: "user", owner: "store_owner", store_owner: "store_owner" }[r] || "user");
const roleMapOut = r => ({ admin: "admin", user: "user", store_owner: "owner" }[r] || "user");

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
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

// Auth routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const db = app.locals.db || pool;
    const { name, email, password, address = "", role = "user" } = req.body || {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
    const pwdOk = /^(?=.*[A-Z])(?=.*[^\w\s]).{8,16}$/.test(password || "");
    const nameOk = typeof name === "string" && name.trim().length >= 3 && name.trim().length <= 60;
    if (!emailOk || !pwdOk || !nameOk) return res.status(400).json({ message: "invalid input" });

    const [exists] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(409).json({ message: "email already in use" });

    const hash = await bcrypt.hash(password, 10);
    const dbRole = roleMapIn(role);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), email.trim(), hash, address?.trim() || "", dbRole]
    );
    const user = { id: result.insertId, name: name.trim(), email: email.trim(), address: address?.trim() || "", role: dbRole };
    const token = signToken(user);
    return res.status(201).json({ user: { ...user, role: roleMapOut(user.role) }, token });
  } catch (err) {
    return res.status(500).json({ message: "signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const db = app.locals.db;
    const { email, password, role } = req.body || {};
    const [rows] = await db.query(
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
  } catch (err) {
    return res.status(500).json({ message: "login failed" });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    return res.json({ message: "logged out" });
  } catch {
    return res.status(500).json({ message: "logout failed" });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const db = app.locals.db || pool;
    const [rows] = await db.query(
      "SELECT id, name, email, address, role, created_at FROM users WHERE id = ?",
      [req.user.sub]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ message: "not found" });
    return res.json({ user: { ...user, role: roleMapOut(user.role) } });
  } catch {
    return res.status(500).json({ message: "failed" });
  }
});

// Example protected route usage (admin only)
// app.get("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => { ... });

app.get("/api/getstores", async (req, res) => {
  try {
    const db = app.locals.db;
    let userId = -1;
    const hdr = req.headers.authorization || "";
    if (hdr.startsWith("Bearer ")) {
      try { userId = jwt.verify(hdr.split(" ")[1], JWT_SECRET).sub; } catch {}
    }

    const { q } = req.query;
    const params = [];
    let where = "";
    if (q && q.trim()) {
      where = "WHERE s.name LIKE ? OR s.address LIKE ?";
      const like = `%${q.trim()}%`;
      params.push(like, like);
    }

    const sql = `
      SELECT
        s.id, s.name, s.email, s.address, s.image_url, s.created_at, s.updated_at,
        ROUND(COALESCE(AVG(r.rating), 0), 1) AS avgRating,
        COUNT(r.id) AS ratingsCount,
        MAX(CASE WHEN r.user_id = ? THEN r.rating END) AS userRating
      FROM \`${STORE_TABLE}\` s
      LEFT JOIN ratings r ON r.store_id = s.id
      ${where}
      GROUP BY s.id, s.name, s.email, s.address, s.image_url, s.created_at, s.updated_at
      ORDER BY s.created_at DESC
    `;
    const [rows] = await db.query(sql, [userId, ...params]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "failed to fetch stores" });
  }
});

// Owner: list owned stores with aggregates
app.get("/api/owner/stores", requireAuth, requireRole("store_owner"), async (req, res) => {
  try {
    const db = app.locals.db;
    const ownerId = req.user.sub;

    const sql = `
      SELECT
        s.id, s.name, s.email, s.address, s.image_url, s.created_at, s.updated_at,
        ROUND(COALESCE(AVG(r.rating), 0), 1) AS avgRating,
        COUNT(r.id) AS ratingsCount
      FROM \`${STORE_TABLE}\` s
      LEFT JOIN ratings r ON r.store_id = s.id
      WHERE s.owner_id = ?
      GROUP BY s.id, s.name, s.email, s.address, s.image_url, s.created_at, s.updated_at
      ORDER BY s.created_at DESC
    `;
    const [rows] = await db.query(sql, [ownerId]);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "failed to load owner stores" });
  }
});

// Owner: raters for a specific owned store
app.get("/api/owner/stores/:storeId/raters", requireAuth, requireRole("store_owner"), async (req, res) => {
  try {
    const db = app.locals.db;
    const ownerId = req.user.sub;
    const storeId = Number(req.params.storeId);
    if (!Number.isInteger(storeId) || storeId <= 0) return res.status(400).json({ message: "invalid store id" });

    // ensure ownership
    const [[owns]] = await db.query(
      "SELECT 1 FROM storedata WHERE id = ? AND owner_id = ? LIMIT 1",
      [storeId, ownerId]
    );
    if (!owns) return res.status(403).json({ message: "not owner of this store" });

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, r.rating, r.created_at
       FROM ratings r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.store_id = ?
       ORDER BY r.created_at DESC
       LIMIT 200`,
      [storeId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "failed to load raters" });
  }
});

// Create a shared upsert handler
async function upsertRatingHandler(req, res) {
  try {
    const db = app.locals.db;
    const userId = req.user.sub;
    const storeId = Number(req.params.storeId);
    const rating = Number(req.body?.rating);

    if (!Number.isInteger(storeId) || storeId <= 0) {
      return res.status(400).json({ message: "invalid store id" });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be 1-5" });
    }

    // Your ratings table uses UNIQUE (store_id, user_id)
    await db.query(
      `INSERT INTO ratings (store_id, user_id, rating)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), updated_at = CURRENT_TIMESTAMP`,
      [storeId, userId, rating]
    );

    const [[agg]] = await db.query(
      `SELECT ROUND(COALESCE(AVG(r.rating), 0), 1) AS avgRating, COUNT(r.id) AS ratingsCount
       FROM ratings r WHERE r.store_id = ?`,
      [storeId]
    );

    return res.json({
      storeId,
      userRating: rating,
      avgRating: Number(agg?.avgRating || 0),
      ratingsCount: Number(agg?.ratingsCount || 0)
    });
  } catch (err) {
    console.error("rating upsert failed", err);
    return res.status(500).json({ message: "failed to submit rating" });
  }
}

// Use the same handler for both POST and PUT (no app._router.handle)
app.post("/api/stores/:storeId/ratings", requireAuth, upsertRatingHandler);
app.put("/api/stores/:storeId/ratings", requireAuth, upsertRatingHandler);

// Optional: ensure JSON error responses (prevents HTML pages)
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "server error" });
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Rahul@2005",
  database: process.env.DB_NAME || "store",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function start() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    app.locals.db = pool;
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log(`server at ${port}`);
    });
  } catch (err) {
    console.error("db connection failed", err);
    process.exit(1);
  }
}

start();

