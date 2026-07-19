import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate("/", { replace: true });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-rim rim-pattern" />
      <div className="login-card">
        <div className="login-emblem">
          {/* Simple dhol drum motif */}
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <ellipse cx="28" cy="12" rx="18" ry="7" fill="#E8A33D" />
            <rect x="10" y="12" width="36" height="30" rx="4" fill="#6B1420" />
            <ellipse cx="28" cy="44" rx="18" ry="7" fill="#8A1F2D" />
            <line x1="12" y1="16" x2="14" y2="40" stroke="#E8A33D" strokeWidth="2" />
            <line x1="44" y1="16" x2="42" y2="40" stroke="#E8A33D" strokeWidth="2" />
            <line x1="22" y1="14" x2="20" y2="42" stroke="#E8A33D" strokeWidth="1.5" opacity="0.6" />
            <line x1="34" y1="14" x2="36" y2="42" stroke="#E8A33D" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>
        <h1>Pathak Attendance</h1>
        <p className="login-subtitle">Sign in to manage Dhol &amp; Tasha attendance</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
