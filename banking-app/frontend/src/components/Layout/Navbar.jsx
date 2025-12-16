import React from "react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/layout.css";

const Navbar = () => {
  const { user, logoutUser } = useAuth();

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
      <div
        className="navbar-content"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center", // aligne verticalement tous les enfants
          flexWrap: "wrap",     // pour que ça reste responsive si petit écran
        }}
      >
        {/* Left side */}
        <div className="navbar-welcome">
          <h1>Bonjour, {displayName} 👋</h1>
          <p>Bienvenue sur votre espace bancaire sécurisé</p>
          {user?.phone && (
            <div className="user-phone">
              <span>📱 {user.phone}</span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div
          className="navbar-actions"
          style={{
            display: "flex",
            alignItems: "center", // tous les éléments sur la même ligne
            gap: "15px",           // espace entre email et bouton
          }}
        >
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
