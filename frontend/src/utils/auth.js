// frontend/src/utils/auth.js
// Auth helpers — token storage and API calls for register/login.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Token storage ────────────────────────────────────────────────

export function saveToken(token) {
  localStorage.setItem("fp_jwt", token);
}

export function getToken() {
  return localStorage.getItem("fp_jwt");
}

export function removeToken() {
  localStorage.removeItem("fp_jwt");
  localStorage.removeItem("fp_user");
}

export function saveUser(user) {
  localStorage.setItem("fp_user", JSON.stringify(user));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("fp_user"));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

// ─── API calls ────────────────────────────────────────────────────

export async function apiRegister({ username, email, password }) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

export async function apiLogin({ username, password }) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function apiGetHistory() {
  const token = getToken();
  const res = await fetch(`${BASE}/api/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch history");
  return data.history;
}
