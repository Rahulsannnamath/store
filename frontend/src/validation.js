export const passwordValid = value => typeof value === 'string' && /^(?=.*[A-Z])(?=.*[^\w\s]).{8,16}$/.test(value);
export function userError({ name = '', email = '', password = '', address = '' }) {
 if (name.trim().length < 20 || name.trim().length > 60) return 'Name must be 20-60 characters';
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) return 'Valid email required';
 if (!address.trim() || address.trim().length > 400) return 'Address is required and must be at most 400 characters';
 if (!passwordValid(password)) return 'Password must be 8-16 characters with an uppercase and special character';
 return '';
}
export function sortedRows(rows, { key, direction }) {
 return [...rows].sort((a,b) => {
  const numeric = ['avgRating','ownerRating','ratingsCount','rating'].includes(key);
  const result = numeric ? Number(a[key] || 0) - Number(b[key] || 0) : String(a[key] || '').localeCompare(String(b[key] || ''), undefined, { sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
 });
}
