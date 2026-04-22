// frontend/src/components/Header.jsx
import { useTheme }   from "../hooks/useTheme";
import ThemeToggle    from "./ThemeToggle";
import { useAuth }    from "../context/AuthContext";
import "./Header.css";

export default function Header({ onLoginClick }) {
  const { theme, toggle } = useTheme();
  const { user, logout }  = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <div className="logo">
          <span className="logo-bracket">[</span>
          <span className="logo-text">FP</span>
          <span className="logo-accent">Estimator</span>
          <span className="logo-bracket">]</span>
        </div>

        {/* Right side */}
        <div className="header-meta">
          <span className="badge">Groq · llama3-70b</span>
          <span className="badge badge-green">IFPUG Standard</span>

          {/* Theme toggle — gọi useTheme ngay tại đây */}
          <ThemeToggle theme={theme} onToggle={toggle} />

          {/* Auth */}
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
