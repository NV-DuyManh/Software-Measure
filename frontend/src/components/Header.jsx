import { useTheme } from "../hooks/useTheme";
import ThemeToggle from "./ThemeToggle";
import "./Header.css";

export default function Header({ user, onLogin, onLogout, onHistory }) {
  const { theme, cycleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-inner">
        {/* Phần Logo nằm bên trái */}
        <div className="logo">
          <span className="logo-bracket">[</span>
          <span className="logo-text">FP</span>
          <span className="logo-accent">Estimator</span>
          <span className="logo-bracket">]</span>
        </div>

        {/* Phần Meta nằm bên phải */}
        <div className="header-meta">
          <span className="badge">Gemini · 3.0 Flash</span>
          <span className="badge badge-green">IFPUG Standard</span>
          <ThemeToggle theme={theme} onToggle={cycleTheme} />

          {user ? (
            <>
              <button className="badge" style={{ cursor: "pointer" }} onClick={onHistory}>
                📋 {user.username}
              </button>
              <button className="badge" style={{ cursor: "pointer" }} onClick={onLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <button className="badge" style={{ cursor: "pointer" }} onClick={onLogin}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}