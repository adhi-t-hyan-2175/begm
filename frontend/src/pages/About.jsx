import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: 'white', borderBottom: '1px solid #eee' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}>
          <ChevronLeft size={28} />
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', margin: 0, fontWeight: '700', color: '#333' }}>About Us</h2>
        <div style={{ width: 28 }}></div>
      </div>
      <div style={{ padding: 24, color: '#444', lineHeight: 1.6 }}>
        <h3 style={{ marginBottom: 16 }}>Welcome to Gambb</h3>
        <p style={{ marginBottom: 16 }}>
          Gambb is the ultimate destination for fun, fast-paced games where you can win real rewards. 
          Our platform is designed to provide a secure and entertaining experience for all our users.
        </p>
        <p style={{ marginBottom: 16 }}>
          With our cutting-edge technology, we ensure fair play and instant transactions for both recharges and withdrawals. 
          Invite your friends and grow your agent cash plan today!
        </p>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 40 }}>Version 1.0.0</p>
      </div>
    </div>
  );
};

export default About;
