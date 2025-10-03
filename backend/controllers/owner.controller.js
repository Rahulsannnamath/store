const { pool } = require("../utils/db");
const { STORE_TABLE } = require("../utils/config");

async function listOwnedStores(req, res) {
  try {
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
    const [rows] = await pool.query(sql, [ownerId]);
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "failed to load owner stores" });
  }
}

async function getStoreRaters(req, res) {
  try {
    const ownerId = req.user.sub;
    const storeId = Number(req.params.storeId);
    if (!Number.isInteger(storeId) || storeId <= 0) return res.status(400).json({ message: "invalid store id" });

    const [[owns]] = await pool.query("SELECT 1 FROM storedata WHERE id = ? AND owner_id = ? LIMIT 1", [storeId, ownerId]);
    if (!owns) return res.status(403).json({ message: "not owner of this store" });

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, r.rating, r.created_at
       FROM ratings r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.store_id = ?
       ORDER BY r.created_at DESC
       LIMIT 200`,
      [storeId]
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "failed to load raters" });
  }
}

module.exports = { listOwnedStores, getStoreRaters };