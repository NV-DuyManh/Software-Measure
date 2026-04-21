// frontend/src/pages/History.jsx
import { useState, useEffect } from "react";
import { apiGetHistory } from "../utils/auth";
import "./History.css";

export default function History({ user, onBack }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    apiGetHistory()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="history-wrap">
      {/* Top bar */}
      <div className="history-topbar">
        <div>
          <h2 className="history-title">Analysis History</h2>
          <p className="history-sub">Logged in as <strong>{user?.username}</strong></p>
        </div>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
      </div>

      {/* States */}
      {loading && <p className="history-status">Loading history…</p>}
      {error   && <p className="history-status error">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="history-empty">
          <p>No analyses saved yet.</p>
          <p className="history-sub">Upload a document to get started.</p>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>File</th>
                <th>EI</th>
                <th>EO</th>
                <th>EQ</th>
                <th>ILF</th>
                <th>EIF</th>
                <th>UFC</th>
                <th>FP</th>
                <th>Effort</th>
                <th>Time</th>
                <th>Cost</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id}>
                  <td className="mono">{idx + 1}</td>
                  <td className="file-cell" title={row.filename}>{row.filename}</td>
                  <td className="mono ei">{row.ei}</td>
                  <td className="mono eo">{row.eo}</td>
                  <td className="mono eq">{row.eq}</td>
                  <td className="mono ilf">{row.ilf}</td>
                  <td className="mono eif">{row.eif}</td>
                  <td className="mono">{row.ufc}</td>
                  <td className="mono accent">{row.fp}</td>
                  <td className="mono">{row.effort}<span className="unit">pm</span></td>
                  <td className="mono">{row.time_months}<span className="unit">mo</span></td>
                  <td className="mono">${Number(row.cost).toLocaleString()}</td>
                  <td className="date-cell">{new Date(row.analyzed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
