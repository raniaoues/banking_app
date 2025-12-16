import React, { useEffect, useState } from 'react';
import { accountAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const formatRIB = (rib) => {
    if (!rib || typeof rib !== 'string') return 'RIB non disponible';
    const cleanRIB = rib.replace(/\s/g, '').toUpperCase();
    if (cleanRIB.startsWith('TN')) {
      const numbers = cleanRIB.substring(2);
      const groups = numbers.match(/.{1,4}/g) || [];
      return 'TN ' + groups.join(' ');
    }
    return rib;
  };

  const determineDirection = (t) => {
    if (t.sender_id && user?.id && t.sender_id === user.id) return 'debit';
    if (t.sender_email && user?.email && t.sender_email === user.email) return 'debit';
    if (t.is_sender === true) return 'debit';
    return 'credit';
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return setTransactions([]);

      const response = await accountAPI.getTransactions(1, 10);

      if (response.success && response.transactions?.length > 0) {
        const formatted = response.transactions.map(t => {
          const direction = t.direction || determineDirection(t);
          const description =
            direction === 'debit'
              ? t.description || `Virement vers ${formatRIB(t.recipient_rib || t.counterparty_rib)}`
              : t.description || `Virement de ${t.sender_name || 'expéditeur'}`;
          return {
            id: t.id || t.reference || `tx-${Date.now()}-${Math.random()}`,
            direction,
            amount: parseFloat(t.amount) || 0,
            currency: t.currency || 'TND',
            date: t.date || t.created_at || t.completed_at || new Date().toISOString(),
            counterparty_rib: t.recipient_rib || t.counterparty_rib || 'RIB non disponible',
            description,
            status: t.status,
            reference: t.reference,
          };
        });
        setTransactions(formatted);
      } else {
        setTransactions([]); // Pas d’erreur si pas de transaction
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const handleRefresh = () => fetchTransactions();

  return (
    <div className="card transactions-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Dernières transactions</h3>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#e9ecef' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? '🔄 Chargement...' : '🔄 Rafraîchir'}
        </button>
      </div>

      {error && !loading && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          Chargement des transactions...
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>📭</div>
          <h4>Aucune transaction</h4>
          <p>{user ? "Vous n'avez pas encore effectué de transaction." : "Connectez-vous pour voir votre historique."}</p>
        </div>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {transactions.map(t => (
              <li key={t.id} style={{
                marginBottom: '12px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#fff',
                border: '1px solid #dee2e6',
                borderLeft: `4px solid ${t.direction === 'credit' ? '#28a745' : '#dc3545'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '18px', color: t.direction === 'credit' ? '#28a745' : '#dc3545' }}>
                    {t.direction === 'credit' ? '+' : '-'} {t.amount.toFixed(2)} {t.currency}
                  </strong>
                  {t.status && t.status !== 'completed' && (
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: t.status === 'pending' ? '#fff3cd' : '#f8d7da',
                      color: t.status === 'pending' ? '#856404' : '#721c24',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>{t.status}</span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#6c757d' }}>
                  {formatRIB(t.counterparty_rib)} • {new Date(t.date).toLocaleString('fr-FR')}
                </div>
                <div style={{ fontSize: '14px', color: '#495057', marginTop: '6px' }}>{t.description}</div>
                {t.reference && <div style={{ fontSize: '11px', color: '#adb5bd', fontFamily: 'monospace' }}>Réf: {t.reference}</div>}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: '20px', textAlign: 'center', paddingTop: '15px', borderTop: '1px solid #dee2e6' }}>
            <button
              onClick={() => window.location.href = '/transactions'}
              style={{
                padding: '8px 20px',
                backgroundColor: 'transparent',
                color: '#007bff',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Voir tout l'historique
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Transactions;
