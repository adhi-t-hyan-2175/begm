import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';

const RewardModal = ({ isOpen, amount, onClose, type = 'coins' }) => {
  const [show, setShow] = useState(false);
  const [animateCard, setAnimateCard] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setTimeout(() => setAnimateCard(true), 50); // slight delay to trigger CSS transition
    } else {
      setAnimateCard(false);
      setTimeout(() => setShow(false), 300); // wait for exit animation
    }
  }, [isOpen]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: animateCard ? 1 : 0, transition: 'opacity 0.3s ease'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #fff, #f8f9fa)',
        width: '300px', borderRadius: '20px', padding: '30px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: animateCard ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Confetti / Star mock element */}
        <div style={{ position: 'absolute', top: -20, color: '#fbad3c', fontSize: '2rem' }}>✨</div>
        <div style={{ position: 'absolute', top: 10, left: -10, color: '#fbad3c', fontSize: '1.5rem' }}>✨</div>
        <div style={{ position: 'absolute', top: 30, right: -15, color: '#fbad3c', fontSize: '1.5rem' }}>✨</div>

        <div style={{
          background: '#e6f8ef', color: '#28a745', 
          width: 60, height: 60, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(40,167,69,0.2)'
        }}>
          <Gift size={32} />
        </div>
        
        <h2 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Congratulations!
        </h2>
        
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '1rem', textAlign: 'center' }}>
          You have successfully received
        </p>
        
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800', marginBottom: 24 }}>
          +₹{amount}
        </div>

        <button 
          onClick={onClose}
          style={{
            background: '#00c48c', color: 'white', border: 'none',
            padding: '14px 40px', borderRadius: '25px', fontSize: '1.1rem',
            fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 196, 140, 0.3)', width: '100%'
          }}
        >
          Collect
        </button>
      </div>
    </div>
  );
};

export default RewardModal;
