import React from 'react';

const Dashboard = () => {
  return (
    <div className="page container">
      <h1>📊 Dashboard</h1>
      <p className="section-subtitle">Welcome back! Here's your overview.</p>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">₹0</div>
          <div className="stat-label">Wallet Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>0</div>
          <div className="stat-label">Bets Won</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>0</div>
          <div className="stat-label">Bets Lost</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>0</div>
          <div className="stat-label">Active Bets</div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="card-grid">
          <div className="card">
            <div className="card-icon">🎮</div>
            <h3>Play Now</h3>
            <p>Jump into live games and start winning.</p>
          </div>
          <div className="card">
            <div className="card-icon">💰</div>
            <h3>Add Funds</h3>
            <p>Deposit money via UPI or Razorpay.</p>
          </div>
          <div className="card">
            <div className="card-icon">📊</div>
            <h3>View Stats</h3>
            <p>Check your win/loss ratio and performance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
