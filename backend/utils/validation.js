const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordValid = value => typeof value === 'string' && /^(?=.*[A-Z])(?=.*[^\w\s]).{8,16}$/.test(value);
const text = value => typeof value === 'string' ? value.trim() : '';
function validateUser(body = {}) {
  const name = text(body.name), email = text(body.email).toLowerCase(), address = text(body.address);
  if (name.length < 20 || name.length > 60) return { error: 'Name must be 20â€“60 characters' };
  if (!emailPattern.test(email) || email.length > 254) return { error: 'Valid email required' };
  if (typeof body.address !== 'string' || !address || address.length > 400) return { error: 'Address is required and must be at most 400 characters' };
  if (!passwordValid(body.password)) return { error: 'Password must be 8â€“16 characters with an uppercase and special character' };
  return { name, email, address, password: body.password };
}
module.exports = { validateUser, passwordValid, emailPattern, text };
