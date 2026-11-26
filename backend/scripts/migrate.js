// Additive migration only. MySQL DDL commits implicitly: back up before running.
const { pool } = require('../utils/db');
async function run() {
 const [[{ version }]] = await pool.query('SELECT VERSION() AS version');
 const [a,b,c] = version.split('.').map(Number);
 if (a < 8 || (a === 8 && b === 0 && c < 16) || version.includes('MariaDB')) throw new Error('MySQL 8.0.16+ required');
 const checks = [
  ['Duplicate normalized emails', 'SELECT LOWER(TRIM(email)) FROM users GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1'],
  ['Invalid user names or addresses', 'SELECT id FROM users WHERE name IS NULL OR CHAR_LENGTH(TRIM(name)) NOT BETWEEN 20 AND 60 OR address IS NULL OR CHAR_LENGTH(TRIM(address)) NOT BETWEEN 1 AND 400'],
  ['Non-normalized emails', 'SELECT id FROM users WHERE email IS NULL OR BINARY email <> BINARY LOWER(TRIM(email))'],
  ['Invalid roles', "SELECT id FROM users WHERE role IS NULL OR role NOT IN ('user','admin','store_owner')"],
  ['Invalid stores or ownership', "SELECT s.id FROM storedata s LEFT JOIN users u ON u.id=s.owner_id WHERE u.id IS NULL OR u.role <> 'store_owner' OR s.name IS NULL OR CHAR_LENGTH(TRIM(s.name)) NOT BETWEEN 1 AND 60 OR s.address IS NULL OR CHAR_LENGTH(TRIM(s.address)) NOT BETWEEN 1 AND 400"],
  ['Duplicate ratings', 'SELECT user_id,store_id FROM ratings GROUP BY user_id,store_id HAVING COUNT(*)>1'],
  ['Invalid ratings or references', "SELECT r.id FROM ratings r LEFT JOIN users u ON u.id=r.user_id LEFT JOIN storedata s ON s.id=r.store_id WHERE u.id IS NULL OR s.id IS NULL OR u.role <> 'user' OR r.rating IS NULL OR r.rating NOT BETWEEN 1 AND 5 OR r.rating <> FLOOR(r.rating)"]
 ];
 // Preflight every data check before any DDL. Never print personal data.
 for (const [label,sql] of checks) { const [rows] = await pool.query(sql); if (rows.length) throw new Error(label + ': reconcile existing data explicitly, then rerun'); }
 const [columns] = await pool.query('SHOW COLUMNS FROM users');
 if (!columns.some(c => c.Field === 'token_version')) await pool.query('ALTER TABLE users ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0');
 const [constraints] = await pool.query('SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()');
 const additions = [
  ['users','uq_users_email','UNIQUE (email)'],
  ['users','chk_users_name','CHECK (name IS NOT NULL AND CHAR_LENGTH(TRIM(name)) BETWEEN 20 AND 60)'],
  ['users','chk_users_address','CHECK (address IS NOT NULL AND CHAR_LENGTH(TRIM(address)) BETWEEN 1 AND 400)'],
  ['users','chk_users_role',"CHECK (role IS NOT NULL AND role IN ('user','admin','store_owner'))"],
  ['storedata','fk_store_owner','FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT'],
  ['storedata','chk_store_owner','CHECK (owner_id IS NOT NULL)'],
  ['ratings','uq_rating_user_store','UNIQUE (user_id,store_id)'],
  ['ratings','fk_rating_user','FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT'],
  ['ratings','fk_rating_store','FOREIGN KEY (store_id) REFERENCES storedata(id) ON DELETE RESTRICT'],
  ['ratings','chk_rating_range','CHECK (rating IS NOT NULL AND rating BETWEEN 1 AND 5 AND rating=FLOOR(rating))']
 ];
 for (const [table,name,definition] of additions) if (!constraints.some(c => c.TABLE_NAME === table && c.CONSTRAINT_NAME === name)) await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} ${definition}`);
 console.log('Additive migration completed; existing rows preserved');
}
run().catch(e => { console.error(e.code || e.message); process.exitCode = 1; }).finally(() => pool.end());
