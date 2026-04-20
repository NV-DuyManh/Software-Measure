// frontend/src/components/AuthModal.jsx
import { useState } from "react";
import { login, register } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./AuthModal.css";

export default function AuthModal({ onClose }) {
  const [mode,  setMode]  = useState("login");
  const [form,  setForm]  = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);
  const { storeAuth } = useAuth();

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      let data;
      if (mode === "login") {
        data = await login(form.email, form.password);
      } else {
        data = await register(form.username, form.email, form.password);
      }
      storeAuth(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-header">
          <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
          <button className="auth-close" onClick={onClose}>×</button>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="auth-field">
              <label>Username</label>
              <input
                name="username"
                type="text"
                required
                placeholder="your name"
                value={form.username}
                onChange={handleChange}
              />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              minLength={6}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={busy}
          >
            {busy
              ? "Please wait…"
              : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
