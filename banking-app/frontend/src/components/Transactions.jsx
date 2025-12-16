import React, { useEffect, useState } from 'react';
import { accountAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Transactions = ({ limit = 5 }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Formater le RIB
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

  // Déterminer la direction (debit/credit)
  const determineDirection = (transfer, currentUserId, currentUserEmail) => {
    if (transfer.sender_id && currentUserId && transfer.sender_id === currentUserId) return 'debit';
    if (transfer.sender_email && currentUserEmail && transfer.sender_email === currentUserEmail) return 'debit';
    if (transfer.is_sender === true) return 'debit';
    if (transfer.direction) return transfer.direction;
    return 'credit';
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setTransactions([]);
        return;
      }

      const response = await accountAPI.getTransactions(1, limit);

      if (response.success) {
        if (response.transactions && response.transactions.length > 0) {
          const formattedTransactions = response.transactions.map(t => {
            const direction = determineDirection(t, user.id, user.email);

            let description = t.description || 'Transaction bancaire';
            if (direction === 'debit') {
              description = t.description || `Virement vers ${formatRIB(t.counterparty_rib || t.recipient_rib || '')}`;
            } else {
              description = t.description || `Virement de ${t.sender_name || t.sender_email || 'expéditeur'}`;
            }

            const transactionDate = new Date(t.date || t.created_at || t.completed_at || new Date());
            const now = new Date();
            const diffHours = Math.floor((now - transactionDate) / (1000 * 60 * 60));

            let dateDisplay;
            if (diffHours < 24) {
              dateDisplay = `Aujourd'hui, ${transactionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            } else if (diffHours < 48) {
              dateDisplay = `Hier, ${transactionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            } else {
              dateDisplay = transactionDate.toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
              });
            }

            return {
              id: t.id || t.reference || `tx-${Date.now()}-${Math.random()}`,
              direction,
              amount: parseFloat(t.amount) || 0,
              currency: t.currency || 'TND',
              date: t.date || t.created_at || t.completed_at || new Date().toISOString(),
              dateDisplay,
              counterparty_rib: t.counterparty_rib || t.recipient_rib || 'RIB non disponible',
              description,
              status: t.status,
              reference: t.reference,
            };
          });

          setTransactions(formattedTransactions);
        } else {
          // ⚠️ Pas d'erreur si aucune transaction
          setTransactions([]);
        }
      } else {
        setTransactions([]);
        setError(response.error || 'Erreur lors du chargement des transactions');
      }

    } catch (err) {
      console.error("❌ Erreur fetchTransactions:", err);
      setTransactions([]);
      setError('Impossible de charger les transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTransactions();
    else setLoading(false);
  }, [user, limit]);

  const handleRefresh = () => fetchTransactions();
  const handleViewAll = () => window.location.href = '/transactions';

  return (
    <div className="card transactions-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3>Dernières transactions</h3>
          {transactions.length > 0 && (
            <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px', marginBottom: 0 }}>
              {limit} plus récentes
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleRefresh} disabled={loading} style={{
            padding: '6px 12px', backgroundColor: loading ? '#e9ecef' : '#f8f9fa', color: loading ? '#adb5bd' : '#495057',
            border: '1px solid #dee2e6', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '12px'
          }}>{loading ? '...' : '🔄'}</button>
          {transactions.length > 0 && (
            <button onClick={handleViewAll} style={{
              padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}>Voir tout</button>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && !loading && (
        <div style={{
          backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', marginBottom: '15px',
          border: '1px solid #f5c6cb', fontSize: '14px'
        }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Affichage principal */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#6c757d' }}>
          <div style={{
            display: 'inline-block', width: '30px', height: '30px', border: '3px solid #f3f3f3',
            borderTop: '3px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '15px'
          }}></div>
          <p style={{ fontSize: '14px' }}>Chargement des transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#6c757d' }}>
          <div style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.5 }}>📭</div>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>Aucune transaction récente</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {transactions.map((t, index) => (
            <li key={t.id} style={{
              marginBottom: index < transactions.length - 1 ? '12px' : '0',
              padding: '12px', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #e9ecef',
              borderLeft: `3px solid ${t.direction === 'credit' ? '#28a745' : '#dc3545'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: t.direction === 'credit' ? '#28a745' : '#dc3545' }}>
                      {t.direction === 'credit' ? '+' : '-'} {t.amount.toFixed(2)} {t.currency}
                    </span>
                    {t.status && t.status !== 'completed' && (
                      <span style={{
                        fontSize: '10px', backgroundColor: t.status === 'pending' ? '#fff3cd' : '#f8d7da',
                        color: t.status === 'pending' ? '#856404' : '#721c24', padding: '1px 6px', borderRadius: '10px', fontWeight: '500'
                      }}>{t.status}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#495057', fontWeight: '500', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.description}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '1px 4px', borderRadius: '3px' }}>
                      {formatRIB(t.counterparty_rib)}
                    </span>
                    <span>•</span>
                    <span>{t.dateDisplay}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        li:hover { background-color: #f8f9fa; border-color: #dee2e6; }
      `}</style>
    </div>
  );
};

export default Transactions;
  