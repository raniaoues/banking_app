import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/components.css';
import { authAPI } from '../services/api';

const PasswordCriteria = ({ ok, text }) => (
  <div className={`pw-criterion ${ok ? 'ok' : 'bad'}`}>
    {ok ? "✅" : "❌"} <span>{text}</span>
  </div>
);

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // === 🔥 Password rules ===
  const pwRules = useMemo(() => ({
    minLength: (pw) => pw.length >= 8,
    upper: (pw) => /[A-Z]/.test(pw),
    lower: (pw) => /[a-z]/.test(pw),
    digit: (pw) => /\d/.test(pw),
    special: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)
  }), []);

  const evaluatePassword = (pw) => {
    const checks = {};
    let score = 0;

    Object.keys(pwRules).forEach(rule => {
      const ok = pwRules[rule](pw);
      checks[rule] = ok;
      if (ok) score++;
    });

    let level = 0;
    if (score <= 1) level = 0;
    else if (score === 2) level = 1;
    else if (score === 3) level = 2;
    else if (score === 4) level = 3;
    else if (score === 5) level = 4;

    return { checks, level };
  };

  const { checks: pwChecks, level: pwLevel } = evaluatePassword(formData.password);
  const passwordMatches =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  const pwColorClass = [
    "pw-very-weak",
    "pw-weak",
    "pw-medium",
    "pw-strong",
    "pw-very-strong"
  ][pwLevel];

  const isPasswordStrongEnough = pwLevel >= 2;

  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('216')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+216${cleaned.substring(1)}`;
    if (cleaned.length === 8) return `+216${cleaned}`;
    return phone;
  };

  // === Validation ===
  const validateForm = () => {
    if (formData.firstName.trim().length < 2) {
      setError("Le prénom doit contenir au moins 2 caractères");
      return false;
    }
    if (formData.lastName.trim().length < 2) {
      setError("Le nom doit contenir au moins 2 caractères");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Veuillez entrer un email valide");
      return false;
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      setError("Numéro de téléphone invalide");
      return false;
    }

    if (!isPasswordStrongEnough) {
      setError("Le mot de passe n'est pas assez fort");
      return false;
    }

    if (!passwordMatches) {
      setError("Les mots de passe ne correspondent pas");
      return false;
    }

    return true;
  };

  // === Signup Direct ===
  const handleSignup = async (userData) => {
    try {
      const result = await authAPI.register(userData);

      if (result.success) {
        const loginResult = await authAPI.login(userData.email, userData.password);

        if (loginResult.success) {
          localStorage.setItem('user_data', JSON.stringify(loginResult.user));
          setUser(loginResult.user);
          return { success: true, user: loginResult.user };
        }
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    const userData = {
      nom: formData.lastName.trim(),
      prenom: formData.firstName.trim(),
      email: formData.email.trim(),
      telephone: formatPhone(formData.phone),
      password: formData.password
    };

    const result = await handleSignup(userData);

    if (result.success) {
      alert("Compte créé avec succès !");
      navigate('/dashboard');
    } else {
      setError(result.error || "Erreur lors de l'inscription.");
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">

          <div className="login-header">
            <div className="login-logo">
              <div className="logo-icon">🏦</div>
              <h1>NEO Bank</h1>
            </div>
            <p className="login-subtitle">Créer votre compte bancaire</p>
          </div>

          <div className="signup-notice">
            <h4>📋 Informations requises</h4>
            <p>Tous les champs sont obligatoires pour créer votre compte</p>
            <p>Un RIB unique sera généré automatiquement</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">

            {error && <div className="error-message">{error}</div>}

            {/* Prénom */}
            <div className="form-group">
              <label htmlFor="firstName">Prénom *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Nom */}
            <div className="form-group">
              <label htmlFor="lastName">Nom *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Adresse email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Telephone */}
            <div className="form-group">
              <label htmlFor="phone">Téléphone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Mot de passe *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />

              {formData.password && (
                <>
                  <div className={`password-strength-bar ${pwColorClass}`}>
                    <div className={`segment ${pwLevel >= 1 ? "active" : ""}`} />
                    <div className={`segment ${pwLevel >= 2 ? "active" : ""}`} />
                    <div className={`segment ${pwLevel >= 3 ? "active" : ""}`} />
                    <div className={`segment ${pwLevel >= 4 ? "active" : ""}`} />
                  </div>

                  <div className="password-criteria">
                    <PasswordCriteria ok={pwChecks.minLength} text="8 caractères minimum" />
                    <PasswordCriteria ok={pwChecks.upper} text="Une majuscule" />
                    <PasswordCriteria ok={pwChecks.lower} text="Une minuscule" />
                    <PasswordCriteria ok={pwChecks.digit} text="Un chiffre" />
                    <PasswordCriteria ok={pwChecks.special} text="Un symbole spécial" />
                  </div>
                </>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />

              {formData.confirmPassword && (
                <div className={`password-match ${passwordMatches ? "ok" : "bad"}`}>
                  {passwordMatches
                    ? "✅ Les mots de passe correspondent"
                    : "❌ Ne correspondent pas"}
                </div>
              )}
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <div className="login-footer">
            <p className="signup-link">
              Vous avez déjà un compte ?
              <Link to="/login" className="signup-button">Se connecter</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Signup;
