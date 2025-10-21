// Simple auth client for JWT-based backend
const API_BASE = '';

const authState = {
  token: localStorage.getItem('auth_token') || null,
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
};

export function isAuthenticated() {
  return Boolean(authState.token);
}

export function getAuthToken() {
  return authState.token;
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  authState.token = data.token;
  authState.user = data.user;
  localStorage.setItem('auth_token', authState.token);
  localStorage.setItem('auth_user', JSON.stringify(authState.user));
  return data.user;
}

export function logout() {
  authState.token = null;
  authState.user = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function getCurrentUser() {
  return authState.user;
}

export async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authState.token) headers.set('Authorization', `Bearer ${authState.token}`);
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  return res;
}
