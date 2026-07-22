import React, { useState } from 'react';
import { ChevronLeft, Gift, CreditCard, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import RewardModal from '../components/RewardModal';

const Task = () => {
  const navigate = useNavigate();
  const { tasks, updateTask, claimTaskReward } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const handleStartTask = async (taskId) => {
    const success = await claimTaskReward(taskId);
    if (success) {
      const rewardMap = {
        'registerEmail': 10,
        'firstRecharge': 50,
        'fiftyBets': 50,
        'inviteFriend': 50,
        'dailyLogin': 5
      };
      setRewardAmount(rewardMap[taskId]);
      setModalOpen(true);
    }
  };

  const getButtonText = (status) => {
    if (status === 'claimed') return 'Completed';
    return 'Verify & Claim';
  };

  const getButtonStyle = (status) => {
    if (status === 'claimed') return { background: '#f5f5f5', color: '#999', border: 'none' };
    return { background: '#28a745', color: 'white', border: 'none' };
  };

  const taskList = [
    {
      id: 'registerEmail',
      title: 'Register with Google',
      desc: 'Create an account using your Google account',
      reward: 10,
      icon: <Gift size={24} />,
      iconBg: '#fbad3c'
    },
    {
      id: 'firstRecharge',
      title: 'First Recharge',
      desc: 'Complete your first recharge of any amount',
      reward: 50,
      icon: <CreditCard size={24} />,
      iconBg: '#ec4899'
    },
    {
      id: 'fiftyBets',
      title: '50 Bets Milestone',
      desc: 'Place 50 bets across any games',
      reward: 50,
      icon: <Gift size={24} />,
      iconBg: '#007bff'
    },
    {
      id: 'inviteFriend',
      title: 'Invite Friend',
      desc: 'Invite at least one friend to join the platform',
      reward: 50,
      icon: <Users size={24} />,
      iconBg: '#6f42c1'
    },
    {
      id: 'dailyLogin',
      title: 'Daily Login',
      desc: 'Log in to the app daily',
      reward: 5,
      icon: <Gift size={24} />,
      iconBg: '#007bff'
    }
  ];

  return (
    <div style={{ background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', background: 'rgba(255,255,255,0.95)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#24324a', cursor: 'pointer' }}><ChevronLeft size={28} /></button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.15rem', margin: 0, fontWeight: '800', color: '#24324a' }}>Task Center</h2>
        <div style={{ width: 28 }}></div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {taskList.map((task) => {
          const currentStatus = tasks[task.id]?.status || 'pending';
          const progress = tasks[task.id]?.progress || 0;
          
          return (
            <div key={task.id} style={{ background: 'white', borderRadius: '20px', padding: '16px', boxShadow: '0 12px 26px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ background: task.iconBg, color: 'white', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{task.icon}</div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#24324a', fontWeight: '700' }}>{task.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#7b8aa3', lineHeight: '1.4' }}>{task.desc}</p>
                  </div>
                </div>
                <div style={{ color: '#ef4444', fontWeight: '800', fontSize: '1.02rem', flexShrink: 0, marginLeft: '12px' }}>+₹{task.reward}</div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ width: '100%', height: '8px', background: '#eef2f8', borderRadius: '999px', overflow: 'hidden' }}><div style={{ width: currentStatus === 'claimed' ? '100%' : '0%', height: '100%', background: 'linear-gradient(90deg, #2563eb, #4f46e5)', transition: 'width 0.5s ease-in-out' }}></div></div>
              </div>

              <button onClick={() => handleStartTask(task.id)} disabled={currentStatus === 'claimed'} style={{ width: '100%', padding: '12px', borderRadius: '999px', fontSize: '0.95rem', fontWeight: '700', marginTop: '14px', cursor: currentStatus === 'claimed' ? 'default' : 'pointer', transition: 'all 0.3s ease', ...getButtonStyle(currentStatus) }}>{getButtonText(currentStatus)}</button>
            </div>
          );
        })}
      </div>

      <RewardModal 
        isOpen={modalOpen} 
        amount={rewardAmount} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
};

export default Task;
