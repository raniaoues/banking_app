import React from "react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/layout.css";

const Navbar = () => {
  const { user, logoutUser, demoMode } = useAuth();

  const displayName =
    user?.prenom ||
    user?.firstName ||
    user?.nom ||
    user?.lastName ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "Utilisateur";

  const displayEmail = user?.email || user?.mail || user?.contact || null;

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-welcome">
          <h1>Bonjour, {displayName} 👋</h1>
          <p>Bienvenue sur votre espace bancaire sécurisé</p>

          {user?.phone && (
            <div className="user-phone">
              <span>📱 {user.phone}</span>
            </div>
          )}
        </div>

        <div className="navbar-actions">
          {demoMode && (
            <div className="demo-tag">
              <span className="demo-pulse"></span>
              Mode Démo
            </div>
          )}

          {displayEmail && (
            <div className="user-info">
              <span className="user-email">{displayEmail}</span>
            </div>
          )}

          <button onClick={logoutUser} className="logout-btn">
            <span>Déconnexion</span>
            <span className="logout-icon">→</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
