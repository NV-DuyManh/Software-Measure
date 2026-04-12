import "./FPChart.css";

const COLORS = {
  EI: "#00d4ff",
  EO: "#00ff88",
  EQ: "#a78bfa",
  ILF: "#ff6b35",
  EIF: "#ffd93d",
};

const WEIGHTS = { EI: 4, EO: 5, EQ: 4, ILF: 10, EIF: 7 };

export default function FPChart({ counts, weights }) {
  const components = Object.keys(counts);
  const pts = components.map((k) => counts[k] * (weights[k] || WEIGHTS[k]));
  const total = pts.reduce((a, b) => a + b, 0) || 1;
  const maxPts = Math.max(...pts, 1);

  // Donut chart params
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const arcs = components.map((key, i) => {
    const fraction = pts[i] / total;
    const dash = fraction * circumference;
    const arc = { key, dash, offset, color: COLORS[key], fraction };
    offset += dash;
    return arc;
  });

  return (
    <div className="chart-wrap">
      {/* Donut */}
      <div className="donut-section">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="18" />
          {arcs.map(({ key, dash, offset: off, color }) => (
            <circle
              key={key}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-off + circumference / 4}
              strokeLinecap="butt"
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize="18" fontWeight="800" fontFamily="Syne, sans-serif">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="JetBrains Mono, monospace">
            UFC pts
          </text>
        </svg>

        <div className="legend">
          {components.map((key, i) => (
            <div key={key} className="legend-item">
              <span className="legend-dot" style={{ background: COLORS[key] }} />
              <span className="legend-key">{key}</span>
              <span className="legend-val">{pts[i]} pts</span>
              <span className="legend-pct">{total > 0 ? Math.round((pts[i] / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="bars">
        {components.map((key, i) => (
          <div key={key} className="bar-row">
            <span className="bar-key" style={{ color: COLORS[key] }}>{key}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(pts[i] / maxPts) * 100}%`,
                  background: COLORS[key],
                  transition: "width 0.6s cubic-bezier(.16,1,.3,1)",
                }}
              />
            </div>
            <span className="bar-count">{counts[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
