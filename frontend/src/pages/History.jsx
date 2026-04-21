// frontend/src/pages/History.jsx
import { useState, useEffect } from "react";
import { apiGetHistory } from "../utils/auth";
import "./History.css";

// ── Helpers ───────────────────────────────────────────────────────
function fmt(num) {
  return Number(num ?? 0).toLocaleString();
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Component badge ───────────────────────────────────────────────
function CompBadge({ label, value, colorVar }) {
  return (
    <div className="comp-badge">
      <span className="comp-badge-label" style={{ color: `var(${colorVar})` }}>
        {label}
      </span>
      <span className="comp-badge-value">{value}</span>
    </div>
  );
}

// ── Single history card ───────────────────────────────────────────
function HistoryCard({ row, index }) {
  return (
    <div className="h-card">
      {/* Card header */}
      <div className="h-card-header">
        <div className="h-card-left">
          <span className="h-card-index">#{index + 1}</span>
          <span className="h-card-icon">📄</span>
          <span className="h-card-filename" title={row.filename}>
            {row.filename}
          </span>
        </div>
        <span className="h-card-date">🕒 {fmtDate(row.analyzed_at)}</span>
      </div>

      {/* Component counts row */}
      <div className="h-card-comps">
        <CompBadge label="EI"  value={row.ei}  colorVar="--EI"  />
        <CompBadge label="EO"  value={row.eo}  colorVar="--EO"  />
        <CompBadge label="EQ"  value={row.eq}  colorVar="--EQ"  />
        <CompBadge label="ILF" value={row.ilf} colorVar="--ILF" />
        <CompBadge label="EIF" value={row.eif} colorVar="--EIF" />
      </div>

      {/* KPI row */}
      <div className="h-card-kpis">
        <div className="h-kpi">
          <span className="h-kpi-label">⚙️ Function Points</span>
          <span className="h-kpi-value fp">{row.fp} FP</span>
        </div>
        <div className="h-kpi">
          <span className="h-kpi-label">⏱ Effort</span>
          <span className="h-kpi-value">{row.effort} <small>person-months</small></span>
        </div>
        <div className="h-kpi">
          <span className="h-kpi-label">📅 Time</span>
          <span className="h-kpi-value">{row.time_months} <small>months</small></span>
        </div>
        <div className="h-kpi">
          <span className="h-kpi-label">💰 Cost</span>
          <span className="h-kpi-value cost">${fmt(row.cost)}</span>
        </div>
        <div className="h-kpi">
          <span className="h-kpi-label">📊 UFC</span>
          <span className="h-kpi-value">{row.ufc}</span>
        </div>
      </div>

      {/* Chunks info */}
      <div className="h-card-footer">
        <span className="h-chunk-ok">✓ {row.chunks_processed} chunks analyzed</span>
        {row.chunks_failed > 0 && (
          <span className="h-chunk-fail">⚠ {row.chunks_failed} failed</span>
        )}
      </div>
    </div>
  );
}

// ── Main History page ─────────────────────────────────────────────
export default function History({ user, onBack }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiGetHistory()
      .then((data) => setRows(data))
      .catch((e)   => setError(e.message))
      .finally(()  => setLoading(false));
  }, []);

  return (
    <div className="history-page">

      {/* ── Top bar ── */}
      <div className="history-topbar">
        <div className="history-topbar-left">
          <h2 className="history-title">📋 Analysis History</h2>
          <p className="history-sub">
            Logged in as <strong className="history-username">{user?.username}</strong>
            {!loading && !error && (
              <span className="history-count"> · {rows.length} record{rows.length !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="history-center">
          <div className="h-spinner" />
          <p className="history-loading-text">Loading your history…</p>
        </div>
      )}

      {!loading && error && (
        <div className="history-center">
          <div className="h-error-box">
            <span className="h-error-icon">⚠️</span>
            <p className="h-error-msg">{error}</p>
            <button
              className="btn-primary"
              onClick={() => {
                setLoading(true);
                setError("");
                apiGetHistory()
                  .then(setRows)
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="history-center">
          <div className="h-empty">
            <span className="h-empty-icon">📭</span>
            <p className="h-empty-title">No analyses yet</p>
            <p className="h-empty-sub">Upload a PDF or DOCX to get started.</p>
            <button className="btn-primary" onClick={onBack}>
              Upload Now →
            </button>
          </div>
        </div>
      )}

      {/* ── Card list ── */}
      {!loading && !error && rows.length > 0 && (
        <div className="h-card-list">
          {rows.map((row, idx) => (
            <HistoryCard key={row.id} row={row} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
