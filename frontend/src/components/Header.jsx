// frontend/src/components/Header.jsx
import { useTheme }   from "../hooks/useTheme";
import ThemeToggle    from "./ThemeToggle";
import { useAuth }    from "../context/AuthContext";
import "./Header.css";

export default function Header({ onLoginClick, onNavigate, page }) {
  const { theme, cycleTheme } = useTheme(); // <-- Sửa toggle thành cycleTheme
  const { user, logout }  = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo + Nav */}
        <div className="header-left">
          <div className="logo">
            <span className="logo-bracket">[</span>
            <span className="logo-text">FP</span>
            <span className="logo-accent">Estimator</span>
            <span className="logo-bracket">]</span>
          </div>

          {/* Navigation — only when logged in */}
          {user && (
            <nav className="header-nav">
              <button
                className={`nav-link ${page === "main" ? "active" : ""}`}
                onClick={() => onNavigate("main")}
                id="nav-home"
              >
                Home
              </button>
              <button
                className={`nav-link ${page === "history" ? "active" : ""}`}
                onClick={() => onNavigate("history")}
                id="nav-history"
              >
                📋 History
              </button>
            </nav>
          )}
        </div>

        {/* Right side */}
        <div className="header-meta">
          <span className="badge">Gemini 2.5</span>
          <span className="badge badge-green">IFPUG Standard</span>

          {/* Theme toggle: truyền hàm cycleTheme vào */}
          <ThemeToggle theme={theme} onToggle={cycleTheme} />

          {/* Auth (Giữ nguyên code Claude) */}
          {user ? (
            <div className="user-area">
              <span className="user-name">{user.username}</span>
              <button
                className="btn-ghost btn-sm"
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="btn-primary btn-sm"
              onClick={onLoginClick}
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      <div className="header-line" />
    </header>
  );
}
