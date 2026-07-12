import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trophy, Zap, Users, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('top20'); 
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rankData, setRankData] = useState(null);
  
  const tabs = [
    { id: 'top20', label: 'Top 20 Players', icon: <Trophy size={16} /> },
    { id: 'stats', label: 'Daily Best Stats', icon: <Zap size={16} /> }
  ];

  useEffect(() => {
    const checkTimeAndFetch = async () => {
      // Calculate current IST time
      const now = new Date();
      // UTC + 5:30
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const hours = istTime.getUTCHours();
      
      if (hours >= 21 && hours < 24) {
        setIsVisible(true);
        // Fetch from Supabase
        try {
          const today = istTime.toISOString().split('T')[0];
          const { data, error } = await supabase
            .from('daily_rankings')
            .select(`
              *,
              highest_winner:users!highest_winner_id(player_id, nickname),
              highest_bettor:users!highest_bettor_id(player_id, nickname),
              highest_recharge:users!highest_recharge_id(player_id, nickname),
              top_profit:users!top_profit_id(player_id, nickname)
            `)
            .eq('rank_date', today)
            .maybeSingle();

          if (data) {
            setRankData(data);
          }
        } catch (err) {
          console.error("Error fetching rank data:", err);
        }
      } else {
        setIsVisible(false);
      }
      setLoading(false);
    };

    checkTimeAndFetch();
    const interval = setInterval(checkTimeAndFetch, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const getRankColor = (rank) => {
    if (rank === 1) return '#f59e0b'; // Gold
    if (rank === 2) return '#94a3b8'; // Silver
    if (rank === 3) return '#b45309'; // Bronze
    return '#e2e8f0'; // Default
  };

  if (loading) {
    return (
      <div style={{ background: '#f8fbff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading Rankings...</p>
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div style={{ background: '#f8fbff', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', padding: '16px', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={28} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
          <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: '800', marginRight: 28 }}>Daily Leaderboard</span>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
          <Trophy size={64} opacity={0.3} style={{ marginBottom: 20 }} />
          <h2 style={{ color: '#1e293b' }}>Rankings Hidden</h2>
          <p style={{ marginTop: 10, fontSize: '1.1rem' }}>Today's Ranking will be available at <strong>9:00 PM</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', paddingBottom: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', padding: '16px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <ChevronLeft size={28} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: '800', marginRight: 28 }}>Daily Leaderboard</span>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', padding: '12px 16px', gap: '8px', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none', justifyContent: 'center' }}>
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
        {activeTab === 'top20' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rankData?.top_20_players && rankData.top_20_players.length > 0 ? (
              rankData.top_20_players.map((user, idx) => {
                const rank = idx + 1;
                return (
                  <div key={rank} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: getRankColor(rank) }}></div>
                    <div style={{ 
                      width: 36, height: 36, borderRadius: '50%', background: getRankColor(rank), 
                      color: rank <= 3 ? 'white' : '#1e293b', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontWeight: '900', fontSize: '1.1rem', marginRight: '16px',
                      border: rank > 3 ? '1px solid #cbd5e1' : 'none'
                    }}>
                      {rank}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem', marginBottom: '2px' }}>{user.nickname}</div>
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>ID: {user.player_id}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#059669', fontWeight: '800', fontSize: '0.9rem' }}>+₹{Number(user.profit || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ textAlign: 'center', color: '#64748b', marginTop: 20 }}>No data yet for today.</p>
            )}
          </div>
        )}

        {activeTab === 'stats' && rankData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <StatCard title="Highest Winner" user={rankData.highest_winner} amount={rankData.highest_winner_amount} />
            <StatCard title="Highest Bettor" user={rankData.highest_bettor} amount={rankData.highest_bettor_amount} />
            <StatCard title="Highest Recharge" user={rankData.highest_recharge} amount={rankData.highest_recharge_amount} />
            <StatCard title="Top Profit" user={rankData.top_profit} amount={rankData.top_profit_amount} />
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, user, amount }) => (
  <div style={{ background: 'white', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.2rem' }}>{user?.nickname || 'N/A'}</div>
      {user?.player_id && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>ID: {user.player_id}</div>}
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ color: '#2563eb', fontWeight: '900', fontSize: '1.2rem' }}>₹{Number(amount || 0).toLocaleString('en-IN')}</div>
    </div>
  </div>
);

export default Leaderboard;
