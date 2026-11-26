// Optional local demo data. Re-running preserves existing accounts, stores and ratings.
const bcrypt = require('bcryptjs');
const { pool } = require('../utils/db');
const { passwordValid } = require('../utils/validation');

async function run() {
  if (!passwordValid(process.env.DEMO_PASSWORD)) {
    throw new Error('Set DEMO_PASSWORD to 8-16 characters including uppercase and a special character');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const hash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
    async function account(name, email, role, address) {
      const [[existing]] = await connection.query('SELECT id, role FROM users WHERE email = ?', [email]);
      if (existing) {
        if (existing.role !== role) throw new Error('Existing demo account has a different role; no data was changed');
        return existing.id;
      }
      const [result] = await connection.query(
        'INSERT INTO users (name,email,password,address,role) VALUES (?,?,?,?,?)',
        [name, email, hash, address, role]
      );
      return result.insertId;
    }
    await account('Store Platform Administrator', 'admin@demo.store.test', 'admin', '10 Central Avenue, Bengaluru');
    const owners = [];
    for (const [name, email, address] of [
      ['Ananya Sharma Store Owner', 'ananya@demo.store.test', 'Indiranagar, Bengaluru'],
      ['Vikram Prakash Store Owner', 'vikram@demo.store.test', 'Koramangala, Bengaluru'],
      ['Meera Krishnan Store Owner', 'meera@demo.store.test', 'Jayanagar, Bengaluru']
    ]) owners.push(await account(name, email, 'store_owner', address));
    const users = [];
    for (const [name, email, address] of [
      ['Rahul Sannnamath Demo Shopper', 'rahul@demo.store.test', 'HSR Layout, Bengaluru'],
      ['Priya Narayanan Demo Shopper', 'priya@demo.store.test', 'Whitefield, Bengaluru'],
      ['Arjun Raghavendra Demo Shopper', 'arjun@demo.store.test', 'JP Nagar, Bengaluru'],
      ['Sneha Chandrashekar Demo Shopper', 'sneha@demo.store.test', 'Malleshwaram, Bengaluru'],
      ['Karthik Srinivasan Demo Shopper', 'karthik@demo.store.test', 'BTM Layout, Bengaluru']
    ]) users.push(await account(name, email, 'user', address));
    const definitions = [
      ['Fresh Basket Market', 'market', '100 Feet Road, Indiranagar, Bengaluru', 0, [5,4,5,4,5]],
      ['Urban Threads Fashion', 'fashion', '80 Feet Road, Koramangala, Bengaluru', 1, [4,5,4,3,4]],
      ['The Corner Coffee House', 'cafe', 'Church Street, Bengaluru', 0, [5,5,4,5,4]],
      ['Chapter One Bookshop', 'books', '4th Block, Jayanagar, Bengaluru', 2, [4,4,5,5,4]],
      ['Golden Crust Bakery', 'bakery', 'Margosa Road, Malleshwaram, Bengaluru', 2, [5,4,5,5,5]],
      ['Circuit City Electronics', 'electronics', 'Brigade Road, Bengaluru', 1, [3,4,4,5,4]]
    ];
    for (const [name, image, address, owner, scores] of definitions) {
      const email = `${image}@demo.store.test`;
      const [[existing]] = await connection.query('SELECT id FROM storedata WHERE email = ? LIMIT 1', [email]);
      let id = existing?.id;
      if (!id) {
        const [result] = await connection.query(
          'INSERT INTO storedata (name,email,address,owner_id,image_url) VALUES (?,?,?,?,?)',
          [name, email, address, owners[owner], `/images/${image}.jpg`]
        );
        id = result.insertId;
      }
      for (let i = 0; i < users.length; i++) {
        const [[rating]] = await connection.query('SELECT id FROM ratings WHERE user_id = ? AND store_id = ?', [users[i], id]);
        if (!rating) await connection.query('INSERT INTO ratings (user_id,store_id,rating) VALUES (?,?,?)', [users[i], id, scores[i]]);
      }
    }
    await connection.commit();
    console.log('Demo data ready: 9 accounts, 6 stores with local images, 30 sample ratings (existing data preserved).');
    console.log('Demo login: rahul@demo.store.test (user), ananya@demo.store.test (owner), admin@demo.store.test (admin). Password: DEMO_PASSWORD from your private environment.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

run().catch(error => { console.error(error.code || error.message); process.exitCode = 1; }).finally(() => pool.end());
