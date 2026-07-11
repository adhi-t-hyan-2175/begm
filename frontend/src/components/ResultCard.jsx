import React, { useEffect, useState } from 'react';

/**
 * ResultCard — Win/Lose animation card that appears after a period ends.
 * Shows the result with crown for win, X for lose, and all bet details.
 */
const ResultCard = ({ isOpen, result, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for smooth entrance
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const isWin = result.won;
  const accentColor = isWin ? '#f5a623' : '#e53935';
  const bgGradient = isWin
    ? 'linear-gradient(160deg, #fff9ec 0%, #fff3d0 100%)'
    : 'linear-gradient(160deg, #fff5f5 0%, #ffe8e8 100%)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: bgGradient,
          borderRadius: 20,
          width: '100%',
          maxWidth: 340,
          overflow: 'hidden',
          boxShadow: `0 20px 60px rgba(0,0,0,0.3), 0 0 0 3px ${accentColor}44`,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.92)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header banner */}
        <div style={{
          background: isWin
            ? 'linear-gradient(135deg, #f59e0b, #ef6c00)'
            : 'linear-gradient(135deg, #ef5350, #b71c1c)',
          padding: '20px 24px 16px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Icon */}
          <div style={{
            fontSize: isWin ? '2.8rem' : '2.4rem',
            marginBottom: 4,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
            animation: isWin ? 'resultBounce 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both' : 'resultShake 0.5s ease 0.2s both',
          }}>
            {isWin ? '👑' : '💔'}
          </div>
          <div style={{
            color: '#fff',
            fontSize: '1.8rem',
            fontWeight: 900,
            letterSpacing: 2,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {isWin ? 'YOU WIN!' : 'YOU LOSE'}
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '20px 24px' }}>
          <DetailRow label="Period" value={result.period} />
          <DetailRow label="Game" value={result.game} />
          <DetailRow label="You Bet" value={
            <span style={{
              background: result.selectionColor || '#555',
              color: '#fff',
              padding: '3px 12px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.85rem',
            }}>
              {result.selection}
            </span>
          } />
          <DetailRow label="Result" value={
            <span style={{
              background: result.resultColor || '#555',
              color: '#fff',
              padding: '3px 12px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.85rem',
            }}>
              {result.resultLabel}
            </span>
          } />
          <DetailRow label="Bet Amount" value={`₹${result.betAmount}`} />
          <div style={{ borderTop: '1px dashed #ddd', margin: '12px 0' }} />
          <DetailRow
            label={isWin ? 'Winnings' : 'Lost'}
            value={
              <span style={{
                color: isWin ? '#16a34a' : '#dc2626',
                fontWeight: 900,
                fontSize: '1.15rem',
              }}>
                {isWin ? `+ ₹${result.winAmount?.toFixed(2)}` : `- ₹${result.betAmount}`}
              </span>
            }
          />
        </div>

        {/* Close button */}
        <div style={{ padding: '0 24px 24px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              background: isWin
                ? 'linear-gradient(135deg, #f59e0b, #ef6c00)'
                : 'linear-gradient(135deg, #ef5350, #b71c1c)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 0',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            CLOSE
          </button>
        </div>
      </div>

      <style>{`
        @keyframes resultBounce {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes resultShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  }}>
    <span style={{ color: '#888', fontSize: '0.88rem' }}>{label}</span>
    <span style={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>{value}</span>
  </div>
);

export default ResultCard;
