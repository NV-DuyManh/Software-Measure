// frontend/src/utils/auth.js
// Token storage + API calls for register / login / history.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Token & user storage ──────────────────────────────────────────

export function saveToken(token) {
  localStorage.setItem("fp_jwt", token);
}

export function getToken() {
  return localStorage.getItem("fp_jwt") || null;
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
    const raw = localStorage.getItem("fp_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

// ── Auth API calls ────────────────────────────────────────────────

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

// ── History API call ──────────────────────────────────────────────

export async function apiGetHistory() {
  const token = getToken();
  if (!token) throw new Error("Not logged in.");

  const res = await fetch(`${BASE}/api/history`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch history");
  // backend returns { history: [...] }
  return data.history ?? [];
}
