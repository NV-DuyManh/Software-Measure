// frontend/src/components/UploadZone.jsx
import { useState, useRef } from "react";
import "./UploadZone.css";

const STEPS = [
  { icon: "📄", text: "Extracting text from document…" },
  { icon: "🔍", text: "Cleaning and chunking content…" },
  { icon: "🤖", text: "Sending to Gemini AI…" },
  { icon: "🏷️", text: "Classifying functional components…" },
  { icon: "🧮", text: "Computing Function Points…" },
  { icon: "💾", text: "Saving to database…" },
];

export default function UploadZone({ onFile, isLoading, loadingStep }) {
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

  // Tìm step index hiện tại dựa vào text
  const currentStepIndex = STEPS.findIndex(s => s.text === loadingStep);
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="upload-wrap">
      {/* ── Hero text (ẩn khi đang loading) ── */}
      <div className={`upload-hero ${isLoading ? "hero-hidden" : ""}`}>
        <h1>
          Function Point<br />
          <span className="gradient-text">Estimation</span>
        </h1>
        <p className="upload-sub">
          Upload an SRS document and receive an AI-powered Function Point
          analysis using the IFPUG standard.
        </p>
      </div>

      {/* ── Drop zone (ẩn khi đang loading) ── */}
      {!isLoading && (
        <div
          className={`dropzone ${drag ? "drag-active" : ""}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            hidden
            onChange={e => handle(e.target.files[0])}
          />
          <div className="dz-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="4" width="22" height="28" rx="3"
                stroke="currentColor" strokeWidth="1.5" />
              <path d="M22 4v8h8" stroke="currentColor"
                strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M28 4l6 6" stroke="currentColor"
                strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M13 20h14M13 25h10" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="dz-label">
            {drag ? "Drop it!" : "Drop PDF or DOCX here"}
          </p>
          <p className="dz-sub">or click to browse · max 16 MB</p>
        </div>
      )}

      {/* ── LOADING STATE — thay thế dropzone, cùng vị trí ── */}
      {isLoading && (
        <div className="loading-zone">
          {/* Spinner */}
          <div className="lz-spinner-wrap">
            <div className="lz-spinner">
              <div className="lz-ring lz-ring-outer" />
              <div className="lz-ring lz-ring-middle" />
              <div className="lz-ring lz-ring-inner" />
            </div>
          </div>

          {/* Current step text */}
          <p className="lz-step-text">
            <span className="lz-step-icon">
              {STEPS[activeIndex]?.icon}
            </span>
            {loadingStep || "Analyzing…"}
          </p>

          {/* Progress dots */}
          <div className="lz-dots">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`lz-dot ${
                  i < activeIndex ? "done" :
                  i === activeIndex ? "active" : ""
                }`}
              />
            ))}
          </div>

          {/* Step list */}
          <div className="lz-steps">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`lz-step-row ${
                  i < activeIndex ? "step-done" :
                  i === activeIndex ? "step-active" : "step-pending"
                }`}
              >
                <span className="lz-step-check">
                  {i < activeIndex ? "✓" : i === activeIndex ? "›" : "·"}
                </span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Capability cards (ẩn khi đang loading) ── */}
      {!isLoading && (
        <div className="capabilities">
          {[
            ["EI", "External Inputs",      "Forms, uploads, writes"],
            ["EO", "External Outputs",     "Reports, exports, computed"],
            ["EQ", "External Inquiries",   "Lookups, reads, searches"],
            ["ILF", "Internal Logical Files", "Entities, tables, data stores"],
            ["EIF", "External Interface Files", "3rd-party data sources"],
          ].map(([code, label, desc]) => (
            <div key={code} className="cap-card">
              <span className="cap-code" style={{ color: `var(--${code})` }}>
                {code}
              </span>
              <span className="cap-label">{label}</span>
              <span className="cap-desc">{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
