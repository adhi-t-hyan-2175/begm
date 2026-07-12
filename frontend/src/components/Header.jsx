import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <header>
      <nav>
        <Link to="/" className="nav-brand">🎰 BETX</Link>
        <div className="nav-links">
          <Link to="/" className={isActive('/')}>Home</Link>
          <Link to="/game" className={isActive('/game')}>Games</Link>
          <Link to="/wallet" className={isActive('/wallet')}>Wallet</Link>
          <Link to="/history" className={isActive('/history')}>History</Link>
          <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        </div>
        <div className="nav-right">
          <div className="nav-wallet">💰 ₹0.00</div>
          <Link to="/login">
            <button className="btn-logout">Login</button>
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
