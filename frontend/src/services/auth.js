const API_BASE = import.meta.env.VITE_API_URL || '';

async function authFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(url, { ...options, headers });
    let data;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) return { data: null, error: data?.error || `HTTP ${res.status}: ${res.statusText}` };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || 'Network error' };
  }
}

export async function login(email, password) {
  return authFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export async function register(name, email, password, role = 'field_staff') {
  return authFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
}
export async function logout() {
  return authFetch('/api/auth/logout', { method: 'POST' });
}
export async function getCurrentUser() {
  return authFetch('/api/auth/me', { method: 'GET' });
}
export async function changePassword(currentPassword, newPassword) {
  return authFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
}
export async function getUsers() {
  return authFetch('/api/auth/users', { method: 'GET' });
}
export async function updateUserRole(id, role) {
  return authFetch(`/api/auth/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}
