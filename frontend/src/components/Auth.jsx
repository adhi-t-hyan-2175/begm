import React, { useState } from 'react';
import axios from 'axios';

const Auth = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await axios.post('/api/auth/login', { phone });
      console.log(res.data);
      setIsLoggedIn(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await axios.post('/api/auth/verify-otp', { phone, otp });
      console.log(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {!isLoggedIn ? (
        <div>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
          />
          <button onClick={handleLogin}>Login</button>
        </div>
      ) : (
        <div>
          <p>Welcome!</p>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOTP(e.target.value)}
            placeholder="OTP"
          />
          <button onClick={handleVerifyOTP}>Verify OTP</button>
        </div>
      )}
    </div>
  );
};

export default Auth;
