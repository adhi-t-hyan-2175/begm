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
  const [status, setStatus] = useState('input'); // 'input', 'payment', 'waiting', 'success'
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderUpi, setSenderUpi] = useState('');

  const quickAmounts = [100, 150, 1400, 4500, 10000, 40000];

  // Auto-scrolling feed simulation
  const [feedIndex, setFeedIndex] = useState(0);
  const feedItems = [
    { name: '**951', id: 'UID56599', amount: 1500, time: '20:44' },
    { name: '**859', id: 'UID77684', amount: 1500, time: '16:33' },
    { name: '**605', id: 'UID57794', amount: 1000, time: '00:19' },
    { name: '**392', id: 'UID54741', amount: 2500, time: '17:38' },
    { name: '**553', id: 'UID57798', amount: 200, time: '05:19' },
    { name: '**369', id: 'UID37415', amount: 1000, time: '03:22' },
    { name: '**162', id: 'UID83641', amount: 10000, time: '21:49' },
    { name: '**523', id: 'UID93093', amount: 1500, time: '18:56' },
    { name: '**338', id: 'UID40953', amount: 500, time: '09:12' },
    { name: '**390', id: 'UID13120', amount: 200, time: '08:35' },
    { name: '**321', id: 'UID83534', amount: 1000, time: '20:08' },
    { name: '**464', id: 'UID90976', amount: 500, time: '19:06' },
    { name: '**608', id: 'UID94969', amount: 500, time: '08:54' },
    { name: '**567', id: 'UID92545', amount: 1500, time: '18:45' },
    { name: '**918', id: 'UID93201', amount: 500, time: '09:32' },
    { name: '**520', id: 'UID36708', amount: 200, time: '09:20' },
    { name: '**676', id: 'UID85896', amount: 5000, time: '23:12' },
    { name: '**197', id: 'UID56828', amount: 1000, time: '00:21' },
    { name: '**734', id: 'UID41691', amount: 100, time: '07:36' },
    { name: '**462', id: 'UID71871', amount: 1500, time: '06:17' },
    { name: '**601', id: 'UID63921', amount: 1000, time: '16:02' },
    { name: '**786', id: 'UID75659', amount: 5000, time: '06:39' },
    { name: '**923', id: 'UID65094', amount: 1000, time: '15:53' },
    { name: '**201', id: 'UID58549', amount: 5000, time: '18:37' },
    { name: '**131', id: 'UID27963', amount: 200, time: '10:15' },
    { name: '**500', id: 'UID28995', amount: 200, time: '18:41' },
    { name: '**210', id: 'UID93720', amount: 300, time: '11:45' },
    { name: '**179', id: 'UID87755', amount: 500, time: '05:46' },
    { name: '**346', id: 'UID77488', amount: 1500, time: '09:46' },
    { name: '**589', id: 'UID50768', amount: 10000, time: '06:54' },
    { name: '**982', id: 'UID37465', amount: 5000, time: '00:37' },
    { name: '**843', id: 'UID96334', amount: 1000, time: '07:45' },
    { name: '**791', id: 'UID14787', amount: 2500, time: '01:40' },
    { name: '**252', id: 'UID59405', amount: 300, time: '08:45' },
    { name: '**334', id: 'UID35528', amount: 100, time: '09:46' },
    { name: '**440', id: 'UID38686', amount: 100, time: '16:52' },
    { name: '**730', id: 'UID69553', amount: 1000, time: '06:42' },
    { name: '**977', id: 'UID81741', amount: 5000, time: '21:09' },
    { name: '**770', id: 'UID76935', amount: 1000, time: '08:31' },
    { name: '**382', id: 'UID83788', amount: 300, time: '13:19' },
    { name: '**358', id: 'UID12240', amount: 2500, time: '04:48' },
    { name: '**575', id: 'UID49291', amount: 100, time: '15:43' },
    { name: '**802', id: 'UID76161', amount: 500, time: '00:31' },
    { name: '**122', id: 'UID72205', amount: 100, time: '10:09' },
    { name: '**102', id: 'UID70177', amount: 5000, time: '23:07' },
    { name: '**477', id: 'UID99877', amount: 300, time: '01:33' },
    { name: '**250', id: 'UID17184', amount: 100, time: '18:08' },
    { name: '**435', id: 'UID52071', amount: 100, time: '20:52' },
    { name: '**593', id: 'UID94794', amount: 1500, time: '23:24' },
    { name: '**305', id: 'UID85353', amount: 500, time: '14:27' },
    { name: '**899', id: 'UID53503', amount: 300, time: '09:48' },
    { name: '**233', id: 'UID18299', amount: 500, time: '18:04' },
    { name: '**147', id: 'UID83066', amount: 5000, time: '22:02' },
    { name: '**112', id: 'UID72687', amount: 200, time: '17:29' },
    { name: '**936', id: 'UID30817', amount: 5000, time: '23:36' },
    { name: '**932', id: 'UID19295', amount: 100, time: '08:03' },
    { name: '**642', id: 'UID28386', amount: 2500, time: '07:40' },
    { name: '**245', id: 'UID97231', amount: 300, time: '16:39' },
    { name: '**725', id: 'UID48856', amount: 100, time: '17:02' },
    { name: '**854', id: 'UID43401', amount: 300, time: '07:23' },
    { name: '**121', id: 'UID56045', amount: 100, time: '16:52' },
    { name: '**344', id: 'UID29324', amount: 10000, time: '03:35' },
    { name: '**366', id: 'UID20064', amount: 300, time: '16:51' },
    { name: '**252', id: 'UID44903', amount: 1000, time: '03:13' },
    { name: '**686', id: 'UID24290', amount: 100, time: '03:39' },
    { name: '**847', id: 'UID89963', amount: 1000, time: '11:24' },
    { name: '**862', id: 'UID70626', amount: 1500, time: '18:43' },
    { name: '**949', id: 'UID86240', amount: 10000, time: '00:02' },
    { name: '**253', id: 'UID80005', amount: 2500, time: '20:06' },
    { name: '**238', id: 'UID33611', amount: 10000, time: '10:56' },
    { name: '**295', id: 'UID91557', amount: 300, time: '01:38' },
    { name: '**294', id: 'UID60184', amount: 2500, time: '04:31' },
    { name: '**344', id: 'UID87443', amount: 200, time: '05:23' },
    { name: '**225', id: 'UID31425', amount: 10000, time: '09:58' },
    { name: '**953', id: 'UID45758', amount: 300, time: '15:02' },
    { name: '**167', id: 'UID46176', amount: 2500, time: '14:11' },
    { name: '**344', id: 'UID85563', amount: 200, time: '12:07' },
    { name: '**847', id: 'UID28963', amount: 2500, time: '21:43' },
    { name: '**866', id: 'UID93460', amount: 100, time: '02:20' },
    { name: '**838', id: 'UID15804', amount: 5000, time: '15:35' },
    { name: '**123', id: 'UID66815', amount: 5000, time: '13:44' },
    { name: '**873', id: 'UID24945', amount: 1000, time: '05:55' },
    { name: '**957', id: 'UID60801', amount: 200, time: '12:37' },
    { name: '**158', id: 'UID37444', amount: 500, time: '09:04' },
    { name: '**876', id: 'UID22718', amount: 500, time: '13:56' },
    { name: '**288', id: 'UID91653', amount: 1000, time: '19:46' },
    { name: '**776', id: 'UID76450', amount: 1500, time: '15:10' },
    { name: '**917', id: 'UID32842', amount: 2500, time: '18:35' },
    { name: '**823', id: 'UID94379', amount: 5000, time: '05:01' },
    { name: '**877', id: 'UID92182', amount: 1000, time: '01:07' },
    { name: '**680', id: 'UID43183', amount: 10000, time: '03:09' },
    { name: '**327', id: 'UID46476', amount: 1000, time: '21:32' },
    { name: '**913', id: 'UID92376', amount: 100, time: '23:13' },
    { name: '**582', id: 'UID22614', amount: 5000, time: '12:20' },
    { name: '**211', id: 'UID41168', amount: 1500, time: '06:51' },
    { name: '**692', id: 'UID89133', amount: 300, time: '01:22' },
    { name: '**653', id: 'UID32147', amount: 200, time: '20:18' },
    { name: '**430', id: 'UID14775', amount: 100, time: '23:51' },
    { name: '**658', id: 'UID78961', amount: 300, time: '15:16' },
    { name: '**488', id: 'UID29776', amount: 100, time: '23:07' },
    { name: '**909', id: 'UID14685', amount: 300, time: '11:14' },
    { name: '**414', id: 'UID45155', amount: 100, time: '06:28' },
    { name: '**684', id: 'UID12173', amount: 1500, time: '00:36' },
    { name: '**727', id: 'UID44524', amount: 200, time: '19:08' },
    { name: '**607', id: 'UID17335', amount: 5000, time: '19:28' },
    { name: '**588', id: 'UID92272', amount: 300, time: '01:43' },
    { name: '**581', id: 'UID20409', amount: 1500, time: '01:17' },
    { name: '**293', id: 'UID29985', amount: 1500, time: '13:26' },
    { name: '**221', id: 'UID60577', amount: 2500, time: '19:03' },
    { name: '**560', id: 'UID96478', amount: 300, time: '19:28' }
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
        setStatus('success');
      }
    }
  }, [pendingRecharges, status, currentRequestId]);

  const handleRechargeClick = () => {
    const numAmount = parseInt(amount, 10);
    const minAmount = adminSettings?.minRecharge || 100;
    const maxAmount = adminSettings?.maxRecharge || 10000;
    if (!numAmount || numAmount < minAmount || numAmount > maxAmount) {
      alert(`Please enter a valid amount between ₹${minAmount} and ₹${maxAmount}`);
      return;
    }
    
    // Transition to payment upload screen
    setStatus('payment');
  };

  const handleSubmitUtr = async () => {
    if (!senderUpi || !senderUpi.includes('@')) {
      alert('Please enter a valid UPI ID.');
      return;
    }
    if (!senderName || senderName.trim().length < 2) {
      alert('Please enter your full name.');
      return;
    }
    if (!utrNumber || utrNumber.length < 12) {
      alert('Please enter a valid 12-digit UTR or Reference Number.');
      return;
    }
    try {
      const numAmount = parseInt(amount, 10);
      const reqId = await requestRecharge(user.id, numAmount, utrNumber, senderName, senderUpi);
      if (reqId) {
        setCurrentRequestId(reqId);
        setStatus('waiting');
      }
    } catch (err) {
      alert(err.message || "Failed to submit request");
    }
  };

  if (status === 'payment') {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 24 }}>
        <h2 style={{ marginTop: 20, color: '#333', textAlign: 'center' }}>Make Payment</h2>
        <div style={{ background: 'white', padding: 24, borderRadius: 12, marginTop: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: 20 }}>
            Please pay <strong>₹{amount}</strong> to the UPI ID below using any UPI app (GPay, PhonePe, Paytm).
          </p>
          
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 24, border: '1px solid #e9ecef', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: 8 }}>Receiver Name</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#000', marginBottom: 12 }}>
              {adminSettings?.adminUpiName || 'BETX Official'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: 8 }}>Admin UPI ID</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#000', marginBottom: 16 }}>
              {adminSettings?.adminUpiId || 'admin@upi'}
            </div>
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(adminSettings?.adminUpiId || 'admin@upi');
                alert("UPI ID Copied!");
              }}
              style={{ background: '#e9ecef', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
            >
              Copy UPI ID
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', color: '#495057', marginBottom: 8, fontWeight: '600' }}>
              Your UPI ID (Sender)
            </label>
            <input 
              type="text" 
              value={senderUpi}
              onChange={(e) => setSenderUpi(e.target.value)}
              placeholder="yourname@bank"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', color: '#495057', marginBottom: 8, fontWeight: '600' }}>
              Your Name (Sender)
            </label>
            <input 
              type="text" 
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="John Doe"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', color: '#495057', marginBottom: 8, fontWeight: '600' }}>
              12-Digit UTR / Reference No.
            </label>
            <input 
              type="text" 
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. 312345678901"
              maxLength={12}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #ced4da', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <button 
            onClick={handleSubmitUtr}
            style={{ width: '100%', background: '#007bff', color: 'white', padding: 14, borderRadius: 8, border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}
          >
            I Have Paid
          </button>
          
          <button 
            onClick={() => setStatus('input')}
            style={{ width: '100%', background: 'transparent', color: '#6c757d', padding: 14, borderRadius: 8, border: '1px solid #ced4da', fontSize: '1rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
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
            onClick={handleRechargeClick}
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
