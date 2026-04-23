// frontend/src/utils/api.js
const BASE_NODE = import.meta.env.VITE_NODE_API_URL || "http://localhost:3001";
const BASE_PY   = import.meta.env.VITE_API_URL       || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("fp_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleRes(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────
export async function register(username, email, password) {
  const res = await fetch(`${BASE_NODE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return handleRes(res);
}

export async function login(email, password) {
  const res = await fetch(`${BASE_NODE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleRes(res);
}

export async function getMe() {
  const res = await fetch(`${BASE_NODE}/auth/me`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

// ─── UPLOAD (Node backend → chuyển sang Python AI) ────────────────
export async function analyzeDocument(file) {
  const token = localStorage.getItem("fp_token");
  const form  = new FormData();
  form.append("file", file);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE_NODE}/api/upload`, {
    method: "POST",
    headers,
    body: form,
  });
  return handleRes(res);
}

// ─── HISTORY ──────────────────────────────────────────────────────
export async function getHistory() {
  const res = await fetch(`${BASE_NODE}/api/history`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

// ─── UPLOAD HISTORY (Task 1) ──────────────────────────────────────
export async function getUploadHistory() {
  const res = await fetch(`${BASE_NODE}/api/history/uploads`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function getHistoryDetail(uploadId) {
  const res = await fetch(`${BASE_NODE}/api/history/${uploadId}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function deleteHistory(uploadId) {
  const res = await fetch(`${BASE_NODE}/api/history/${uploadId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleRes(res);
}

// ─── CẬP NHẬT KẾT QUẢ + VAF ──────────────────────────────────────
export async function updateResult(resultId, payload) {
  const res = await fetch(`${BASE_NODE}/api/result/${resultId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

// ─── RECALCULATE LOCAL (Python) — dùng khi chưa đăng nhập ────────
export async function recalculate(counts) {
  const res = await fetch(`${BASE_PY}/api/recalculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(counts),
  });
  return handleRes(res);
}

// ─── EXPORT ───────────────────────────────────────────────────────
export function getExportUrl(uploadId, format) {
  const token = localStorage.getItem("fp_token");
  return `${BASE_NODE}/api/export/${uploadId}/${format}?token=${token}`;
}

// ─── EXPORT via POST (Task 2) ─────────────────────────────────────
export async function exportExcel(payload) {
  const res = await fetch(`${BASE_NODE}/api/export/excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Excel export failed");
  }
  return res.blob();
}

export async function exportPdf(payload) {
  const res = await fetch(`${BASE_NODE}/api/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "PDF export failed");
  }
  return res.blob();
}
