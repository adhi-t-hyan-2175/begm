import React from 'react';
import { ChevronLeft, MessageCircle, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

const Support = () => {
  const navigate = useNavigate();
  const { adminSettings } = useSocket();
  return (
    <div style={{ background: '#080808', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <ChevronLeft size={28} />
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', margin: 0, fontWeight: '700', color: '#d4af37' }}>Support</h2>
        <div style={{ width: 28 }}></div>
      </div>
      
      <div style={{ padding: 20 }}>
        {/* Telegram Integration */}
        <a href={adminSettings?.telegramLink || "https://t.me/betxofficials"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#111', borderRadius: 12, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div style={{ background: 'rgba(0, 136, 204, 0.2)', padding: 12, borderRadius: '50%', color: '#0088cc' }}>
              <MessageCircle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>Telegram</div>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>{adminSettings?.telegramLink ? new URL(adminSettings.telegramLink).pathname.replace('/', '@') : '@betxofficials'}</div>
            </div>
          </div>
        </a>

        {/* Email Integration */}
        <a href={`mailto:${adminSettings?.supportEmail || "support@betx.com"}`} style={{ textDecoration: 'none' }}>
          <div style={{ background: '#111', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: 12, borderRadius: '50%', color: '#d4af37' }}>
              <Mail size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>Email Support</div>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>{adminSettings?.supportEmail || "support@betx.com"}</div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default Support;
