import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { registerUser, sendOtp } = useAuth();
  
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Extract ?ref= from URL
  const searchParams = new URLSearchParams(window.location.search);
  const initialRef = searchParams.get('ref') || '22DH4H12';
  const [referralCode, setReferralCode] = useState(initialRef);
  
  const [otp, setOtp] = useState('');
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  
  const handleSendOTP = async () => {
    if (!phone) {
      setError('Please enter a phone number first');
      return;
    }
    if (countdown > 0 || isSending) return;

    setError('');
    setIsSending(true);
    try {
      // Use sendOtp from AuthContext
      await sendOtp(`${countryCode.replace('+', '')}${phone}`);
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsSending(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !password || !confirmPassword || !otp) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agree) {
      setError('You must agree to the Privacy Policy');
      return;
    }

    try {
      // Store full international number (without +)
      const fullPhone = `${countryCode.replace('+', '')}${phone}`;
      await registerUser(fullPhone, password, otp, 'NewUser', referralCode);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <button type="button" className="auth-back" onClick={() => navigate(-1)}>&larr;</button>
        <span className="auth-topbar-title">Register</span>
      </div>

      <form className="auth-card" onSubmit={handleRegister}>
        <div className="auth-logo">Fast<span>Win</span></div>
        <div className="auth-subtitle">Create your account and start earning</div>

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
            placeholder="Mobile Number"
          />
        </div>

        <div className="auth-input-row">
          <span className="auth-input-icon">🔒</span>
          <input
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Login Password (≥6 characters)"
          />
        </div>

        <div className="auth-input-row">
          <span className="auth-input-icon">🔒</span>
          <input
            type="password"
            className="auth-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Login Password"
          />
        </div>

        <div className="auth-input-row">
          <span className="auth-input-icon">🏷️</span>
          <input
            type="text"
            className="auth-input"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Invite Code"
          />
        </div>

        <div className="auth-input-row auth-otp-row">
          <span className="auth-input-icon">🔑</span>
          <input
            type="tel"
            className="auth-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Verification Code"
          />
          <button 
            type="button" 
            className="auth-otp-btn" 
            onClick={handleSendOTP}
            disabled={countdown > 0 || isSending}
          >
            {isSending ? 'Sending...' : countdown > 0 ? `${countdown}s` : 'OTP'}
          </button>
        </div>

        <button type="submit" className="auth-submit">Register</button>

        <div className="auth-footer-text">
          Already have an account? <Link to="/login">Log in</Link>
        </div>

        <label className="auth-terms">
          <input
            type="checkbox"
            checked={agree}
            onChange={() => setAgree(!agree)}
          />
          I agree <a href="#">PRIVACY POLICY</a>
        </label>
      </form>
    </div>
  );
};

export default Register;
