export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export function clearSession() {
 localStorage.removeItem('token'); localStorage.removeItem('user');
 window.dispatchEvent(new Event('session-expired'));
}
async function request(path, { method = 'GET', body, authenticated = true } = {}) {
 const token = localStorage.getItem('token');
 const res = await fetch(`${API_BASE}/api${path}`, {
  method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
 });
 if (res.status === 401 && authenticated) clearSession();
 let data;
 try { data = await res.json(); } catch { throw new Error('Server returned an unreadable response'); }
 if (!res.ok) throw new Error(data?.message || 'Request failed');
 return data;
}
export const getMe = () => request('/auth/me');
export const signup = ({ name, email, password, address }) => request('/auth/signup', { method: 'POST', body: { name, email, password, address }, authenticated: false });
export async function login({ email, password }) {
 const data = await request('/auth/login', { method: 'POST', body: { email, password }, authenticated: false });
 localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user));
 return data;
}
export async function logout() {
 try { await request('/auth/logout', { method: 'POST' }); } finally { clearSession(); }
}
export const changePassword = body => request('/auth/change-password', { method: 'POST', body });
export async function getStores(search = '') {
 const data = await request(`/getstores?q=${encodeURIComponent(search)}`);
 return data.map(s => ({ ...s, avgRating: Number(s.avgRating), ratingsCount: Number(s.ratingsCount), userRating: Number(s.userRating || 0) }));
}
export const submitRating = (id, rating) => request(`/stores/${id}/ratings`, { method: 'POST', body: { rating } });
export const updateRating = (id, rating) => request(`/stores/${id}/ratings`, { method: 'PUT', body: { rating } });
export const getOwnerStores = () => request('/owner/stores');
export const getStoreRaters = id => request(`/owner/stores/${id}/raters`);
export const adminGetStats = () => request('/admin/stats');
export const adminGetUser = id => request(`/admin/users/${id}`);
export const adminListUsers = ({ q = '', role = 'all' } = {}) => request(`/admin/users?${new URLSearchParams({ q, ...(role !== 'all' ? { role } : {}) })}`);
export const adminListStores = ({ q = '' } = {}) => request(`/admin/stores?${new URLSearchParams({ q })}`);
export const adminCreateUser = body => request('/admin/users', { method: 'POST', body });
export const adminCreateStore = body => request('/admin/stores', { method: 'POST', body });
