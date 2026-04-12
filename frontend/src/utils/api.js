const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function analyzeDocument(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/analyze`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Analysis failed");
  return data;
}

export async function recalculate(counts) {
  const res = await fetch(`${BASE}/api/recalculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(counts),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Recalculation failed");
  return data;
}
