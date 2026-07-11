import React from 'react';
import { ChevronLeft, MessageCircle, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Support = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: 'white', borderBottom: '1px solid #eee' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}>
          <ChevronLeft size={28} />
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', margin: 0, fontWeight: '700', color: '#333' }}>Support</h2>
        <div style={{ width: 28 }}></div>
      </div>
      
      <div style={{ padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#e0f2fe', padding: 12, borderRadius: '50%', color: '#0ea5e9' }}>
            <MessageCircle size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>Live Chat</div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Available 24/7 for immediate assistance</div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#d1fae5', padding: 12, borderRadius: '50%', color: '#10b981' }}>
            <Phone size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>Call Us</div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>+91 1800 123 4567</div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#fef3c7', padding: 12, borderRadius: '50%', color: '#d97706' }}>
            <Mail size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>Email Support</div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>support@gambb.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
