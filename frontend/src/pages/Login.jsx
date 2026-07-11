import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Please enter both phone number and password');
      return;
    }

    try {
      loginUser(`${countryCode}${phone}`, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <button type="button" className="auth-back" onClick={() => navigate(-1)}>&larr;</button>
        <span className="auth-topbar-title">Login</span>
      </div>

      <form className="auth-card" onSubmit={handleLogin}>
        <div className="auth-logo">Fast<span>Win</span></div>
        <div className="auth-subtitle">Login to your account</div>

        {error && <div className="auth-error" style={{ color: '#ff4d4f', background: 'rgba(255, 77, 79, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.85rem' }}>{error}</div>}

        <div className="auth-input-row" style={{ display: 'flex' }}>
          <select 
            className="auth-input" 
            style={{ width: '80px', flex: 'none', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            <option value="+91">+91 (IN)</option>
            <option value="+1">+1 (US)</option>
            <option value="+44">+44 (UK)</option>
            <option value="+971">+971 (UAE)</option>
            <option value="+65">+65 (SG)</option>
          </select>
          <input
            type="tel"
            className="auth-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter Mobile Number"
          />
        </div>

        <div className="auth-input-row">
          <span className="auth-input-icon">🔒</span>
          <input
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (≥6 characters)"
          />
        </div>

        <button type="submit" className="auth-submit">Login</button>

        <div className="auth-link-row">
          <Link to="/register">Create an account</Link>
          <a href="#">Forgot Password?</a>
        </div>
      </form>
    </div>
  );
};

export default Login;
