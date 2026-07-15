import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: '#fff', borderRadius: '16px', padding: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
  }}>
    <div style={{ fontSize: '1.6rem' }}>{icon}</div>
    <div style={{ fontWeight: '800', fontSize: '1.2rem', color: color || '#1e293b' }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { balance, bonusBalance, myOrders, financialRecords } = useWallet();
  const { user } = useAuth();

  const won   = myOrders.filter(o => String(o.status).toLowerCase() === 'won').length;
  const lost  = myOrders.filter(o => String(o.status).toLowerCase() === 'lost').length;
  const pending = myOrders.filter(o => String(o.status).toLowerCase() === 'pending').length;

  const totalRecharge = financialRecords
    .filter(r => r.type === 'Recharge' && r.status === 'Success')
    .reduce((sum, r) => {
      const amt = parseFloat(String(r.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
      return sum + amt;
    }, 0);

  const totalWithdrawal = financialRecords
    .filter(r => r.type === 'Withdrawal' && r.status === 'Success')
    .reduce((sum, r) => {
      const amt = parseFloat(String(r.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
      return sum + amt;
    }, 0);

  const totalWinnings = myOrders
    .filter(o => String(o.status).toLowerCase() === 'won')
    .reduce((sum, o) => sum + (Number(o.winAmount) || 0), 0);

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', padding: '18px 18px 60px', textAlign: 'center', fontWeight: '800', fontSize: '1.15rem' }}>
        📊 My Dashboard
      </div>

      {/* Profile + Balance Card */}
      <div style={{ background: '#fff', margin: '-40px 16px 16px', borderRadius: '24px', padding: '20px', boxShadow: '0 14px 30px rgba(15,23,42,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '1.3rem' }}>
            {(user?.nickname || user?.email || 'P').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>{user?.nickname || user?.email || 'Player'}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ID: {user?.player_id || user?.id}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', borderRadius: 14, padding: '14px 16px', color: '#fff' }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>Main Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>₹{balance.toFixed(2)}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: 14, padding: '14px 16px', color: '#fff' }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>Bonus Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>₹{(bonusBalance || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontWeight: '700', color: '#475569', fontSize: '0.85rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Betting Stats
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <StatCard icon="🎮" label="Total Bets" value={myOrders.length} color="#2563eb" />
          <StatCard icon="🏆" label="Wins" value={won} color="#16a34a" />
          <StatCard icon="💔" label="Losses" value={lost} color="#dc2626" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <StatCard icon="⏳" label="Pending Bets" value={pending} color="#f59e0b" />
          <StatCard icon="💰" label="Total Winnings" value={`₹${totalWinnings.toFixed(0)}`} color="#16a34a" />
        </div>

        <div style={{ fontWeight: '700', color: '#475569', fontSize: '0.85rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Financial Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard icon="📥" label="Total Recharge" value={`₹${totalRecharge.toFixed(0)}`} color="#2563eb" />
          <StatCard icon="📤" label="Total Withdrawal" value={`₹${totalWithdrawal.toFixed(0)}`} color="#7c3aed" />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontWeight: '700', color: '#475569', fontSize: '0.85rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: '🎮 Play Games', path: '/' },
            { label: '💳 Recharge', path: '/recharge' },
            { label: '📜 Bet History', path: '/order-record' },
            { label: '💼 Withdraw', path: '/withdraw' },
          ].map(btn => (
            <button key={btn.path} onClick={() => navigate(btn.path)} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
              padding: '14px', fontWeight: '700', color: '#1e293b', cursor: 'pointer',
              fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
