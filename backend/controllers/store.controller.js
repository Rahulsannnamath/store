const { pool } = require("../utils/db");
const { STORE_TABLE } = require("../utils/config");
const { getUserIdFromReq } = require("../utils/auth");

async function getStores(req, res) {
  try {
    let userId = -1;
    try { userId = getUserIdFromReq(req) ?? -1; } catch {}
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
    const [rows] = await pool.query(sql, [userId, ...params]);
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "failed to fetch stores" });
  }
}

async function upsertRating(req, res) {
  try {
    const userId = req.user.sub;
    const storeId = Number(req.params.storeId);
    const rating = Number(req.body?.rating);

    if (!Number.isInteger(storeId) || storeId <= 0) return res.status(400).json({ message: "invalid store id" });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "rating must be 1-5" });

    await pool.query(
      `INSERT INTO ratings (store_id, user_id, rating)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), updated_at = CURRENT_TIMESTAMP`,
      [storeId, userId, rating]
    );

    const [[agg]] = await pool.query(
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
  } catch {
    return res.status(500).json({ message: "failed to submit rating" });
  }
}

module.exports = { getStores, upsertRating };