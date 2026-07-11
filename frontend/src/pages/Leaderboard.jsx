import React, { useState } from 'react';
import { ChevronLeft, Trophy, Zap, Users, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recharge'); // recharge, winning, activity, referral
  
  const tabs = [
    { id: 'recharge', label: 'Highest Recharge', icon: <ShieldCheck size={16} /> },
    { id: 'winning', label: 'Highest Winning', icon: <Trophy size={16} /> },
    { id: 'activity', label: 'Highest Activity', icon: <Zap size={16} /> },
    { id: 'referral', label: 'Referral King', icon: <Users size={16} /> }
  ];

  // Deterministic generator based on current date
  const generateLeaderboard = (type) => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    let currentSeed = seed;
    const random = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    };
    
    if (type === 'winning') currentSeed += 1000;
    if (type === 'activity') currentSeed += 2000;
    if (type === 'referral') currentSeed += 3000;
    
    const list = [];
    let currentHighValue = type === 'activity' ? 450 : type === 'referral' ? 125 : 120000;
    
    for (let i = 1; i <= 100; i++) {
      const randomId = Math.floor(random() * (7000 - 3400 + 1)) + 3400;
      const name = `ID: ${randomId}`;
      
      let drop = 0;
      if (type === 'activity') drop = Math.floor(random() * 5) + 1;
      else if (type === 'referral') drop = Math.floor(random() * 2) + 1;
      else drop = Math.floor(random() * 1500) + 500;
      
      currentHighValue = Math.max(0, currentHighValue - drop);
      
      let formattedValue = '';
      if (type === 'activity') formattedValue = `${currentHighValue} Games`;
      else if (type === 'referral') formattedValue = `${currentHighValue} Friends`;
      else formattedValue = `₹${currentHighValue.toLocaleString('en-IN')}`;
      
      let reward = '-';
      if (i === 1) reward = '₹5000 BONUS';
      else if (i === 2) reward = '₹3000 BONUS';
      else if (i === 3) reward = '₹1000 BONUS';
      
      list.push({ rank: i, name, value: formattedValue, reward });
    }
    return list;
  };

  const dynamicData = {
    recharge: generateLeaderboard('recharge'),
    winning: generateLeaderboard('winning'),
    activity: generateLeaderboard('activity'),
    referral: generateLeaderboard('referral')
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#f59e0b'; // Gold
    if (rank === 2) return '#94a3b8'; // Silver
    if (rank === 3) return '#b45309'; // Bronze
    return '#e2e8f0'; // Default
  };

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', paddingBottom: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', padding: '16px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <ChevronLeft size={28} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: '800', marginRight: 28 }}>Daily Leaderboard</span>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', padding: '12px 16px', gap: '8px', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              padding: '10px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '0.9rem',
              background: activeTab === t.id ? '#2563eb' : 'white',
              color: activeTab === t.id ? 'white' : '#64748b',
              boxShadow: activeTab === t.id ? '0 4px 10px rgba(37,99,235,0.3)' : '0 2px 5px rgba(0,0,0,0.05)'
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px', marginTop: '8px' }}>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '16px', padding: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', boxShadow: '0 8px 20px rgba(245,158,11,0.2)' }}>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Leaderboard Resets In:</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: 6 }}>14:22:10</div>
          </div>
          <Trophy size={40} opacity={0.3} style={{ position: 'absolute', right: 30 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dynamicData[activeTab].map(user => (
            <div key={user.rank} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: getRankColor(user.rank) }}></div>
              <div style={{ 
                width: 36, height: 36, borderRadius: '50%', background: getRankColor(user.rank), 
                color: user.rank <= 3 ? 'white' : '#1e293b', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: '900', fontSize: '1.1rem', marginRight: '16px',
                border: user.rank > 3 ? '1px solid #cbd5e1' : 'none'
              }}>
                {user.rank}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem', marginBottom: '2px' }}>{user.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{user.value}</div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#ec4899', fontWeight: '800', fontSize: '0.9rem' }}>{user.reward}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
