import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Wallet, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="bottom-nav">
      <Link to="/" className={`nav-item ${isActive('/')}`}>
        <Home size={24} color={location.pathname === '/' ? 'var(--nav-active)' : 'var(--nav-inactive)'} />
        <span>Home</span>
      </Link>
      <Link to="/invite" className={`nav-item ${isActive('/invite')}`}>
        <Users size={24} color={location.pathname === '/invite' ? 'var(--nav-active)' : 'var(--nav-inactive)'} />
        <span>Invite</span>
      </Link>
      <Link to="/recharge" className={`nav-item ${isActive('/recharge')}`}>
        <Wallet size={24} color={location.pathname === '/recharge' ? 'var(--nav-active)' : 'var(--nav-inactive)'} />
        <span>Recharge</span>
      </Link>
      <Link to="/profile" className={`nav-item ${isActive('/profile')}`}>
        <User size={24} color={location.pathname === '/profile' ? 'var(--nav-active)' : 'var(--nav-inactive)'} />
        <span>My</span>
      </Link>
    </div>
  );
};

export default BottomNav;
