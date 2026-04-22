// frontend/src/components/ThemeToggle.jsx
import "./ThemeToggle.css";

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun icon */}
      <svg
        className={`toggle-icon icon-sun ${isDark ? "icon-hide" : "icon-show"}`}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path
          d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15
             M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06
             M11.89 4.11l-1.06 1.06M4.11 11.89 3.05 12.95"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Track */}
      <div className={`toggle-track ${isDark ? "on" : ""}`}>
        <div className="toggle-knob" />
      </div>

      {/* Moon icon */}
      <svg
        className={`toggle-icon icon-moon ${isDark ? "icon-show" : "icon-hide"}`}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
