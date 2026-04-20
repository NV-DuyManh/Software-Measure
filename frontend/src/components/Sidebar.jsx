// frontend/src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import { getHistory, deleteHistory } from "../utils/api";
import "./Sidebar.css";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    month: "short",
    day:   "numeric",
    hour:  "2-digit",
    minute:"2-digit",
  });
}

export default function Sidebar({ onSelectUpload, activeUploadId }) {
  const [open,    setOpen]    = useState(true);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { history } = await getHistory();
      setHistory(history);
    } catch {
      // Chưa đăng nhập → bỏ qua
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(e, uploadId) {
    e.stopPropagation();
    if (!confirm("Xóa phân tích này?")) return;
    try {
      await deleteHistory(uploadId);
      setHistory(h => h.filter(i => i.upload_id !== uploadId));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <aside className={`sidebar ${open ? "open" : "collapsed"}`}>
      <div className="sidebar-header">
        {open && <span className="sidebar-title">Lịch sử</span>}
        <button
          className="sidebar-toggle"
          onClick={() => setOpen(o => !o)}
          title={open ? "Thu gọn" : "Mở rộng"}
        >
          {open ? "‹" : "›"}
        </button>
      </div>

      {open && (
        <div className="sidebar-body">
          <button
            className="sidebar-refresh"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Đang tải…" : "↺  Làm mới"}
          </button>

          {history.length === 0 && !loading && (
            <p className="sidebar-empty">Chưa có phân tích nào.</p>
          )}

          <ul className="history-list">
            {history.map(item => (
              <li
                key={item.upload_id}
                className={`history-item ${activeUploadId === item.upload_id ? "active" : ""}`}
                onClick={() => onSelectUpload(item.upload_id)}
              >
                <div className="hi-name" title={item.original_name}>
                  {item.original_name}
                </div>
                <div className="hi-meta">
                  <span className="hi-fp">
                    {item.fp != null ? `${item.fp} FP` : "—"}
                  </span>
                  <span className="hi-date">
                    {formatDate(item.uploaded_at)}
                  </span>
                </div>
                <button
                  className="hi-delete"
                  onClick={e => handleDelete(e, item.upload_id)}
                  title="Xóa"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
