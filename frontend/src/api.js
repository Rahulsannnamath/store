export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getStores(search = "") {
  const url = new URL(`${API_BASE}/api/getstores`);
  if (search) url.searchParams.set("q", search);
  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to load stores");
  const data = await res.json();
  return (data || []).map(s => ({
    ...s,
    avgRating: Number(s.avgRating ?? 0),
    ratingsCount: Number(s.ratingsCount ?? 0),
    userRating: Number(s.userRating ?? 0)
  }));
}

export async function signup({ name, email, password, role }) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role })
  });
  if (!res.ok) throw new Error((await res.json()).message || "Signup failed");
  return res.json();
}

export async function login({ email, password, role }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  });
  if (!res.ok) throw new Error((await res.json()).message || "Login failed");
  const data = await res.json();
  if (data?.token) localStorage.setItem("token", data.token);
  if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function logout() {
  const token = localStorage.getItem("token");
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  } catch(err) {console.log(err)}
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  return { ok: true };
}

export async function submitRating(storeId, rating) {
  const res = await fetch(`${API_BASE}/api/stores/${storeId}/ratings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rating })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) throw new Error(data?.message || text || "Failed to submit rating");
  return data;
}

export async function updateRating(storeId, rating) {
  const res = await fetch(`${API_BASE}/api/stores/${storeId}/ratings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rating })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) throw new Error(data?.message || text || "Failed to update rating");
  return data;
}

export async function getOwnerStores() {
  const res = await fetch(`${API_BASE}/api/owner/stores`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to load owner stores");
  return res.json();
}

export async function getStoreRaters(storeId) {
  const res = await fetch(`${API_BASE}/api/owner/stores/${storeId}/raters`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to load raters");
  return res.json();
}

// Admin API
export async function adminGetStats() {
  const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: { ...authHeaders() } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || "Failed to load stats");
  return data;
}

export async function adminListUsers({ q = "", role = "all" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role && role !== "all") params.set("role", role);
  const res = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, { headers: { ...authHeaders() } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : [];
  if (!res.ok) throw new Error(data?.message || "Failed to load users");
  return data;
}

export async function adminCreateUser(payload) {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || "Failed to create user");
  return data;
}

export async function adminListStores({ q = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const res = await fetch(`${API_BASE}/api/admin/stores?${params.toString()}`, { headers: { ...authHeaders() } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : [];
  if (!res.ok) throw new Error(data?.message || "Failed to load stores");
  return data;
}

export async function adminCreateStore(payload) {
  const res = await fetch(`${API_BASE}/api/admin/stores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || "Failed to create store");
  return data;
}