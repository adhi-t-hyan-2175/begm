import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, Search, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

const TopUp = () => {
  const navigate = useNavigate();
  const { balance, addBalance, bonusBalance, addBonusBalance } = useWallet();
  const { user } = useAuth();
  
  // Mocking the invite state for this demo based on the requirements: 
  // "if he invited any person on that day or in last 3 days he can use 10 % discount"
  const hasInvitedRecently = true; 
  
  const [ffUid, setFfUid] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const products = [
    { id: 1, name: '100 Diamonds', price: 80 },
    { id: 2, name: '310 Diamonds', price: 250 },
    { id: 3, name: '520 Diamonds', price: 400 },
    { id: 4, name: '1060 Diamonds', price: 800 },
    { id: 5, name: '2180 Diamonds', price: 1600 },
    { id: 6, name: '5600 Diamonds', price: 4000 }
  ];

  const getCalculatedAmounts = (price) => {
    // 10% discount on the entire order if they invited someone recently
    const discountAmount = hasInvitedRecently ? (price * 0.1) : 0;
    
    // Attempt to pay for the discount using the bonus balance
    const bonusToUse = Math.min(bonusBalance, discountAmount);
    
    // The rest is paid from main balance (this covers the 90% base cost + any discount amount not covered by bonus)
    const mainToUse = price - bonusToUse;
    
    return { discountAmount, bonusToUse, mainToUse };
  };

  const handlePurchase = () => {
    if (!ffUid) return alert('Please enter your Free Fire UID');
    if (!selectedProduct) return alert('Please select a package');
    
    const { bonusToUse, mainToUse } = getCalculatedAmounts(selectedProduct.price);
    
    if (balance < mainToUse) {
      return alert('Insufficient Main Balance!');
    }
    
    // Deduct balances
    addBalance(-mainToUse);
    if (bonusToUse > 0) addBonusBalance(-bonusToUse);
    
    alert(`Successfully purchased ${selectedProduct.name} for UID: ${ffUid}\nPaid ₹${mainToUse.toFixed(2)} from Main, ₹${bonusToUse.toFixed(2)} from Bonus.`);
    navigate('/profile');
  };

  return (
    <div style={{ background: '#f8fbff', minHeight: '100vh', paddingBottom: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', padding: '16px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <ChevronLeft size={28} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: '800', marginRight: 28 }}>Free Fire Top-Up</span>
      </div>

      {/* UID Input */}
      <div style={{ background: 'white', margin: '16px', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>Player ID (UID)</div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '12px', padding: '10px 14px' }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Enter Free Fire UID" 
            value={ffUid}
            onChange={(e) => setFfUid(e.target.value)}
            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', marginLeft: '10px', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}
          />
        </div>
      </div>

      {/* Packages Grid */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>Select Package</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {products.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedProduct(p)}
              style={{ 
                background: 'white', 
                borderRadius: '16px', 
                padding: '16px', 
                textAlign: 'center', 
                cursor: 'pointer',
                border: selectedProduct?.id === p.id ? '2px solid #2563eb' : '2px solid transparent',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                position: 'relative'
              }}
            >
              {selectedProduct?.id === p.id && (
                <CheckCircle size={20} color="#2563eb" style={{ position: 'absolute', top: 8, right: 8 }} />
              )}
              <Gift size={32} color="#ec4899" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>{p.name}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>₹{p.price}</div>
              {hasInvitedRecently ? (
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>10% Off via Bonus (₹{(p.price * 0.1).toFixed(0)})</div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Invite a friend for 10% off</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Checkout Footer */}
      {selectedProduct && (() => {
        const { bonusToUse, mainToUse, discountAmount } = getCalculatedAmounts(selectedProduct.price);
        return (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '16px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Package:</span>
              <span style={{ fontWeight: '800', color: '#1e293b' }}>{selectedProduct.name}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: '#10b981' }}>Invite Discount (10%):</span>
                <span style={{ fontWeight: '600', color: '#10b981' }}>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Pay from Main:</span>
              <span style={{ fontWeight: '800', color: '#2563eb' }}>₹{mainToUse.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#64748b' }}>Pay from Bonus:</span>
              <span style={{ fontWeight: '800', color: '#ec4899' }}>₹{bonusToUse.toFixed(2)}</span>
            </div>
            <button 
              onClick={handlePurchase}
              style={{ width: '100%', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)' }}
            >
              Pay & Top-Up
            </button>
          </div>
        );
      })()}
    </div>
  );
};

export default TopUp;
