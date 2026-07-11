import React, { useState, useEffect } from 'react';
import { ChevronRight, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

const Wallet = () => {
  const navigate = useNavigate();
  const { balance, requestRecharge, pendingRecharges, financialRecords, adminSettings } = useWallet();
  const { user } = useAuth();
  
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('input'); // 'input', 'razorpay', 'waiting', 'success'
  const [currentRequestId, setCurrentRequestId] = useState(null);

  const quickAmounts = [100, 150, 1400, 4500, 10000, 40000];

  // Auto-scrolling feed simulation
  const [feedIndex, setFeedIndex] = useState(0);
  const feedItems = [
    { name: '**706', amount: 50 },
    { name: '**412', amount: 150 },
    { name: '**991', amount: 4500 },
    { name: '**332', amount: 100 },
    { name: '**105', amount: 10000 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % feedItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Listen for admin approval if in waiting state
  useEffect(() => {
    if (status === 'waiting' && currentRequestId) {
      // Check if it's no longer in pending (meaning it was approved or denied)
      const isStillPending = pendingRecharges.some(r => r.id === currentRequestId);
      if (!isStillPending) {
        // Double check it's in financial records to ensure it was a success
        const isSuccess = financialRecords.some(r => r.id === currentRequestId);
        if (isSuccess) {
          setStatus('success');
        }
      }
    }
  }, [pendingRecharges, financialRecords, status, currentRequestId]);

  const handleRecharge = () => {
    const numAmount = parseInt(amount, 10);
    const minAmount = adminSettings?.minRecharge || 100;
    const maxAmount = adminSettings?.maxRecharge || 10000;
    if (!numAmount || numAmount < minAmount || numAmount > maxAmount) {
      alert(`Please enter a valid amount between ₹${minAmount} and ₹${maxAmount}`);
      return;
    }
    
    // 1. Show razorpay mock
    setStatus('razorpay');
  };

  const handleRazorpaySuccess = () => {
    const numAmount = parseInt(amount, 10);
    const reqId = requestRecharge(user.id, numAmount);
    setCurrentRequestId(reqId);
    setStatus('waiting');
  };

  if (status === 'razorpay') {
    return (
      <div style={{ background: 'rgba(0, 0, 0, 0.8)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
        <div style={{ background: '#fff', width: '90%', maxWidth: 400, borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ background: '#02042b', color: '#fff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, background: '#3395ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>R</div>
              Razorpay Checkout
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>₹{amount}</div>
          </div>
          
          <div style={{ padding: 24 }}>
            <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: 16 }}>Select Payment Method</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ border: '1px solid #e0e0e0', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, background: '#f9f9f9', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, background: '#fff', border: '1px solid #ccc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontWeight: 'bold' }}>UPI</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#333' }}>Google Pay / PhonePe</div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>Pay via UPI App</div>
                </div>
              </div>
              
              <div style={{ border: '1px solid #e0e0e0', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontWeight: 'bold' }}>💳</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#333' }}>Card</div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>Visa, MasterCard, RuPay</div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleRazorpaySuccess}
              style={{ width: '100%', background: '#3395ff', color: 'white', border: 'none', padding: '16px', borderRadius: 8, fontSize: '1.1rem', fontWeight: '600', marginTop: 24, cursor: 'pointer' }}
            >
              Pay Now (Mock)
            </button>
            <button 
              onClick={() => setStatus('input')}
              style={{ width: '100%', background: 'transparent', color: '#888', border: 'none', padding: '12px', fontSize: '0.9rem', marginTop: 8, cursor: 'pointer' }}
            >
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <h2 style={{ marginTop: 60, color: '#333' }}>Waiting for Approval</h2>
        <p style={{ color: '#666', marginBottom: 40 }}>Your payment is being verified. Please wait a few minutes while the admin grants your recharge token.</p>
        <div style={{ width: 40, height: 40, margin: '0 auto', border: '4px solid #ccc', borderTopColor: '#007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, background: '#28a745', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '60px auto 20px', fontSize: '2.5rem' }}>
          ✓
        </div>
        <h2 style={{ color: '#28a745' }}>Recharge Successful!</h2>
        <p style={{ color: '#666', marginBottom: 40 }}>The amount has been successfully credited to your wallet.</p>
        <button onClick={() => navigate('/financial-details')} style={{ padding: '12px 32px', background: '#007bff', color: 'white', border: 'none', borderRadius: 24, fontSize: '1rem', cursor: 'pointer' }}>
          View Financial Details
        </button>
      </div>
    );
  }

  // status === 'input'
  return (
    <div style={{ background: 'linear-gradient(180deg, #f8fbff 0%, #f5f7fb 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 70 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}>
        <div onClick={() => navigate('/financial-details')} style={{ flex: 1, color: '#4b6fff', cursor: 'pointer', fontWeight: 600 }}>Records</div>
        <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.15rem', color: '#1f2a44' }}>Recharge</h2>
        <div style={{ flex: 1, textAlign: 'right', color: '#7b8aa3', cursor: 'pointer' }}>Help</div>
      </div>

      <div style={{ padding: '18px 18px 10px' }}>
        <div style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', borderRadius: '22px', padding: '22px', color: 'white', boxShadow: '0 14px 30px rgba(37,99,235,0.18)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: 4 }}>Main Balance</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>₹{balance.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: 4 }}>Bonus Balance</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbcfe8' }}>₹{(user.bonusBalance || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 18px 16px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '18px', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}>
          <div style={{ fontWeight: '700', color: '#24324a', marginBottom: 12 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e4ebff', borderRadius: '14px', padding: '12px 14px', background: '#f7f9ff' }}>
            <span style={{ fontSize: '1.4rem', color: '#24324a', marginRight: 8 }}>₹</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${adminSettings?.minRecharge || 100}~${adminSettings?.maxRecharge || 10000}`}
              style={{ border: 'none', outline: 'none', fontSize: '1.3rem', color: '#24324a', width: '100%', background: 'transparent' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
            {quickAmounts.map(val => (
              <button 
                key={val}
                onClick={() => setAmount(val.toString())}
                style={{ 
                  background: amount === val.toString() ? '#eaf2ff' : '#f8fafc', color: '#24324a', 
                  padding: '12px 0', borderRadius: 12, fontSize: '0.95rem', cursor: 'pointer',
                  fontWeight: amount === val.toString() ? '700' : '600',
                  border: amount === val.toString() ? '1px solid #4b6fff' : '1px solid #eef2f8'
                }}
              >
                ₹{val.toLocaleString()}
              </button>
            ))}
          </div>

          <button 
            onClick={handleRecharge}
            style={{ 
              width: '100%', background: 'linear-gradient(135deg, #4b6fff, #2563eb)', color: 'white', border: 'none', 
              padding: '14px', borderRadius: 14, fontSize: '1rem', fontWeight: '700', 
              marginTop: 20, cursor: 'pointer', boxShadow: '0 10px 20px rgba(75,111,255,0.2)'
            }}
          >
            Recharge
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, color: '#7b8aa3', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={18} /> Security</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={18} /> Fast</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '0 18px 18px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280', fontSize: '0.92rem', background: 'white', borderRadius: '999px', padding: '10px 14px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
          <div style={{ background: '#eff6ff', borderRadius: '50%', padding: 4 }}>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
          </div>
          <span>{feedItems[feedIndex].name} successfully recharged ₹{feedItems[feedIndex].amount}</span>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
