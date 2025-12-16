import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { accountAPI } from '../services/api';
import '../styles/components.css';

const Balance = () => {
  const [balance, setBalance] = useState(0);
  const [rib, setRib] = useState('');
  const [loading, setLoading] = useState(true);
  const { demoMode, user } = useAuth(); // 🔴 SUPPRIMEZ `token` d'ici

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    if (demoMode) {
      setBalance(2450.75);
      setRib("FR76 3000 1000 0100 1234 5678 901");
      setLoading(false);
      return;
    }

    try {
      // ✅ CORRECTION : Appelez sans token
      const result = await accountAPI.getBalance();
      
      // La réponse est maintenant un objet avec success, balance, etc.
      if (result.success) {
        setBalance(result.balance || 0);
        setRib(result.data?.rib || user?.rib || '');
      } else {
        console.error('Échec de la récupération du solde:', result.error);
        // Option: afficher un message à l'utilisateur
      }
    } catch (error) {
      console.error('Erreur lors du chargement du solde:', error);
      // Option: gérer l'erreur (redirection vers login, etc.)
    } finally {
      setLoading(false);
    }
  };

  // ... reste du code inchangé ...

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('RIB copié dans le presse-papier !');
    });
  };

  if (loading) {
    return (
      <div className="balance-card balance-loading">
        <div className="loading-spinner" style={{margin: '0 auto 16px'}}></div>
        <p>Chargement du solde...</p>
      </div>
    );
  }

  const getBalanceClass = () => {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'neutral';
  };

  return (
    <div className={`balance-card ${getBalanceClass()}`}>
      <div className="balance-header">
        <h3>Solde actuel</h3>
        {demoMode && <span className="demo-tag">Mode Démo</span>}
      </div>
      
      <div className="balance-amount">
        {balance.toFixed(2)} TND
      </div>
      
      <div className="balance-trend">
        {balance > 0 && (
          <>
            <span className="trend-up">↗</span>
            <span>Solde positif</span>
          </>
        )}
        {balance < 0 && (
          <>
            <span className="trend-down">↘</span>
            <span>Solde négatif</span>
          </>
        )}
        {balance === 0 && (
          <>
            <span className="trend-neutral"></span>

          </>
        )}
      </div>

      {/* Section RIB */}
      <div className="rib-section">
        <div className="rib-label">Votre RIB</div>
        <div className="rib-display">
          <span className="rib-number">{rib}</span>
          <button 
            className="rib-copy-btn"
            onClick={() => copyToClipboard(rib)}
            title="Copier le RIB"
          >
            📋 Copier
          </button>
        </div>
        <div className="rib-hint">Utilisez ce RIB pour recevoir des virements</div>
      </div>

    </div>
  );
};

export default Balance;