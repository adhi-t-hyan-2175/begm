import React from 'react';
import { Link } from 'react-router-dom';
import { Gift, CalendarCheck } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

const GAME_CARDS = [
  {
    to: '/game/fast-parity',
    image: '/assets/games/fast-parity.png',
    label: 'FAST-PARITY',
    accent: '#0ea5e9'
  },
  {
    to: '/game/parity',
    image: '/assets/games/parity.png',
    label: 'PARITY',
    accent: '#2563eb'
  },
  {
    to: '/game/sapre',
    image: '/assets/games/sapre.png',
    label: 'SAPRE',
    accent: '#f97316'
  },
  {
    to: '/game/dice',
    image: '/assets/games/dice.png',
    label: 'DICE',
    accent: '#9333ea'
  },
  {
    to: null,
    image: '/assets/games/andar-bahar.png',
    label: 'ANDAR BAHAR',
    accent: '#dc2626',
    comingSoon: true
  },
  {
    to: '/game/wheelocity',
    image: '/assets/games/wheelocity.png',
    label: 'WHEELOCITY',
    accent: '#10b981'
  }
];

const Home = () => {
  const { balance } = useWallet();
  const { user } = useAuth();

  return (
    <div className="home-shell">
      {/* Balance Card */}
      <div className="home-balance-card home-balance-card-new">
        <div className="home-balance-top">
          <div>
            <div className="balance-title">Balance</div>
            <div className="balance-amount">
              ₹{balance.toFixed(2)} <span className="refresh-symbol">⟳</span>
            </div>
            <div className="home-user-id">ID: {user?.player_id || user?.id}</div>
          </div>
          <button className="unlock-button">Recharge to unlock daily claim</button>
        </div>

        <div className="balance-actions">
          <Link to="/recharge" style={{ textDecoration: 'none' }}>
            <button className="btn-recharge">Recharge</button>
          </Link>
          <Link to="/withdraw" style={{ textDecoration: 'none' }}>
            <button className="btn-withdraw btn-withdraw-disabled">Withdraw</button>
          </Link>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="home-shortcuts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <Link to="/task" className="shortcut-card shortcut-orange" style={{ padding: '12px 8px' }}>
          <Gift size={20} />
          <span style={{ fontSize: '0.8rem' }}>Task</span>
        </Link>
        <Link to="/checkin" className="shortcut-card shortcut-green" style={{ padding: '12px 8px' }}>
          <CalendarCheck size={20} />
          <span style={{ fontSize: '0.8rem' }}>Check in</span>
        </Link>
        <Link to="/leaderboard" className="shortcut-card" style={{ padding: '12px 8px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
          <span style={{ fontSize: '0.8rem', marginTop: '6px' }}>Rank</span>
        </Link>
      </div>

      {/* Referral Banner */}
      <div className="referral-banner">
        <div>
          <div className="referral-caption">Refer a friend and earn 500 bonus for each legitimate invite you send.</div>
          <div className="referral-subtitle">Upon invitation, the invitee will receive a reward of 40</div>
        </div>
        <button className="referral-button">Refer Now</button>
      </div>

      {/* Game Cards — image backgrounds */}
      <div className="games-grid home-games-grid">
        {GAME_CARDS.map((card) => {
          const inner = (
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: 160,
                borderRadius: 16,
                backgroundImage: `url(${card.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 0 0 3px ${card.accent}44, 0 16px 40px rgba(0,0,0,0.22)`,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center'
              }}
            >
              {/* Dark overlay for readability */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
                borderRadius: 16
              }} />
              {/* Label */}
              <div style={{
                position: 'relative',
                zIndex: 2,
                color: '#fff',
                fontWeight: 900,
                fontSize: '1rem',
                letterSpacing: 1,
                textTransform: 'uppercase',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                padding: '12px 16px',
                width: '100%',
                textAlign: 'center',
                background: `linear-gradient(to right, ${card.accent}88, transparent)`,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16
              }}>
                {card.label}
              </div>
              {/* Coming Soon badge */}
              {card.comingSoon && (
                <div style={{
                  position: 'absolute', top: 10, right: 10, zIndex: 3,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  borderRadius: 999, padding: '4px 10px',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.5
                }}>
                  Coming Soon
                </div>
              )}
            </div>
          );

          return card.to ? (
            <Link
              key={card.label}
              to={card.to}
              style={{ textDecoration: 'none', display: 'block' }}
              className="game-card-large"
            >
              {inner}
            </Link>
          ) : (
            <div key={card.label} style={{ cursor: 'default' }} className="game-card-large">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
