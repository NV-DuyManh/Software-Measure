// frontend/src/components/ExportButtons.jsx
import { getExportUrl } from "../utils/api";
import "./ExportButtons.css";

export default function ExportButtons({ uploadId }) {
  if (!uploadId) return null;

  function handleExport(format) {
    const url = getExportUrl(uploadId, format);
    window.open(url, "_blank");
  }

  return (
    <div className="export-row">
      <span className="export-label">Export:</span>

      <button
        className="export-btn export-excel"
        onClick={() => handleExport("excel")}
        title="Tải về file Excel"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="12" height="12" rx="2"
            stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 4l2 3-2 3M10 4H7.5v6H10"
            stroke="currentColor" strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Excel (.xlsx)
      </button>

      <button
        className="export-btn export-pdf"
        onClick={() => handleExport("pdf")}
        title="Tải về file PDF"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="12" height="12" rx="2"
            stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 9V5h2a1.5 1.5 0 010 3H4M9 5v4"
            stroke="currentColor" strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        PDF
      </button>
    </div>
  );
}
