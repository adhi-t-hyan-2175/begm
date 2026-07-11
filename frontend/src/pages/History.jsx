import React from 'react';

const History = () => {
  const bets = [
    { id: 1, game: 'Cricket Match', amount: '₹500', result: 'Won', reward: '₹1,000', date: '05 Jul 2025' },
    { id: 2, game: 'Color Prediction', amount: '₹200', result: 'Lost', reward: '—', date: '05 Jul 2025' },
    { id: 3, game: 'Coin Flip', amount: '₹1,000', result: 'Won', reward: '₹2,000', date: '04 Jul 2025' },
    { id: 4, game: 'Dice Roll', amount: '₹300', result: 'Pending', reward: '—', date: '04 Jul 2025' },
    { id: 5, game: 'Card Draw', amount: '₹750', result: 'Lost', reward: '—', date: '03 Jul 2025' },
  ];

  const getBadge = (result) => {
    if (result === 'Won') return 'badge-won';
    if (result === 'Lost') return 'badge-lost';
    return 'badge-pending';
  };

  return (
    <div className="page container">
      <h1>📜 Bet History</h1>
      <p className="section-subtitle">Your recent bets and results.</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Game</th>
            <th>Bet Amount</th>
            <th>Result</th>
            <th>Reward</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => (
            <tr key={bet.id}>
              <td>{bet.id}</td>
              <td>{bet.game}</td>
              <td>{bet.amount}</td>
              <td><span className={`badge ${getBadge(bet.result)}`}>{bet.result}</span></td>
              <td style={{ color: bet.reward !== '—' ? 'var(--accent-green)' : 'var(--text-muted)' }}>{bet.reward}</td>
              <td style={{ color: 'var(--text-muted)' }}>{bet.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default History;
