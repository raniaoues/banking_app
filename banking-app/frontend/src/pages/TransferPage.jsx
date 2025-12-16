import React from 'react';
import Transfer from '../components/Transfer';
import { useAuth } from '../context/AuthContext';
import '../styles/pages.css';

const TransferPage = () => {
  const { demoMode } = useAuth();

  return (
    <div className="page transfer-page">
      <div className="page-header">
        <h1>Virements bancaires</h1>
        <p className="page-subtitle">
          Effectuez des transferts d'argent sécurisés
        </p>
        
        {demoMode && (
          <div className="demo-banner">
            <span className="demo-pulse"></span>
            <strong>Mode Démo</strong> - Les virements sont simulés
          </div>
        )}
      </div>

      <div className="page-content">
        <Transfer />
        
        <div className="transfer-guidelines">
          <div className="guideline-card">
            <h3>📋 Règles de sécurité des virements</h3>
            <ul>
              <li>Vérifiez toujours l'email du bénéficiaire</li>
              <li>Le montant minimum est de 0.01 €</li>
              <li>Les virements sont instantanés entre utilisateurs NEO Bank</li>
              <li>Vous recevrez une confirmation par email</li>
              <li>En cas d'erreur, contactez immédiatement le support</li>
            </ul>
          </div>
          
          <div className="guideline-card">
            <h3>🛡️ Protection contre la fraude</h3>
            <ul>
              <li>Ne transférez jamais d'argent à des inconnus</li>
              <li>Méfiez-vous des emails suspects demandant des virements</li>
              <li>Vérifiez toujours l'identité du bénéficiaire</li>
              <li>Utilisez des descriptions claires pour chaque virement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferPage;