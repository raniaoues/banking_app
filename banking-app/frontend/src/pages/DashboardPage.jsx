import React from 'react';
import Balance from '../components/Balance';
import Transactions from '../components/Transactions';
import Transfer from '../components/Transfer';
import { useAuth } from '../context/AuthContext';
import '../styles/pages.css';

const DashboardPage = () => {
  const { user, demoMode } = useAuth();

  const displayName =
    user?.prenom ||
    user?.firstName ||
    user?.nom ||
    user?.lastName ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Utilisateur';

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h2>Bonjour, {displayName} 👋</h2>
        <p>Bienvenue sur votre espace bancaire sécurisé</p>

        
      </div>

      <div className="page-content">
        <div className="dashboard-grid">
          <div className="grid-column">
            <Balance />
            <Transfer />
          </div>
          <div className="grid-column">
            <Transactions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
