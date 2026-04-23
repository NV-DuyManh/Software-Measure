// frontend/src/components/ExportButtons.jsx
import { useState } from "react";
import "./ExportButtons.css";

const BASE_NODE = import.meta.env.VITE_NODE_API_URL || "http://localhost:3001";

/** Trigger a browser download from a Blob */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ uploadId }) {
  const [loading, setLoading] = useState(null); // "excel" | "pdf" | null

  if (!uploadId) return null;

  async function handleExport(format) {
    setLoading(format);
    try {
      const token = localStorage.getItem("fp_token");
      const res = await fetch(
        `${BASE_NODE}/api/export/${uploadId}/${format}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      const ext = format === "excel" ? "xlsx" : "pdf";
      downloadBlob(blob, `fp-result-${uploadId}.${ext}`);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="export-row">
      <span className="export-label">Export:</span>

      <button
        className="export-btn export-excel"
        onClick={() => handleExport("excel")}
        disabled={!!loading}
        title="Tải về file Excel"
      >
        {loading === "excel" ? (
          <span className="export-spinner" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2"
              stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 4l2 3-2 3M10 4H7.5v6H10"
              stroke="currentColor" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        Excel (.xlsx)
      </button>

      <button
        className="export-btn export-pdf"
        onClick={() => handleExport("pdf")}
        disabled={!!loading}
        title="Tải về file PDF"
      >
        {loading === "pdf" ? (
          <span className="export-spinner" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2"
              stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 9V5h2a1.5 1.5 0 010 3H4M9 5v4"
              stroke="currentColor" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        PDF
      </button>
    </div>
  );
}

