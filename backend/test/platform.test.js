require('dotenv').config({ path: require('node:path').join(__dirname, '../.env.test'), override: true, quiet: true });
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const app = require('../server');
const { pool } = require('../utils/db');
const { JWT_SECRET } = require('../utils/config');
const { signToken } = require('../utils/auth');
after(() => pool.end());
const suffix = randomBytes(6).toString('hex');
const password = 'Testing!123';
const payload = extra => ({ name: 'Normal Registered Test Person', email: `user-${suffix}@example.com`, address: '123 Testing Street', password, ...extra });
let admin, owner, owner2, normal, second, store, emptyStore, anotherStore;
const auth = token => ({ Authorization: `Bearer ${token}` });
async function account(role, number) {
 const body = payload({ email: `${role}-${number}-${suffix}@example.com` });
 const [r] = await pool.query('INSERT INTO users (name,email,password,address,role) VALUES (?,?,?,?,?)', [body.name,body.email,await bcrypt.hash(password,4),body.address,role]);
 return { id: r.insertId, token: signToken({ id: r.insertId, role, token_version:0 }), email: body.email };
}
test('Store platform integration against isolated MySQL', async t => {
 assert.match(process.env.DB_NAME || '', /^store_rating_test_/, 'Tests must use a dedicated test database');
 admin = await account('admin',1); owner = await account('store_owner',1); owner2 = await account('store_owner',2);
 await t.test('valid public signup normalizes email and trims name', async () => {
  const r = await request(app).post('/api/auth/signup').send(payload({ name:'  Normal Registered Test Person  ',email:`  USER-${suffix}@EXAMPLE.COM  ` }));
  assert.equal(r.status,201); assert.equal(r.body.user.email,`user-${suffix}@example.com`); assert.equal(r.body.user.name,'Normal Registered Test Person'); assert.equal(r.body.user.role,'user'); assert.equal(r.body.user.password,undefined); normal = {id:r.body.user.id,token:r.body.token};
 });
 for (const role of ['admin','owner','store_owner']) await t.test(`public ${role} escalation creates only a normal user`, async () => {
  const r = await request(app).post('/api/auth/signup').send(payload({email:`escalation-${role}-${suffix}@example.com`,role}));
  assert.equal(r.status,201); assert.equal(r.body.user.role,'user');
  assert.equal((await request(app).get('/api/admin/stats').set(auth(r.body.token))).status,403);
 });
 for (const [label,change] of [['short name',{name:'short'}],['long name',{name:'a'.repeat(61)}],['invalid email',{email:'bad'}],['weak password',{password:'weak'}],['long password',{password:'A!'.repeat(9)}],['no uppercase',{password:'testing!123'}],['no special',{password:'Testing123'}],['long address',{address:'a'.repeat(401)}],['missing address',{address:undefined}],['object address',{address:{}}]]) await t.test(`signup rejects ${label}`, async () => assert.equal((await request(app).post('/api/auth/signup').send(payload(change))).status,400));
 await t.test('duplicate email conflict',async()=>assert.equal((await request(app).post('/api/auth/signup').send(payload())).status,409));
 await t.test('unified login uses database role even with supplied admin role',async()=>{
  const r = await request(app).post('/api/auth/login').send({email:`USER-${suffix}@EXAMPLE.COM`,password,role:'admin'}); assert.equal(r.status,200); assert.equal(r.body.user.role,'user'); assert.equal(r.body.user.password,undefined);
 });
 await t.test('invalid credentials',async()=>assert.equal((await request(app).post('/api/auth/login').send({email:`user-${suffix}@example.com`,password:'incorrect'})).status,401));
 await t.test('missing token',async()=>assert.equal((await request(app).get('/api/admin/stats')).status,401));
 await t.test('expired JWT',async()=>{
  const token=jwt.sign({sub:normal.id,role:'user',ver:0},JWT_SECRET,{expiresIn:-1,issuer:'store-rating',audience:'store-rating-web'});
  assert.equal((await request(app).get('/api/auth/me').set(auth(token))).status,401);
 });
 await t.test('wrong JWT signature',async()=>assert.equal((await request(app).get('/api/auth/me').set(auth(jwt.sign({sub:normal.id},randomBytes(32).toString('hex'))))).status,401));
 for (const [label,actor] of [['normal user',normal],['owner',owner]]) await t.test(`${label} cannot access admin`,async()=>assert.equal((await request(app).get('/api/admin/users').set(auth(actor.token))).status,403));
 await t.test('admin creates owner',async()=>{
  const r=await request(app).post('/api/admin/users').set(auth(admin.token)).send(payload({email:`admin-owner-${suffix}@example.com`,role:'owner'})); assert.equal(r.status,201); assert.equal(r.body.role,'owner');
 });
 await t.test('admin user creation enforces common validation',async()=>assert.equal((await request(app).post('/api/admin/users').set(auth(admin.token)).send(payload({name:'short'}))).status,400));
 await t.test('admin rejects unknown role',async()=>assert.equal((await request(app).post('/api/admin/users').set(auth(admin.token)).send(payload({role:'superuser'}))).status,400));
 await t.test('admin creates store with valid owner',async()=>{
  const r=await request(app).post('/api/admin/stores').set(auth(admin.token)).send({name:`Test Store ${suffix}`,email:'shop@example.com',address:'Shop Street',owner_id:owner.id}); assert.equal(r.status,201); store=r.body.id;
 });
 await t.test('owner reference is mandatory',async()=>assert.equal((await request(app).post('/api/admin/stores').set(auth(admin.token)).send({name:'Shop',email:'shop@example.com',address:'Shop Street'})).status,400));
 await t.test('normal user cannot be store owner',async()=>assert.equal((await request(app).post('/api/admin/stores').set(auth(admin.token)).send({name:'Shop',email:'shop@example.com',address:'Shop Street',owner_id:normal.id})).status,400));
 await t.test('missing owner rejected',async()=>assert.equal((await request(app).post('/api/admin/stores').set(auth(admin.token)).send({name:'Shop',email:'shop@example.com',address:'Shop Street',owner_id:4294967295})).status,404));
 await t.test('create separate zero-rating and other-owner stores',async()=>{
  for (const [id,set] of [[owner.id,v=>emptyStore=v],[owner2.id,v=>anotherStore=v]]) {
   const r=await request(app).post('/api/admin/stores').set(auth(admin.token)).send({name:`Empty Shop ${suffix}`,email:'empty@example.com',address:'Other Address',owner_id:id}); assert.equal(r.status,201); set(r.body.id);
  }
 });
 for (const [label,rating] of [['zero',0],['six',6],['negative',-1],['fraction',2.5],['string','3'],['invalid string','hello'],['missing',undefined],['null',null]]) await t.test(`reject ${label} rating`,async()=>assert.equal((await request(app).post(`/api/stores/${store}/ratings`).set(auth(normal.token)).send({rating})).status,400));
 for (const [label,actor] of [['admin',admin],['owner',owner]]) await t.test(`${label} cannot rate`,async()=>assert.equal((await request(app).post(`/api/stores/${store}/ratings`).set(auth(actor.token)).send({rating:4})).status,403));
 await t.test('unauthenticated rating rejected',async()=>assert.equal((await request(app).post(`/api/stores/${store}/ratings`).send({rating:4})).status,401));
 await t.test('invalid store ID rejected',async()=>assert.equal((await request(app).post('/api/stores/no/ratings').set(auth(normal.token)).send({rating:4})).status,400));
 await t.test('missing store returns 404',async()=>assert.equal((await request(app).post('/api/stores/4294967295/ratings').set(auth(normal.token)).send({rating:4})).status,404));
 await t.test('valid rating ignores client user ID',async()=>{
  const r=await request(app).post(`/api/stores/${store}/ratings`).set(auth(normal.token)).send({rating:5,user_id:owner.id}); assert.equal(r.status,200); assert.equal(r.body.userRating,5); assert.equal(r.body.avgRating,5); assert.equal(r.body.ratingsCount,1);
 });
 await t.test('duplicate submission modifies instead of duplicates',async()=>{
  const r=await request(app).post(`/api/stores/${store}/ratings`).set(auth(normal.token)).send({rating:3}); assert.equal(r.status,200); assert.equal(r.body.ratingsCount,1); assert.equal(r.body.avgRating,3);
 });
 await t.test('PUT modifies existing rating',async()=>assert.equal((await request(app).put(`/api/stores/${store}/ratings`).set(auth(normal.token)).send({rating:4})).body.userRating,4));
 await t.test('another user rating does not overwrite first and average is correct',async()=>{
  second=await account('user',2);
  const r=await request(app).post(`/api/stores/${store}/ratings`).set(auth(second.token)).send({rating:2,user_id:normal.id}); assert.equal(r.status,200); assert.equal(r.body.avgRating,3); assert.equal(r.body.ratingsCount,2);
  const list=await request(app).get('/api/getstores').set(auth(normal.token)); assert.equal(list.body.find(s=>s.id===store).userRating,4);
 });
 await t.test('public store list does not expose personal ratings',async()=>{const r=await request(app).get('/api/getstores'); assert.equal(r.status,200); assert.equal(r.body.find(s=>s.id===store).userRating,null);});
 await t.test('zero-rating store',async()=>{const r=await request(app).get('/api/getstores');const s=r.body.find(s=>s.id===emptyStore);assert.equal(Number(s.avgRating),0);assert.equal(s.ratingsCount,0);});
 await t.test('case-insensitive name search',async()=>{const r=await request(app).get(`/api/getstores?q=${encodeURIComponent('TEST STORE '+suffix)}`);assert.equal(r.status,200);assert.equal(r.body.length,1);});
 await t.test('address search',async()=>{const r=await request(app).get('/api/getstores?q=Shop%20Street');assert.ok(r.body.some(s=>s.id===store));});
 await t.test('empty search results',async()=>assert.deepEqual((await request(app).get(`/api/getstores?q=missing-${suffix}`)).body,[]));
 await t.test('malformed query rejected',async()=>assert.equal((await request(app).get('/api/getstores?q=bad&q=other')).status,400));
 await t.test('owner sees only own stores with exact score sum',async()=>{const r=await request(app).get('/api/owner/stores').set(auth(owner.token));assert.equal(r.status,200);assert.ok(r.body.some(s=>s.id===store));assert.ok(!r.body.some(s=>s.id===anotherStore));assert.equal(Number(r.body.find(s=>s.id===store).ratingSum),6);});
 await t.test('owner sees own raters',async()=>{const r=await request(app).get(`/api/owner/stores/${store}/raters`).set(auth(owner.token));assert.equal(r.status,200);assert.equal(r.body.length,2);assert.equal(r.body[0].password,undefined);});
 await t.test('owner cannot access another owner data',async()=>assert.equal((await request(app).get(`/api/owner/stores/${anotherStore}/raters`).set(auth(owner.token))).status,403));
 await t.test('admin user details list individual store averages',async()=>{const r=await request(app).get(`/api/admin/users/${owner.id}`).set(auth(admin.token));assert.equal(r.status,200);assert.equal(r.body.stores.length,2);assert.equal(r.body.password,undefined);});
 await t.test('admin user filters',async()=>{const r=await request(app).get(`/api/admin/users?role=store_owner&q=${suffix}`).set(auth(admin.token));assert.equal(r.status,200);assert.ok(r.body.length>=2);assert.ok(r.body.every(u=>u.role==='owner'));});
 await t.test('admin store filters',async()=>{const r=await request(app).get(`/api/admin/stores?q=${encodeURIComponent('Test Store '+suffix)}`).set(auth(admin.token));assert.equal(r.status,200);assert.equal(r.body.length,1);});
 await t.test('real dashboard statistics',async()=>{const r=await request(app).get('/api/admin/stats').set(auth(admin.token));assert.equal(r.status,200);const [[counts]]=await pool.query('SELECT (SELECT COUNT(*) FROM users) totalUsers,(SELECT COUNT(*) FROM storedata) totalStores,(SELECT COUNT(*) FROM ratings) totalRatings');assert.deepEqual(r.body,counts);});
 await t.test('database unique rating constraint',async()=>{await assert.rejects(pool.query('INSERT INTO ratings (user_id,store_id,rating) VALUES (?,?,?)',[normal.id,store,3]),{code:'ER_DUP_ENTRY'});});
 await t.test('database rejects out-of-range and fractional ratings',async()=>{for(const value of [0,6,2.5])await assert.rejects(pool.query('INSERT INTO ratings (user_id,store_id,rating) VALUES (?,?,?)',[normal.id,emptyStore,value]),{code:'ER_CHECK_CONSTRAINT_VIOLATED'});});
 await t.test('database prevents orphan ratings',async()=>{await assert.rejects(pool.query('INSERT INTO ratings (user_id,store_id,rating) VALUES (?,?,?)',[normal.id,4294967295,3]),{code:'ER_NO_REFERENCED_ROW_2'});});
 await t.test('incorrect current password rejected',async()=>assert.equal((await request(app).post('/api/auth/change-password').set(auth(normal.token)).send({currentPassword:'wrong',newPassword:'Updated!123'})).status,400));
 await t.test('invalid new password rejected',async()=>assert.equal((await request(app).post('/api/auth/change-password').set(auth(normal.token)).send({currentPassword:password,newPassword:'weak'})).status,400));
 await t.test('password change invalidates issued JWT and old credentials',async()=>{
  const r=await request(app).post('/api/auth/change-password').set(auth(normal.token)).send({currentPassword:password,newPassword:'Updated!123'});assert.equal(r.status,200);
  assert.equal((await request(app).get('/api/auth/me').set(auth(normal.token))).status,401);
  assert.equal((await request(app).post('/api/auth/login').send({email:`user-${suffix}@example.com`,password})).status,401);
  assert.equal((await request(app).post('/api/auth/login').send({email:`user-${suffix}@example.com`,password:'Updated!123'})).status,200);
 });
 await t.test('missing JWT secret fails configuration safely',async()=>{
  const env={...process.env,JWT_SECRET:''};assert.throws(()=>execFileSync(process.execPath,['-e',"require('./backend/utils/config')"],{cwd:path.resolve(__dirname,'../..'),env,stdio:'pipe'}),error=>error.status===1 && error.stderr.toString().includes('JWT_SECRET must contain'));
 });
 await t.test('missing DB password configuration fails safely',async()=>{
  const env={...process.env};delete env.DB_PASSWORD;assert.throws(()=>execFileSync(process.execPath,['-e',"require('./backend/utils/config')"],{cwd:path.resolve(__dirname,'../..'),env,stdio:'pipe'}),error=>error.status===1 && error.stderr.toString().includes('DB_PASSWORD must be explicitly configured'));
 });
 await t.test('invalid JSON returns 400' ,async()=>assert.equal((await request(app).post('/api/auth/login').set('Content-Type','application/json').send('{')).status,400));
});
