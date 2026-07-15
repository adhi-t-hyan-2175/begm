import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

const getStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'won') return '#16a34a';
  if (s === 'lost') return '#dc2626';
  return '#f59e0b';
};

const getSelectionBadge = (sel) => {
  const s = String(sel || '').toLowerCase();
  let color = '#888';
  if (s === 'green') color = '#48b85c';
  else if (s === 'red' || s === 'large') color = '#e0413c';
  else if (s === 'violet') color = '#7c4ab8';
  else if (s === 'small' || s === '2 hits') color = '#0ea5e9';
  else if (s === 'tie') color = '#e8b84d';
  else if (s === '3 hits') color = '#e87fb0';
  else if (s === '5 hits') color = '#48b85c';

  return (
    <span style={{
      background: color, color: '#fff',
      padding: '2px 10px', borderRadius: '8px',
      fontSize: '0.78rem', fontWeight: '700',
    }}>
      {sel}
    </span>
  );
};

const History = () => {
  const navigate = useNavigate();
  const { myOrders } = useWallet();

  return (
    <div style={{ background: 'linear-gradient(180deg,#f8fbff 0%,#eef4ff 100%)', minHeight: '100vh', paddingBottom: 70 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #eef2f8', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#24324a', cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={28} />
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.15rem', margin: 0, fontWeight: '800', color: '#24324a' }}>
          📜 Bet History
        </h2>
        <div style={{ width: 28 }} />
      </div>

      {/* List */}
      <div style={{ padding: '12px' }}>
        {myOrders.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80, color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📜</div>
            <div style={{ fontWeight: '600' }}>No history yet</div>
            <div style={{ fontSize: '0.9rem', marginTop: 4 }}>Place a bet to see your results here.</div>
          </div>
        ) : (
          myOrders.map((ord) => {
            const statusStr = String(ord.status || '').toLowerCase();
            const won = statusStr === 'won';
            const lost = statusStr === 'lost';
            return (
              <div key={ord.id} style={{
                background: '#fff', borderRadius: '16px', padding: '14px 16px',
                marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                border: '1px solid #f1f5f9'
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px dashed #e2e8f0' }}>
                  <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.98rem' }}>
                    {ord.game}
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '500', marginLeft: 8 }}>#{ord.period}</span>
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', color: getStatusColor(ord.status) }}>
                    {won ? 'WIN ✓' : lost ? 'LOSE ✗' : 'PENDING'}
                  </div>
                </div>

                {/* Middle row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: 10 }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 3 }}>Selection</div>
                    {getSelectionBadge(ord.selection)}
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 3 }}>Result</div>
                    {ord.result ? getSelectionBadge(ord.result) : <span style={{ color: '#ccc' }}>—</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 3 }}>Bet</div>
                    <div style={{ fontWeight: '700', color: '#334155' }}>₹{Number(ord.amount).toFixed(2)}</div>
                  </div>
                </div>

                {/* Bottom row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                    {ord.timestamp ? new Date(ord.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                  {(won || lost) && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 2 }}>{won ? 'Payout' : 'Loss'}</div>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: won ? '#16a34a' : '#dc2626' }}>
                        {won ? `+₹${Number(ord.winAmount || 0).toFixed(2)}` : `-₹${Number(ord.amount).toFixed(2)}`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default History;
