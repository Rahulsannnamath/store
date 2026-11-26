const mysql = require("mysql2/promise");
require('./config');

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "store_rating",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    const [[{ version }]] = await conn.query('SELECT VERSION() AS version');
    const [major, minor, patch] = version.split('.').map(Number);
    if (version.includes('MariaDB') || major < 8 || (major === 8 && minor === 0 && patch < 16)) throw new Error('MySQL 8.0.16+ required');
    await conn.query('SELECT token_version FROM users LIMIT 0');
  } finally { conn.release(); }
}

module.exports = { pool, initDB };
