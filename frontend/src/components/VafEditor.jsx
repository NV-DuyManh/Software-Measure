// frontend/src/components/VafEditor.jsx
import "./VafEditor.css";

const GSC_LABELS = [
  "Data communications",
  "Distributed data processing",
  "Performance",
  "Heavily used configuration",
  "Transaction rate",
  "Online data entry",
  "End-user efficiency",
  "Online update",
  "Complex processing",
  "Reusability",
  "Installation ease",
  "Operational ease",
  "Multiple sites",
  "Facilitate change",
];

export default function VafEditor({ factors, onChange }) {
  const sumFi = Object.values(factors).reduce((s, v) => s + Number(v), 0);
  const vaf   = (0.65 + 0.01 * sumFi).toFixed(3);

  function handleChange(key, value) {
    const v = Math.max(0, Math.min(5, parseInt(value) || 0));
    onChange({ ...factors, [key]: v });
  }

  return (
    <div className="vaf-editor">
      <div className="vaf-header">
        <span className="vaf-title">
          VAF — 14 General System Characteristics
        </span>
        <div className="vaf-result">
          <span className="vaf-formula">
            0.65 + (0.01 × {sumFi}) =
          </span>
          <span className="vaf-value">{vaf}</span>
        </div>
      </div>

      <div className="vaf-grid">
        {GSC_LABELS.map((label, i) => {
          const key = `f${i + 1}`;
          const val = Number(factors[key] ?? 0);
          return (
            <div key={key} className="vaf-row">
              <span className="vaf-fi">F{i + 1}</span>
              <span className="vaf-label" title={label}>{label}</span>
              <div className="vaf-controls">
                <button
                  className="vaf-btn"
                  onClick={() => handleChange(key, val - 1)}
                  disabled={val <= 0}
                >−</button>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={val}
                  className="vaf-input"
                  onChange={e => handleChange(key, e.target.value)}
                />
                <button
                  className="vaf-btn"
                  onClick={() => handleChange(key, val + 1)}
                  disabled={val >= 5}
                >+</button>
              </div>
              <div className="vaf-dots">
                {[0, 1, 2, 3, 4].map(d => (
                  <span
                    key={d}
                    className={`vaf-dot ${val > d ? "filled" : ""}`}
                    onClick={() => handleChange(key, val === d + 1 ? d : d + 1)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
