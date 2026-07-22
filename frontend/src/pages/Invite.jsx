import React, { useState } from 'react';
import { Copy, Gift, Users, TrendingUp, ChevronLeft } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Invite = () => {
  const navigate = useNavigate();
  const { addBalance } = useWallet();
  const { user } = useAuth();
  
  const [invitedTotal, setInvitedTotal] = useState(0); 
  const [bonusEarned, setBonusEarned] = useState(0);
  
  const inviteCode = String(user.player_id || user.id);
  const referralLink = `${window.location.origin}/register?ref=${inviteCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  };

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', paddingBottom: 90 }}>
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', padding: '16px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <ChevronLeft size={28} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: '800', marginRight: 28 }}>Referral Program</span>
      </div>

      <div style={{ padding: '24px 16px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}>
          <Users size={48} color="#2563eb" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Invite Friends & Earn</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 24px 0' }}>Share your link. When friends join and top-up, you both get Bonus Money!</p>
          
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px' }}>
            <span style={{ flex: 1, color: '#334155', fontSize: '1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
              {referralLink}
            </span>
            <button onClick={copyToClipboard} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', marginLeft: 12 }}>
              Copy
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '16px' }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: 4 }}>Total Friends</div>
              <div style={{ color: '#2563eb', fontSize: '1.5rem', fontWeight: '800' }}>{invitedTotal}</div>
            </div>
            <div style={{ background: '#fdf2f8', padding: '16px', borderRadius: '16px' }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: 4 }}>Bonus Earned</div>
              <div style={{ color: '#ec4899', fontSize: '1.5rem', fontWeight: '800' }}>₹{bonusEarned}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <h3 style={{ color: '#1e293b', marginBottom: '16px', paddingLeft: '8px' }}>Referral Benefits</h3>
        
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '12px', marginRight: '16px' }}>
            <Gift size={24} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem', marginBottom: 4 }}>Registration Reward</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
              When your friend registers using your link, you instantly receive a <strong style={{ color: '#ec4899' }}>₹50 Reward</strong> in your Main Wallet.
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '12px', marginRight: '16px' }}>
            <TrendingUp size={24} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem', marginBottom: 4 }}>Top-Ups Above ₹1000</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Both you and your friend receive a <strong style={{ color: '#ec4899' }}>5% Discount</strong> via Bonus Money on their top-up.
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Invite;
