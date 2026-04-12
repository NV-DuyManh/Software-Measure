import { useState } from "react";
import { recalculate } from "../utils/api";
import FPChart from "./FPChart";
import "./Dashboard.css";

const COMPONENTS = ["EI", "EO", "EQ", "ILF", "EIF"];
const LABELS = {
  EI: "External Input",
  EO: "External Output",
  EQ: "External Inquiry",
  ILF: "Internal Logical File",
  EIF: "External Interface File",
};

export default function Dashboard({ data, onReset }) {
  const [counts, setCounts] = useState({ ...data.counts });
  const [metrics, setMetrics] = useState(data);
  const [loading, setLoading] = useState(false);

  async function handleRecalc() {
    setLoading(true);
    try {
      const updated = await recalculate(counts);
      setMetrics(updated);
    } catch (e) {
      alert("Recalculation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, val) {
    const n = Math.max(0, parseInt(val) || 0);
    setCounts((prev) => ({ ...prev, [key]: n }));
  }

  const kpis = [
    { label: "Function Points", value: metrics.fp, unit: "FP", color: "var(--accent)" },
    { label: "Effort", value: metrics.effort, unit: "person-months", color: "var(--accent2)" },
    { label: "Time", value: metrics.time, unit: "calendar months", color: "var(--EQ)" },
    { label: "Cost", value: `$${metrics.cost.toLocaleString()}`, unit: "USD", color: "var(--accent3)" },
  ];

  return (
    <div className="dashboard">
      <div className="dash-topbar">
        <div className="dash-file">
          <span className="file-chip">📄 {data.filename}</span>
          <span className="chunk-info">{data.chunks_processed} chunk(s) analyzed</span>
          {data.chunks_failed > 0 && (
            <span className="chunk-warn">⚠ {data.chunks_failed} failed</span>
          )}
        </div>
        <button className="btn-ghost" onClick={onReset}>← New Analysis</button>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        {kpis.map(({ label, value, unit, color }) => (
          <div key={label} className="kpi-card">
            <span className="kpi-label">{label}</span>
            <span className="kpi-value" style={{ color }}>{value}</span>
            <span className="kpi-unit">{unit}</span>
          </div>
        ))}
      </div>

      <div className="dash-body">
        {/* Left: Chart */}
        <div className="chart-panel">
          <h3 className="panel-title">Component Distribution</h3>
          <FPChart counts={metrics.counts} weights={metrics.weights} />
          <div className="formula-box">
            <span className="mono-label">UFC</span>
            <span className="mono-val">{metrics.ufc}</span>
            <span className="mono-op">×</span>
            <span className="mono-label">VAF</span>
            <span className="mono-val">{metrics.vaf}</span>
            <span className="mono-op">=</span>
            <span className="mono-label accent">FP</span>
            <span className="mono-val accent">{metrics.fp}</span>
          </div>
        </div>

        {/* Right: Editor */}
        <div className="editor-panel">
          <h3 className="panel-title">Edit & Recalculate</h3>
          <p className="panel-sub">Adjust AI-detected counts and recompute instantly.</p>

          <div className="component-list">
            {COMPONENTS.map((key) => (
              <div key={key} className="comp-row">
                <div className="comp-info">
                  <span className="comp-code" style={{ color: `var(--${key})` }}>{key}</span>
                  <span className="comp-name">{LABELS[key]}</span>
                  <span className="comp-weight">×{metrics.weights[key]} pts</span>
                </div>
                <div className="comp-controls">
                  <button className="stepper" onClick={() => handleChange(key, counts[key] - 1)}>−</button>
                  <input
                    type="number"
                    min="0"
                    value={counts[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="count-input"
                  />
                  <button className="stepper" onClick={() => handleChange(key, counts[key] + 1)}>+</button>
                </div>
                <span className="comp-pts">{counts[key] * metrics.weights[key]} pts</span>
              </div>
            ))}
          </div>

          <button className="btn-primary recalc-btn" onClick={handleRecalc} disabled={loading}>
            {loading ? "Recalculating…" : "Recalculate →"}
          </button>
        </div>
      </div>
    </div>
  );
}
