import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

const FinancialDetails = () => {
  const navigate = useNavigate();
  const { financialRecords } = useWallet();

  const nonBetRecords = financialRecords.filter((record) => {
    if (!record.type) return true;
    const typeLower = record.type.toLowerCase();
    return !typeLower.includes('bet') && !typeLower.includes('win') && !typeLower.includes('loss');
  });
  const allRecords = [...nonBetRecords].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 70 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', background: 'rgba(255,255,255,0.95)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#24324a', cursor: 'pointer' }}><ChevronLeft size={28} /></button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.15rem', margin: 0, fontWeight: '800', color: '#24324a' }}>Financial Details</h2>
        <div style={{ width: 28 }}></div>
      </div>

      <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #eaf0ff', color: '#7b8aa3', fontSize: '0.85rem', fontWeight: '700', background: 'white' }}>
        <div style={{ flex: 1 }}>Type / ID</div>
        <div style={{ flex: 1, textAlign: 'center' }}>Amount</div>
        <div style={{ flex: 1, textAlign: 'right' }}>Time / Status</div>
      </div>

      <div style={{ overflowY: 'auto' }}>
        {allRecords.length > 0 ? allRecords.map((row, idx) => (
          <div key={idx} style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #f3f7ff', alignItems: 'center', fontSize: '0.92rem', background: idx % 2 === 0 ? 'white' : '#fbfdff' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', color: '#24324a', marginBottom: 4 }}>{row.type}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{row.id}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', color: row.amount.includes('+') ? '#10b981' : '#dc3545', fontWeight: '800' }}>{row.amount}</div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ color: '#475569', fontSize: '0.82rem', marginBottom: 4 }}>{row.time}</div>
              <div style={{ color: row.color, fontSize: '0.8rem', fontWeight: '700' }}>{row.status}</div>
            </div>
          </div>
        )) : (<div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No data</div>)}
      </div>
    </div>
  );
};

export default FinancialDetails;
