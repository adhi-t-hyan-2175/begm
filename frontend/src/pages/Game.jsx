import React from 'react';

const Game = () => {
  const games = [
    { id: 1, name: 'Cricket Match Prediction', status: 'LIVE', odds: '2.5x', players: 1250 },
    { id: 2, name: 'Coin Flip Challenge', status: 'LIVE', odds: '2.0x', players: 890 },
    { id: 3, name: 'Number Guessing', status: 'UPCOMING', odds: '5.0x', players: 340 },
    { id: 4, name: 'Color Prediction', status: 'LIVE', odds: '3.0x', players: 2100 },
    { id: 5, name: 'Dice Roll', status: 'UPCOMING', odds: '6.0x', players: 560 },
    { id: 6, name: 'Card Draw', status: 'LIVE', odds: '4.0x', players: 720 },
  ];

  return (
    <div className="page container">
      <h1>🎮 Live Games</h1>
      <p className="section-subtitle">Pick a game, place your bet, and win big.</p>
      <div className="card-grid">
        {games.map((game) => (
          <div className="card" key={game.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className={`badge ${game.status === 'LIVE' ? 'badge-won' : 'badge-pending'}`}>
                {game.status === 'LIVE' ? '🔴 ' : '⏳ '}{game.status}
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'Orbitron' }}>{game.odds}</span>
            </div>
            <h3>{game.name}</h3>
            <p>{game.players.toLocaleString()} players active</p>
            <button className="btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>
              Place Bet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Game;
