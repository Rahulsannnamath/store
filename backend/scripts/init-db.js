require('../utils/config');
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../utils/db');
async function run() {
 const [[{ version }]] = await pool.query('SELECT VERSION() AS version');
 const [major, minor, patch] = version.split('.').map(Number);
 if (major < 8 || (major === 8 && minor === 0 && patch < 16) || version.includes('MariaDB')) throw new Error('MySQL 8.0.16+ required');
 const [tables] = await pool.query('SHOW TABLES');
 if (tables.length) throw new Error('Database is not empty. Back up and use db:migrate for existing installations.');
 for (const statement of fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8').replace(/^--.*$/gm, '').split(';').filter(s => s.trim())) await pool.query(statement);
 console.log('Schema initialized');
}
run().catch(e => { console.error(e.code || e.message); process.exitCode = 1; }).finally(() => pool.end());
