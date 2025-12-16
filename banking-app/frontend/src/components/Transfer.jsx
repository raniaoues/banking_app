import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import '../styles/components.css';

const Transfer = () => {
  const [recipientRIB, setRecipientRIB] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [balance, setBalance] = useState(0);
  const { user } = useAuth();

  // Récupérer le solde pour validation
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await apiService.get('/account/balance/');
        if (response.success) {
          setBalance(response.balance || 0);
        }
      } catch (error) {
        console.error('Erreur récupération solde:', error);
      }
    };
    
    fetchBalance();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    // Validation
    if (!recipientRIB.trim()) {
      setMessage('Veuillez entrer le RIB du bénéficiaire');
      setMessageType('error');
      setLoading(false);
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      setMessage('Veuillez entrer un montant valide');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (amountNum > balance) {
      setMessage(`Solde insuffisant. Votre solde: ${balance.toFixed(2)}TND`);
      setMessageType('error');
      setLoading(false);
      return;
    }

    // MODIFICATION ICI : Validation RIB (format tunisien)
    const cleanedRIB = recipientRIB.replace(/\s/g, '').toUpperCase();
    if (!cleanedRIB.startsWith('TN') || cleanedRIB.length !== 24) {
      setMessage('RIB invalide. Format attendu: TN + 22 chiffres (ex: TN9086419656355048625449)');
      setMessageType('error');
      setLoading(false);
      return;
    }

    // MODIFICATION ICI : Vérifier que ce sont des chiffres après "TN"
    const numbers = cleanedRIB.substring(2);
    if (!/^\d+$/.test(numbers) || numbers.length !== 22) {
      setMessage('RIB invalide. Format attendu: TN + 22 chiffres (ex: TN9086419656355048625449)');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const result = await apiService.post('/transfer/', {
        recipient_rib: cleanedRIB,
        amount: amountNum,
        description: description.trim() || 'Virement bancaire',
        currency: 'TND'
      });

      console.log('Réponse virement:', result);

      if (result.success) {
        setMessage(`✅ Virement de ${amountNum.toFixed(2)}TND effectué avec succès !`);
        setMessageType('success');
        
        // Mettre à jour le solde
        setBalance(prev => prev - amountNum);
        
        // Réinitialiser le formulaire
        setRecipientRIB('');
        setAmount('');
        setDescription('');
        
        // Envoyer un event pour rafraîchir le solde ailleurs
        window.dispatchEvent(new Event('balanceUpdated'));
      } else {
        setMessage(`❌ ${result.error || 'Erreur lors du virement'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Erreur virement:', error);
      setMessage(`❌ ${error.message || 'Erreur de connexion au serveur'}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const formatRIBInput = (value) => {
    // MODIFICATION ICI : Nettoyer et formater pour format tunisien
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    let formatted = cleaned;
    
    if (cleaned.startsWith('TN') && cleaned.length >= 24) {
      // Formater en groupes de 4 caractères (sauf les 2 premiers)
      let displayRIB = cleaned;
      if (displayRIB.length > 2) {
        const groups = [];
        for (let i = 2; i < Math.min(cleaned.length, 24); i += 4) {
          groups.push(cleaned.substring(i, i + 4));
        }
        displayRIB = 'TN ' + groups.join(' ');
      }
      formatted = displayRIB;
    }
    
    return formatted;
  };

  const copyMyRIB = () => {
    const ribToCopy = user?.rib || '';
    if (!ribToCopy) {
      setMessage('RIB non disponible');
      setMessageType('error');
      return;
    }
    
    navigator.clipboard.writeText(ribToCopy)
      .then(() => {
        setMessage('RIB copié dans le presse-papier !');
        setMessageType('success');
        setTimeout(() => setMessage(''), 3000);
      })
      .catch(err => {
        console.error('Erreur copie:', err);
        setMessage('Erreur lors de la copie');
        setMessageType('error');
      });
  };

  const validateRIB = (rib) => {
    // MODIFICATION ICI : Vérification du RIB tunisien
    const cleaned = rib.replace(/\s/g, '').toUpperCase();
    
    // Vérifier la longueur totale
    if (cleaned.length !== 24) return false;
    
    // Vérifier que ça commence par TN
    if (!cleaned.startsWith('TN')) return false;
    
    // Vérifier que les 22 caractères suivants sont des chiffres
    const numbers = cleaned.substring(2);
    return /^\d{22}$/.test(numbers);
  };

  const getRIBStatus = () => {
    if (!recipientRIB) return '';
    const cleaned = recipientRIB.replace(/\s/g, '').toUpperCase();
    if (cleaned.length > 0 && !cleaned.startsWith('TN')) return 'error';
    if (cleaned.length === 24 && validateRIB(cleaned)) return 'success';
    return '';
  };

  return (
    <div className="transfer-card">
      <div className="transfer-header">
        <h3>💸 Effectuer un virement</h3>
        <div className="balance-info">
          Solde disponible: <strong>{balance.toFixed(2)} TND</strong>
        </div>
      </div>

      {/* Section RIB personnel */}
      {user?.rib && (
        <div className="my-rib-section">
          <div className="my-rib-header">
            <h4>📋 Votre RIB :</h4>
            <button 
              className="copy-rib-btn" 
              onClick={copyMyRIB}
              title="Copier mon RIB"
            >
              Copier
            </button>
          </div>
          <div className="my-rib-display">
            <code className="my-rib-number">
              {/* MODIFICATION ICI : Formater l'affichage du RIB tunisien */}
              {formatRIBInput(user.rib)}
            </code>
          </div>
          <p className="my-rib-hint">
            Donnez ce RIB pour recevoir des virements
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="transfer-form">
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="recipientRIB">
            RIB du bénéficiaire *
            {recipientRIB && (
              <span className={`rib-status ${getRIBStatus()}`}>
                {getRIBStatus() === 'success' ? '✓ Valide' : '✗ Format invalide'}
              </span>
            )}
          </label>
          <input
            type="text"
            id="recipientRIB"
            value={recipientRIB}
            onChange={(e) => setRecipientRIB(formatRIBInput(e.target.value))}
            required
            placeholder="TN9086419656355048625449" // MODIFICATION ICI
            maxLength="30" // MODIFICATION: TN + 22 chiffres + espaces
            className={getRIBStatus()}
          />
          {/* MODIFICATION ICI */}
          <small className="form-hint">
            Format: TN + 22 chiffres (ex: TN9086419656355048625449)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="amount">
            Montant (TND) *
            {amount && parseFloat(amount) > 0 && (
              <span className="amount-info">
                {parseFloat(amount) > balance ? '❌ Solde insuffisant' : '✓ Solde OK'}
              </span>
            )}
          </label>
          <div className="amount-input-wrapper">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              max={balance}
              step="0.01"
              placeholder="0.00"
              className={amount && parseFloat(amount) > balance ? 'error' : ''}
            />
            <span className="currency-symbol">TND</span>
          </div>
          <small className="form-hint">
            Minimum: 0.01 TND • Maximum: {balance.toFixed(2)} TND
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optionnel)</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Remboursement, Cadeau, Facture..."
            maxLength="100"
          />
          <small className="form-hint">
            {description.length}/100 caractères
          </small>
        </div>

        <div className="transfer-summary">
          <h4>Récapitulatif :</h4>
          <div className="summary-details">
            <div className="summary-row">
              <span>Bénéficiaire :</span>
              <span>{recipientRIB || 'Non spécifié'}</span>
            </div>
            <div className="summary-row">
              <span>Montant :</span>
              <span className="amount">{amount || '0.00'} TND</span>
            </div>
            <div className="summary-row">
              <span>Frais :</span>
              <span className="fees">Gratuit</span>
            </div>
            <div className="summary-row total">
              <span>Total à débiter :</span>
              <span className="total-amount">{amount || '0.00'} TND</span>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !recipientRIB || !amount || parseFloat(amount) > balance}
          className={`transfer-button ${loading ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Traitement en cours...
            </>
          ) : (
            '💳 Confirmer le virement'
          )}
        </button>

        <div className="security-notice">
          🔒 Virement sécurisé par cryptage SSL • Traitement immédiat
        </div>
      </form>
    </div>
  );
};

export default Transfer;