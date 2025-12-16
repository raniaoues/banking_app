// Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext'; 
import '../styles/components.css';

const MAX_ATTEMPTS = 3;

const Login = () => {
  const { loginUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ❌ Tentatives NON persistantes → reset à chaque reload
  const [attempts, setAttempts] = useState(0);

  // ❌ Blocage NON permanent → reset à chaque reload
  const [isBlocked, setIsBlocked] = useState(false);

  const navigate = useNavigate();

  // ───────── CSRF INIT ─────────
  useEffect(() => {
    fetch("http://127.0.0.1:8000/auth/csrf/", {
      method: "GET",
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.csrftoken) localStorage.setItem("csrftoken", data.csrftoken);
      })
      .catch(() => {});
  }, []);

  // ───────── HANDLE SUBMIT ─────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isBlocked) {
      setError("⛔ Compte bloqué. Veuillez réessayer plus tard.");
      return;
    }

    setLoading(true);

    try {
      const result = await authAPI.login(email, password);

      if (result.success === true) {
        // ✔️ Reset des tentatives et du blocage
        setAttempts(0);
        setIsBlocked(false);

        loginUser(result.data.user);
        localStorage.setItem("user", JSON.stringify(result.data.user));

        navigate("/dashboard");

      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsBlocked(true);
          setError("⛔ Compte bloqué. Veuillez réessayer plus tard.");
        } else {
          setError(`Email ou mot de passe incorrect. Tentatives restantes : ${MAX_ATTEMPTS - newAttempts}`);
        }
      }

    } catch (err) {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-card">

          <div className="login-header">
            <div className="login-logo">
              <div className="logo-icon">🏦</div>
              <h1>NEO Bank</h1>
            </div>
            <p className="login-subtitle">Connexion sécurisée à votre account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                disabled={loading || isBlocked}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                disabled={loading || isBlocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || isBlocked}
              className="login-button"
            >
              {loading ? "Connexion..." : isBlocked ? "Compte bloqué" : "Se connecter"}
            </button>
          </form>

          <div className="login-footer">
            <p>Pas de compte ? <a href="/signup">Créer un compte</a></p>
            <p className="security-note">🔒 Sécurisé par TLS/SSL</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
  