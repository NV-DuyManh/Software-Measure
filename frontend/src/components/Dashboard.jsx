// frontend/src/components/Dashboard.jsx
import { useState } from "react";
import { recalculate, updateResult } from "../utils/api";
import FPChart    from "./FPChart";
import VafEditor  from "./VafEditor";
import "./Dashboard.css";

const COMPONENTS = ["EI", "EO", "EQ", "ILF", "EIF"];
const LABELS = {
  EI:  "External Input",
  EO:  "External Output",
  EQ:  "External Inquiry",
  ILF: "Internal Logical File",
  EIF: "External Interface File",
};

const DEFAULT_VAF_FACTORS = {
  f1:0, f2:0, f3:0, f4:0,  f5:0,  f6:0,  f7:0,
  f8:0, f9:0, f10:0,f11:0, f12:0, f13:0, f14:0,
};

export default function Dashboard({ data, onReset, resultId, uploadId }) {
  const [counts,     setCounts]     = useState({ ...data.counts });
  const [metrics,    setMetrics]    = useState(data);
  const [vafFactors, setVafFactors] = useState(
    data.vaf_factors && Object.keys(data.vaf_factors).length > 0
      ? data.vaf_factors
      : { ...DEFAULT_VAF_FACTORS }
  );
  const [loading,    setLoading]    = useState(false);

  async function handleRecalc() {
    setLoading(true);
    try {
      if (resultId) {
        // Đã đăng nhập → lưu vào DB + tính lại
        const payload = {
          ei_count:  counts.EI,
          eo_count:  counts.EO,
          eq_count:  counts.EQ,
          ilf_count: counts.ILF,
          eif_count: counts.EIF,
          ...vafFactors,
        };
        const updated = await updateResult(resultId, payload);
        setMetrics(prev => ({
          ...prev,
          ufc:    updated.ufc,
          vaf:    updated.vaf,
          fp:     updated.fp,
          effort: updated.effort,
          time:   updated.time_months,
          cost:   updated.cost,
          counts: {
            EI:  updated.EI  ?? counts.EI,
            EO:  updated.EO  ?? counts.EO,
            EQ:  updated.EQ  ?? counts.EQ,
            ILF: updated.ILF ?? counts.ILF,
            EIF: updated.EIF ?? counts.EIF,
          },
        }));
      } else {
        // Chưa đăng nhập → chỉ tính local qua Python
        const updated = await recalculate(counts);
        setMetrics(updated);
      }
    } catch (e) {
      alert("Recalculation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, val) {
    const n = Math.max(0, parseInt(val) || 0);
    setCounts(prev => ({ ...prev, [key]: n }));
  }

  const kpis = [
    { label: "Function Points", value: metrics.fp,                          unit: "FP",               color: "var(--accent)"  },
    { label: "Effort",          value: metrics.effort,                      unit: "person-months",    color: "var(--accent2)" },
    { label: "Time",            value: metrics.time ?? metrics.time_months, unit: "calendar months",  color: "var(--EQ)"      },
    { label: "Cost",            value: `$${Number(metrics.cost).toLocaleString()}`, unit: "USD",      color: "var(--accent3)" },
  ];

  return (
    <div className="dashboard">
      {/* Top bar */}
      <div className="dash-topbar">
        <div className="dash-file">
          {data.filename && (
            <span className="file-chip">📄 {data.filename}</span>
          )}
          {data.chunks_processed > 0 && (
            <span className="chunk-info">
              {data.chunks_processed} chunk(s) analyzed
            </span>
          )}
          {data.chunks_failed > 0 && (
            <span className="chunk-warn">
              ⚠ {data.chunks_failed} failed
            </span>
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

      {/* Chart + Editor */}
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
            <span className="mono-val">{Number(metrics.vaf).toFixed(3)}</span>
            <span className="mono-op">=</span>
            <span className="mono-label accent">FP</span>
            <span className="mono-val accent">{metrics.fp}</span>
          </div>
        </div>

        {/* Right: Component editor */}
        <div className="editor-panel">
          <h3 className="panel-title">Edit &amp; Recalculate</h3>
          <p className="panel-sub">
            Adjust AI-detected counts and VAF factors, then recalculate.
          </p>

          <div className="component-list">
            {COMPONENTS.map((key) => (
              <div key={key} className="comp-row">
                <div className="comp-info">
                  <span className="comp-code" style={{ color: `var(--${key})` }}>
                    {key}
                  </span>
                  <span className="comp-name">{LABELS[key]}</span>
                  <span className="comp-weight">
                    ×{metrics.weights[key]} pts
                  </span>
                </div>
                <div className="comp-controls">
                  <button
                    className="stepper"
                    onClick={() => handleChange(key, counts[key] - 1)}
                  >−</button>
                  <input
                    type="number"
                    min="0"
                    value={counts[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className="count-input"
                  />
                  <button
                    className="stepper"
                    onClick={() => handleChange(key, counts[key] + 1)}
                  >+</button>
                </div>
                <span className="comp-pts">
                  {counts[key] * metrics.weights[key]} pts
                </span>
              </div>
            ))}
          </div>

          <button
            className="btn-primary recalc-btn"
            onClick={handleRecalc}
            disabled={loading}
          >
            {loading ? "Recalculating…" : "Recalculate →"}
          </button>
        </div>
      </div>

      {/* VAF Editor — full width below */}
      <VafEditor
        factors={vafFactors}
        onChange={setVafFactors}
      />
    </div>
  );
}
