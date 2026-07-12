import React, { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import RewardModal from '../components/RewardModal';

const CheckIn = () => {
  const navigate = useNavigate();
  const { checkInState, performCheckIn, financialRecords } = useWallet();
  const hasRecharged = financialRecords?.some(r => String(r.type).toLowerCase().includes('recharge') && String(r.status).toLowerCase() === 'success');
  const [modalOpen, setModalOpen] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  // Generate the 7 days state based on current streak
  // Streak is 0-6. Day 1 is streak 0, Day 7 is streak 6.
  const days = Array.from({ length: 7 }).map((_, i) => {
    let rewardText = '+ 2';
    if (i === 0) rewardText = '+ 1';
    if (i >= 4) rewardText = '+ 3'; // day 5, 6, 7

    return {
      day: i + 1,
      reward: rewardText,
      completed: i < checkInState.streak,
      today: i === checkInState.streak,
      isChest: i === 6
    };
  });

  // Calculate time remaining for next checkin
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const lastCheckIn = checkInState.lastCheckInTime || 0;
  const timeSinceLastCheckIn = now - lastCheckIn;
  const canCheckIn = timeSinceLastCheckIn >= ONE_DAY_MS;

  const handleCheckIn = () => {
    if (!hasRecharged) {
      alert("Please complete at least one recharge to unlock Check In rewards!");
      return;
    }

    if (!canCheckIn) {
      alert("You have already checked in today! Please wait 24 hours.");
      return;
    }

    let amount = 0;
    const currentStreak = checkInState.streak;
    
    if (currentStreak === 0) amount = 1;
    else if (currentStreak >= 1 && currentStreak <= 3) amount = 2; // Days 2, 3, 4
    else if (currentStreak >= 4 && currentStreak <= 5) amount = 3; // Days 5, 6
    else if (currentStreak === 6) {
      // Day 7: random reward between 3 and 7
      amount = Math.floor(Math.random() * 5) + 3;
    }

    performCheckIn(amount);
    setRewardAmount(amount);
    setModalOpen(true);
  };

  return (
    <div style={{ background: 'linear-gradient(180deg, #0088ff 0%, #00458a 100%)', minHeight: '100vh', color: 'white', paddingBottom: 70, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft size={28} /></button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.15rem', margin: 0, fontWeight: '800' }}>Check In</h2>
        <div style={{ width: 28 }}></div>
      </div>

      <div style={{ padding: '24px 18px', position: 'relative' }}>
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px 16px 40px', color: '#24324a', position: 'relative' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {days.slice(0, 4).map((d) => (
              <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '500', fontSize: '0.85rem', color: '#666' }}>Day {d.day}</span>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: d.completed || d.today ? '#ffbc00' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.completed || d.today ? 'white' : '#ccc', boxShadow: d.completed || d.today ? '0 4px 8px rgba(255, 188, 0, 0.3)' : 'none' }}><Check size={20} strokeWidth={3} /></div>
                <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>{d.reward}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '12px' }}>
            {days.slice(4).map((d) => (
              <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '500', fontSize: '0.85rem', color: '#666' }}>Day {d.day}</span>
                <div style={{ width: d.isChest ? 44 : 36, height: d.isChest ? 44 : 36, borderRadius: d.isChest ? 0 : '50%', background: d.isChest ? 'transparent' : (d.completed || d.today ? '#ffbc00' : '#f0f0f0'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.completed || d.today ? 'white' : '#ccc', boxShadow: (!d.isChest && (d.completed || d.today)) ? '0 4px 8px rgba(255, 188, 0, 0.3)' : 'none' }}>
                  {d.isChest ? (
                    <img src="https://cdn-icons-png.flaticon.com/512/3233/3233483.png" alt="chest" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                  ) : (
                    <Check size={20} strokeWidth={3} />
                  )}
                </div>
                <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>{d.reward}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Overlapping Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-24px', position: 'relative', zIndex: 10 }}>
          <button onClick={handleCheckIn} style={{ background: canCheckIn ? '#e0e0e0' : '#cccccc', color: canCheckIn ? '#333' : '#888', border: '4px solid #005aab', padding: '12px 48px', borderRadius: '999px', fontSize: '1.1rem', fontWeight: '800', cursor: canCheckIn ? 'pointer' : 'not-allowed', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            Check In
          </button>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center', lineHeight: '1.5', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', padding: '0 12px' }}>
          Check in for 7 consecutive days to get treasure box, and receive mysterious prizes!
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          {/* Decorative Stars */}
          <div style={{ position: 'absolute', top: -10, left: '20%', fontSize: '1.2rem', color: '#ffd700', animation: 'float 3s ease-in-out infinite' }}>✨</div>
          <div style={{ position: 'absolute', top: 20, right: '25%', fontSize: '1.5rem', color: '#ffd700', animation: 'float 2.5s ease-in-out infinite reverse' }}>⭐</div>
          <div style={{ position: 'absolute', bottom: 40, left: '30%', fontSize: '1rem', color: '#ffd700', animation: 'float 4s ease-in-out infinite' }}>🌟</div>
          
          <img src="https://cdn-icons-png.flaticon.com/512/3233/3233483.png" alt="Big Treasure Box" style={{ width: 160, height: 160, objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))' }} />
          <style>{`@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }`}</style>
        </div>

      </div>
      
      <RewardModal 
        isOpen={modalOpen} 
        amount={rewardAmount} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
};

export default CheckIn;
