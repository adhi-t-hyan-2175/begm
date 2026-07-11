import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

const getStatusColor = (status) => {
  if (status === 'Won') return '#16a34a'; // Green
  if (status === 'Lost') return '#dc2626'; // Red
  return '#f59e0b'; // Pending Yellow
};

const getSelectionBadge = (sel, game) => {
  const s = String(sel || '').toLowerCase();
  let color = '#888';
  let label = sel;

  if (s.includes('green')) color = '#48b85c';
  else if (s.includes('red') || s === 'large') color = '#e0413c';
  else if (s.includes('violet')) color = '#7c4ab8';
  else if (s === 'small' || s.includes('two')) color = '#4da6e8';
  else if (s === 'tie' || s === '7') color = '#e8b84d';
  else if (s.includes('three')) color = '#e87fb0';
  else if (s.includes('five')) color = '#48b85c';

  // For Dice, format nicely
  if (game === 'Dice' && sel === '7') label = 'Tie';

  return (
    <div style={{
      background: color,
      color: '#fff',
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '0.8rem',
      fontWeight: '700',
      display: 'inline-block'
    }}>
      {label}
    </div>
  );
};

const OrderRecord = () => {
  const navigate = useNavigate();
  const { myOrders } = useWallet();

  return (
    <div style={{ background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 70 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #eef2f8', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#24324a', cursor: 'pointer', padding: 0 }}><ChevronLeft size={28} /></button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.15rem', margin: 0, fontWeight: '800', color: '#24324a' }}>Order Record</h2>
        <div style={{ width: 28 }}></div>
      </div>

      {/* List */}
      <div style={{ padding: '12px' }}>
        {myOrders.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80, color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: '600' }}>No orders found</div>
            <div style={{ fontSize: '0.9rem', marginTop: 4 }}>Place a bet to see your records here.</div>
          </div>
        ) : (
          myOrders.map(ord => (
            <div key={ord.id} style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9'
            }}>
              {/* Top Row: Game & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.05rem' }}>
                  {ord.game} <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500', marginLeft: 8 }}>{ord.period}</span>
                </div>
                <div style={{ fontWeight: '800', color: getStatusColor(ord.status), fontSize: '0.95rem' }}>
                  {ord.status === 'Won' ? 'WIN' : ord.status === 'Lost' ? 'LOSE' : 'PENDING'}
                </div>
              </div>

              {/* Detail Rows */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 4 }}>Selection</div>
                  {getSelectionBadge(ord.selection, ord.game)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 4 }}>Bet Amount</div>
                  <div style={{ fontWeight: '700', color: '#334155' }}>₹{ord.amount}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {new Date(ord.timestamp).toLocaleString()}
                </div>
                {ord.status !== 'Pending' && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 2 }}>{ord.status === 'Won' ? 'Winnings' : 'Loss'}</div>
                    <div style={{ 
                      fontWeight: '800', 
                      fontSize: '1.1rem',
                      color: ord.status === 'Won' ? '#16a34a' : '#dc2626'
                    }}>
                      {ord.status === 'Won' ? `+ ₹${ord.winAmount?.toFixed(2)}` : `- ₹${ord.amount}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderRecord;
