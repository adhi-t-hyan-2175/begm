import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, Edit2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

const Withdraw = () => {
  const navigate = useNavigate();
  const { balance, requestWithdrawal, pendingWithdrawals, financialRecords, myOrders, adminSettings } = useWallet();
  const { user } = useAuth();
  
  const [amount, setAmount] = useState('');
  const [name, setName] = useState(user?.nickname || '');
  const [upiId, setUpiId] = useState('');
  const [isEditingUpi, setIsEditingUpi] = useState(!upiId); // start in edit mode if no UPI set
  const [upiError, setUpiError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const numAmount = parseFloat(amount);
  const minAmount = adminSettings?.minWithdrawal || 500;
  const maxAmount = adminSettings?.maxWithdrawal || 50000;
  const isValidAmount = !isNaN(numAmount) && numAmount >= minAmount && numAmount <= Math.min(balance, maxAmount);
  const fee = isValidAmount ? (numAmount * 0.1).toFixed(2) : '0.00';
  const received = isValidAmount ? (numAmount - parseFloat(fee)).toFixed(2) : '0.00';

  const hasRecharged = financialRecords.some(r => r.type === 'Recharge' && r.status === 'Success');
  const totalBets = myOrders ? myOrders.length : 0;
  const isUnlocked = hasRecharged && totalBets >= 50;

  const upiRegex = /^[\w.\-+]+@[\w]+$/;

  const handleSaveUpi = () => {
    if (!name.trim()) {
      setUpiError('Please enter your name.');
      return;
    }
    if (!upiRegex.test(upiId.trim())) {
      setUpiError('Invalid UPI ID. Format: name@bank (e.g., adith@ybl, 9876543210@paytm)');
      return;
    }
    setUpiError('');
    setIsEditingUpi(false);
  };

  const handleWithdrawal = () => {
    if (!isUnlocked) {
      alert('You must complete at least 1 recharge and place 50 bets to unlock withdrawals.');
      return;
    }
    if (!upiId || isEditingUpi) {
      alert('Please save your UPI details first.');
      return;
    }
    if (!isValidAmount) {
      if (numAmount < minAmount) alert(`Minimum withdrawal amount is ₹${minAmount}`);
      else if (numAmount > Math.min(balance, maxAmount)) alert(`Cannot withdraw more than ₹${Math.min(balance, maxAmount).toFixed(0)}`);
      else alert('Please enter a valid amount');
      return;
    }
    requestWithdrawal(user.id, user.email || '', numAmount, `${name} - ${upiId}`);
    setAmount('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const withdrawRecords = [
    ...pendingWithdrawals.filter(req => String(req.userId) === String(user.id)).map(req => ({
      id: req.id,
      amount: `₹${req.amount}`,
      status: 'Pending',
      time: new Date(req.timestamp).toLocaleString(),
      color: '#f59e0b'
    })),
    ...financialRecords.filter(r => r.type === 'Withdraw')
  ];

  return (
    <div style={{ background: 'linear-gradient(180deg, #f9fbff 0%, #f3f6fb 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', boxShadow: '0 1px 10px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#24324a', cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={28} />
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.15rem', margin: 0, fontWeight: '800', color: '#24324a' }}>Withdrawal</h2>
        <div style={{ width: 28 }} />
      </div>

      {/* Wallet Balance */}
      <div style={{ padding: '18px 18px 10px' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #2563eb)', borderRadius: '22px', padding: '20px', color: 'white', boxShadow: '0 16px 30px rgba(15,23,42,0.16)' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: 4 }}>My Wallet</div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800' }}>₹{balance.toFixed(2)}</div>
        </div>
      </div>

      {/* UPI Details */}
      <div style={{ background: 'white', borderRadius: '24px', margin: '0 18px 16px', padding: '18px', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: '700', color: '#24324a', fontSize: '1rem' }}>UPI Details</div>
          {!isEditingUpi && upiId && (
            <button onClick={() => setIsEditingUpi(true)} style={{ background: 'none', border: '1px solid #4b6fff', color: '#4b6fff', borderRadius: 8, padding: '4px 10px', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: '600' }}>
              <Edit2 size={13} /> Change
            </button>
          )}
        </div>

        {isEditingUpi ? (
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: 4 }}>Account Holder Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', fontSize: '0.95rem', color: '#24324a', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: 4 }}>UPI ID</label>
              <input
                value={upiId}
                onChange={e => { setUpiId(e.target.value); setUpiError(''); }}
                placeholder="e.g., name@ybl or 9876543210@paytm"
                style={{ width: '100%', border: upiError ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', fontSize: '0.95rem', color: '#24324a', outline: 'none', boxSizing: 'border-box' }}
              />
              {upiError && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>{upiError}</div>}
              <div style={{ color: '#94a3b8', fontSize: '0.77rem', marginTop: 6 }}>
                Accepted: name@upi · phone@paytm · phone@ybl · name@okaxis etc.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSaveUpi} style={{ flex: 1, background: 'linear-gradient(135deg, #2563eb, #4f46e5)', color: 'white', border: 'none', borderRadius: 10, padding: '11px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}>
                Save UPI
              </button>
              {upiId && (
                <button onClick={() => { setIsEditingUpi(false); setUpiError(''); }} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', fontSize: '0.95rem' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : upiId ? (
          <div style={{ background: '#f4f7ff', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ background: '#ff7a1a', color: 'white', padding: '2px 8px', fontSize: '0.72rem', borderRadius: 999, fontWeight: '700' }}>UPI</span>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#24324a' }}>{name}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>{upiId}</div>
            </div>
            <CheckCircle size={22} color="#10b981" />
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>
            No UPI set. Click "Change" to add one.
          </div>
        )}
      </div>

      {/* Withdrawal Amount */}
      <div style={{ background: 'white', borderRadius: '24px', margin: '0 18px 16px', padding: '18px', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}>
        <div style={{ fontWeight: '700', color: '#24324a', marginBottom: 8, fontSize: '1rem' }}>Withdrawal Amount</div>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ffd7a8', borderRadius: 14, padding: '12px 14px', marginBottom: 10, background: '#fff9f0' }}>
          <span style={{ fontSize: '1.2rem', color: '#24324a', marginRight: 8 }}>₹</span>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Please Input"
            type="number"
            style={{ border: 'none', outline: 'none', fontSize: '1.05rem', color: '#24324a', width: '100%', background: 'transparent' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7b8aa3', fontSize: '0.82rem', marginBottom: 12 }}>
          <div>Fee 10%</div>
          <div>Min ₹{minAmount} • Max ₹{Math.min(balance, maxAmount).toFixed(0)}</div>
        </div>

        {amount && isValidAmount && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 12, marginBottom: 14, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Fee (10%):</span>
              <span style={{ color: '#dc3545', fontWeight: '700' }}>- ₹{fee}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>You will receive:</span>
              <span style={{ color: '#10b981', fontWeight: '700' }}>₹{received}</span>
            </div>
          </div>
        )}

        {!isUnlocked && (
          <div style={{ background: '#fff5f5', border: '1px solid #ffe3e3', padding: 14, borderRadius: 12, marginBottom: 14, fontSize: '0.85rem', color: '#c92a2a' }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>Withdrawal Locked 🔒</strong>
            To unlock withdrawals, complete your first recharge and place at least 50 bets.
            <div style={{ marginTop: 8 }}>
              <div>• Recharge: {hasRecharged ? '✅ Complete' : '❌ Pending'}</div>
              <div>• Bets: {totalBets}/50 {totalBets >= 50 ? '✅' : '❌'}</div>
            </div>
          </div>
        )}

        {submitted && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: 12, borderRadius: 12, marginBottom: 14, color: '#166534', fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>
            ✅ Withdrawal request submitted! Waiting for Admin approval.
          </div>
        )}

        <button
          onClick={handleWithdrawal}
          style={{
            width: '100%',
            background: (isValidAmount && isUnlocked && upiId) ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#d8dce6',
            color: 'white', border: 'none', padding: '14px', borderRadius: 14,
            fontSize: '1rem', fontWeight: '700',
            cursor: (isValidAmount && isUnlocked && upiId) ? 'pointer' : 'not-allowed'
          }}
          disabled={!(isValidAmount && isUnlocked && upiId)}
        >
          Withdrawal
        </button>
      </div>

      {/* Withdrawal Records */}
      <div style={{ padding: '0 18px 18px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#24324a', fontWeight: '700' }}>Withdrawals Record</h3>
        {withdrawRecords.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 24, padding: '24px', background: 'white', borderRadius: 16 }}>No withdrawal records yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {withdrawRecords.map((rec, i) => (
              <div key={i} style={{ background: 'white', padding: 14, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#24324a' }}>Withdrawal</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{rec.time}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: '#dc3545' }}>{rec.amount}</div>
                  <div style={{ fontSize: '0.8rem', color: rec.color || '#94a3b8', fontWeight: '700', marginTop: 4 }}>{rec.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Withdraw;
