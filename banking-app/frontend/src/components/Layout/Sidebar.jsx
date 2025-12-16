import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/layout.css';

const Sidebar = () => {
  const location = useLocation();
  const { demoMode } = useAuth();

  const menuItems = [
    {
      path: '/dashboard',
      icon: '💰',
      label: 'Tableau de bord',
      description: 'Vue d\'ensemble'
    },
    {
      path: '/transactions',
      icon: '📊',
      label: 'Transactions',
      description: 'Historique'
    },
    {
      path: '/transfer',
      icon: '↗️',
      label: 'Virement',
      description: 'Envoyer de l\'argent'
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">🏦</div>
          <div className="logo-text">
            <h2>NEO Bank</h2>
            <span className="logo-subtitle">Sécurisé</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <div className="nav-icon">{item.icon}</div>
            <div className="nav-info">
              <span className="nav-label">{item.label}</span>
              <span className="nav-description">{item.description}</span>
            </div>
          </Link>
        ))}
      </nav>

      {demoMode && (
        <div className="demo-notice-sidebar">
          <div className="demo-indicator"></div>
          <span>Mode Démo Actif</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;