import React, { useState } from 'react';
import {
  ChevronRight, FileText, Wallet, HelpCircle, User as UserIcon,
  LogOut, Copy, Trophy, CheckSquare, Activity, Gift, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getVipLevel } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';

const VIP_TIERS = [
  { name: 'Bronze', emoji: '🥉', min: 0, max: 9999, color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  { name: 'Silver', emoji: '🥈', min: 10000, max: 24999, color: '#64748b', bg: '#f1f5f9', border: '#94a3b8' },
  { name: 'Gold', emoji: '🥇', min: 25000, max: 49999, color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  { name: 'Diamond', emoji: '💎', min: 50000, max: 99999, color: '#0ea5e9', bg: '#f0f9ff', border: '#7dd3fc' },
  { name: 'Master', emoji: '👑', min: 100000, max: Infinity, color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd' },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { balance, adminSettings } = useWallet();
  const [showVipTable, setShowVipTable] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const totalRecharge = user.total_recharge || user.totalRecharge || 0;
  const vip = getVipLevel(totalRecharge);
  const bonusBalance = user.bonus_balance || user.bonusBalance || 0;
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const referralLink = `${appUrl}/register?ref=${user.player_id || user.id}`;

  // Next tier
  const nextTierIndex = VIP_TIERS.findIndex(t => t.name === vip.name) + 1;
  const nextTier = VIP_TIERS[nextTierIndex];
  const progressToNext = nextTier
    ? Math.min(100, Math.round(((totalRecharge - vip.min) / (nextTier.min - vip.min)) * 100))
    : 100;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied!');
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', padding: '18px 18px 60px', textAlign: 'center', fontWeight: '800', fontSize: '1.15rem', position: 'relative' }}>
        WELCOME PLAYER
      </div>

      {/* Profile Card */}
      <div style={{ background: 'white', margin: '-40px 16px 16px', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', boxShadow: '0 14px 30px rgba(15,23,42,0.10)', position: 'relative' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: vip.bg, border: `3px solid ${vip.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginRight: 16, flexShrink: 0 }}>
          {vip.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#24324a' }}>{user.nickname}</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Player ID: {user.player_id || user.id}</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{user.email}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.75rem', color: vip.color, fontWeight: '700', marginBottom: 2 }}>VIP</div>
          <div style={{ fontWeight: '800', color: vip.color, fontSize: '1rem' }}>{vip.name}</div>
        </div>
      </div>

      {/* Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '0 16px 16px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: '600' }}>Main Balance</div>
          <div style={{ color: '#2563eb', fontSize: '1.4rem', fontWeight: '800', marginTop: 4 }}>₹{balance.toFixed(2)}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: '600' }}>Total Recharged</div>
          <div style={{ color: '#10b981', fontSize: '1.4rem', fontWeight: '800', marginTop: 4 }}>₹{totalRecharge.toLocaleString()}</div>
        </div>
      </div>

      {/* VIP Banner */}
      <div
        onClick={() => setShowVipTable(v => !v)}
        style={{ background: vip.bg, margin: '0 16px 16px', borderRadius: '20px', padding: '16px', cursor: 'pointer', border: `1.5px solid ${vip.color}40` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: vip.color, fontWeight: '700' }}>YOUR VIP LEVEL</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: vip.color }}>
              {vip.emoji} {vip.name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Trophy size={28} color={vip.color} />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>{showVipTable ? 'Hide' : 'View'} Levels</div>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
              <span>{vip.name}</span>
              <span>Next: {nextTier.name} (₹{nextTier.min.toLocaleString()})</span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 999, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${progressToNext}%`, height: '100%', background: vip.color, borderRadius: 999, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, textAlign: 'right' }}>
              ₹{(nextTier.min - totalRecharge).toLocaleString()} more to {nextTier.name}
            </div>
          </div>
        )}
      </div>

      {/* VIP Levels Table */}
      {showVipTable && (
        <div style={{ margin: '0 16px 16px', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', fontWeight: '800', fontSize: '0.95rem' }}>
            🏆 VIP Level Benefits
          </div>
          <div style={{ padding: '4px 0' }}>
            {VIP_TIERS.map((tier, idx) => {
              const isActive = tier.name === vip.name;
              return (
                <div
                  key={tier.name}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px',
                    background: isActive ? tier.bg : 'white',
                    borderBottom: idx < VIP_TIERS.length - 1 ? '1px solid #f1f5f9' : 'none',
                    borderLeft: isActive ? `4px solid ${tier.color}` : '4px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '1.5rem', marginRight: 12 }}>{tier.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: tier.color, fontSize: '0.95rem' }}>
                      {tier.name} {isActive && <span style={{ fontSize: '0.72rem', background: tier.color, color: 'white', borderRadius: 999, padding: '2px 6px', marginLeft: 4 }}>Current</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>
                      Recharge: ₹{tier.min.toLocaleString()}{tier.max === Infinity ? '+' : ` – ₹${tier.max.toLocaleString()}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b' }}>
                    {idx === 0 && <span>No min</span>}
                    {idx === 1 && <span>10,000+</span>}
                    {idx === 2 && <span>25,000+</span>}
                    {idx === 3 && <span>50,000+</span>}
                    {idx === 4 && <span>1,00,000+</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 16px', background: '#fafbff', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
            * VIP level is calculated from total recharge history across all sessions.
          </div>
        </div>
      )}

      {/* Referral */}
      <div style={{ background: 'white', margin: '0 16px 16px', borderRadius: '20px', padding: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', marginBottom: 8 }}>Your Referral Link</div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '10px 14px', borderRadius: '12px' }}>
          <span style={{ flex: 1, color: '#334155', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{referralLink}</span>
          <Copy size={18} color="#2563eb" onClick={copyReferral} style={{ cursor: 'pointer', marginLeft: 10, flexShrink: 0 }} />
        </div>
        <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#64748b' }}>
          📢 Friends who register with your code give you <strong style={{ color: '#2563eb' }}>₹{adminSettings?.referral_bonus || adminSettings?.referralBonus || 50}</strong> instantly!
        </div>
      </div>

      {/* Menu Options */}
      <div style={{ background: 'white', margin: '0 16px 12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {[
          { icon: <FileText size={18} color="#4b6fff" />, label: 'Recent Orders', path: '/order-record' },
          { icon: <Wallet size={18} color="#4b6fff" />, label: 'Financial Details', path: '/financial-details' },
          { icon: <HelpCircle size={18} color="#64748b" />, label: 'Support', path: '/support' },
          { icon: <Shield size={18} color="#64748b" />, label: 'About', path: '/about' },
        ].map((item, idx, arr) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              padding: '15px 18px', display: 'flex', alignItems: 'center',
              borderBottom: idx < arr.length - 1 ? '1px solid #eef2f8' : 'none',
              cursor: 'pointer'
            }}
          >
            <span style={{ marginRight: 12 }}>{item.icon}</span>
            <span style={{ flex: 1, color: '#24324a', fontSize: '0.97rem', fontWeight: '600' }}>{item.label}</span>
            <ChevronRight size={18} color="#cbd5e1" />
          </div>
        ))}
      </div>

      {/* Sign Out */}
      <div style={{ padding: '4px 16px 0' }}>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', background: 'white', color: '#dc2626',
            border: '1.5px solid #fee2e2', padding: '14px', borderRadius: 16,
            fontSize: '1rem', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.08)',
            fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Profile;
