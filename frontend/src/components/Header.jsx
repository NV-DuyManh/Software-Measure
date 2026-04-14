import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-bracket">[</span>
          <span className="logo-text">FP</span>
          <span className="logo-accent">Estimator</span>
          <span className="logo-bracket">]</span>
        </div>
        <div className="header-meta">
          <span className="badge">Gemini · 3.0 Flash</span>
          <span className="badge badge-green">IFPUG Standard</span>
        </div>
      </div>
      <div className="header-line" />
    </header>
  );
}