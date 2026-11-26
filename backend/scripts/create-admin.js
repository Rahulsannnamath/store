const bcrypt = require('bcryptjs');
const { pool } = require('../utils/db');
const { validateUser } = require('../utils/validation');
async function run() {
 const input = validateUser({ name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, address: process.env.ADMIN_ADDRESS });
 if (input.error) throw new Error(input.error);
 const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
 if (count) throw new Error('An administrator exists; use the authenticated admin interface');
 await pool.query('INSERT INTO users (name,email,password,address,role) VALUES (?,?,?,?,?)', [input.name, input.email, await bcrypt.hash(input.password, 12), input.address, 'admin']);
 console.log('Administrator created');
}
run().catch(e => { console.error(e.code || e.message); process.exitCode = 1; }).finally(() => pool.end());
