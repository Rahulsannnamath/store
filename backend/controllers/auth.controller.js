const bcrypt = require('bcryptjs');
const { pool } = require('../utils/db');
const { roleMapOut, signToken } = require('../utils/auth');
const { validateUser, passwordValid, text } = require('../utils/validation');
const safe = ({ password, token_version, ...user }) => ({ ...user, role: roleMapOut(user.role) });
async function signup(req, res, next) {
  const input = validateUser(req.body || {});
  if (input.error) return res.status(400).json({ message: input.error });
  try {
    const hash = await bcrypt.hash(input.password, 12);
    const [result] = await pool.query('INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)', [input.name, input.email, hash, input.address, 'user']);
    const user = { id: result.insertId, name: input.name, email: input.email, address: input.address, role: 'user', token_version: 0 };
    res.status(201).json({ user: safe(user), token: signToken(user) });
  } catch (err) { next(err); }
}
async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) return res.status(400).json({ message: 'Email and password required' });
  try {
    const [[user]] = await pool.query('SELECT id, name, email, password, address, role, created_at, token_version FROM users WHERE email = ?', [text(email).toLowerCase()]);
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ message: 'invalid credentials' });
    res.json({ user: safe(user), token: signToken(user) });
  } catch (err) { next(err); }
}
async function me(req, res, next) {
  try {
    const [[user]] = await pool.query('SELECT id, name, email, address, role, created_at FROM users WHERE id = ?', [req.user.sub]);
    if (!user) return res.status(401).json({ message: 'session expired' });
    res.json({ user: safe(user) });
  } catch (err) { next(err); }
}
async function changePassword(req, res, next) {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || currentPassword.length > 128 || !passwordValid(newPassword)) return res.status(400).json({ message: 'New password must be 8-16 characters with an uppercase and special character' });
  try {
    const [[user]] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.sub]);
    if (!user || !await bcrypt.compare(currentPassword, user.password)) return res.status(400).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    const [result] = await pool.query('UPDATE users SET password = ?, token_version = token_version + 1 WHERE id = ? AND password = ?', [hash, req.user.sub, user.password]);
    if (!result.affectedRows) return res.status(409).json({ message: 'Password changed concurrently; sign in again' });
    res.json({ message: 'Password changed. Please sign in again.' });
  } catch (err) { next(err); }
}
const logout = (req, res) => res.json({ message: 'logged out' });
module.exports = { signup, login, me, logout, changePassword };
