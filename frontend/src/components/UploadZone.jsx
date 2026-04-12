import { useState, useRef } from "react";
import "./UploadZone.css";

export default function UploadZone({ onFile }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  function handle(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx"].includes(ext)) {
      alert("Only PDF and DOCX files are supported.");
      return;
    }
    onFile(file);
  }

  return (
    <div className="upload-wrap">
      <div className="upload-hero">
        <h1>Function Point<br /><span className="gradient-text">Estimation</span></h1>
        <p className="upload-sub">Upload an SRS document and receive an AI-powered Function Point analysis using the IFPUG standard.</p>
      </div>

      <div
        className={`dropzone ${drag ? "drag-active" : ""}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx" hidden onChange={(e) => handle(e.target.files[0])} />
        <div className="dz-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="6" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M22 4v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M28 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M13 20h14M13 25h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="dz-label">{drag ? "Drop it!" : "Drop PDF or DOCX here"}</p>
        <p className="dz-sub">or click to browse · max 16 MB</p>
      </div>

      <div className="capabilities">
        {[
          ["EI", "External Inputs", "Forms, uploads, writes"],
          ["EO", "External Outputs", "Reports, exports, computed"],
          ["EQ", "External Inquiries", "Lookups, reads, searches"],
          ["ILF", "Internal Logical Files", "Entities, tables, data stores"],
          ["EIF", "External Interface Files", "3rd-party data sources"],
        ].map(([code, label, desc]) => (
          <div key={code} className="cap-card">
            <span className="cap-code" style={{ color: `var(--${code})` }}>{code}</span>
            <span className="cap-label">{label}</span>
            <span className="cap-desc">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
