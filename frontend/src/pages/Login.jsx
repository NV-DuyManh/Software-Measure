// frontend/src/pages/Login.jsx
import { useState } from "react";
import { apiLogin, saveToken, saveUser } from "../utils/auth";
import "./AuthPages.css";

export default function Login({ onSuccess, onGoRegister }) {
  const [form, setForm]     = useState({ username: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLogin(form);
      saveToken(data.token);
      saveUser(data.user);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-bracket">[</span>
          <span className="logo-text">FP</span>
          <span className="logo-accent">Estimator</span>
          <span className="logo-bracket">]</span>
        </div>
        <h2 className="auth-title">Sign In</h2>
        <p className="auth-sub">Access your FP analysis history</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              placeholder="your_username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <button className="link-btn" onClick={onGoRegister}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
