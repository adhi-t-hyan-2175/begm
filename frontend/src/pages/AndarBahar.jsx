import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AndarBahar = () => {
  const navigate = useNavigate();

  return (
    <div className="game-screen">
      <div className="game-header game-banner-andar">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#333' }}>
          <ChevronLeft size={28} />
        </button>
        <div className="game-banner-title">ANDAR BAHAR</div>
        <div style={{ width: 64 }} />
      </div>

      <div className="game-body">
        <div className="game-card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ display: 'inline-block', padding: '8px 14px', background: '#111827', color: '#fff', borderRadius: 999, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 18 }}>COMING SOON</div>
          <h3 style={{ marginTop: 12, fontSize: '1.25rem', color: '#111827' }}>Andar Bahar</h3>
          <p style={{ color: '#6b7280', marginTop: 8 }}>This game will return soon. Stay tuned for updates.</p>
        </div>
      </div>
    </div>
  );
};

export default AndarBahar;
