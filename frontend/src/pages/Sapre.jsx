import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  
  getOrderBadgeColor
} from '../hooks/useGameTimer';
import { useGlobalGame } from '../contexts/GlobalGameContext';
import { useWallet } from '../contexts/WalletContext';
import BetCardModal from '../components/BetCardModal';
import ResultCard from '../components/ResultCard';

const GAME = 'Sapre';
const MULTIPLIERS = { Green: 1.9, Red: 1.9, Violet: 4.5, green: 1.9, red: 1.9, violet: 4.5 };

const AVATARS = ['🧑','👩','👦','👧','🧔','👱','🧕','🧑‍🦱'];
const randAvatar = (seed) => AVATARS[Math.abs(String(seed).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATARS.length];
const getBallColor = (rec) => {
  if (!rec) return '#3d4477';
  const lbl = String(rec.label || rec.result?.label || '').toLowerCase();
  if (lbl.includes('green') || lbl === 'g') return '#48b85c';
  if (lbl.includes('red') || lbl === 'r') return '#e0413c';
  if (lbl.includes('violet') || lbl === 'v') return '#7c4ab8';
  return rec.color?.[0] || '#3d4477';
};
const getBallText = (rec) => {
  if (!rec) return '?';
  const lbl = String(rec.label || rec.result?.label || '').toLowerCase();
  if (lbl.includes('green') || lbl === 'g') return 'G';
  if (lbl.includes('red') || lbl === 'r') return 'R';
  if (lbl.includes('violet') || lbl === 'v') return 'V';
  return '?';
};
const getSelColor = (sel) => {
  const s = String(sel||'').toLowerCase();
  if (s === 'green') return '#48b85c';
  if (s === 'red') return '#e0413c';
  if (s === 'violet') return '#7c4ab8';
  return '#888';
};

const Sapre = () => {
  const navigate = useNavigate();
  const { timeLeft, isBettingOpen, period, round_id, previousPeriod, formatTime, secondsIntoPeriod, status, realHistory } = useGlobalGame(GAME);
  const { balance, placeBet, myOrders } = useWallet();
  const timeStr = formatTime();

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('everyone');
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState('Green');
  const [resultCard, setResultCard] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const settledRef = useRef('');

  // Fake orders restored per Phase 2
  const fakePoolRef = useRef([]);

  useEffect(() => {
    setLiveOrders([]);
    const selections = ['Green', 'Red', 'Violet'];
    const amounts = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const newPool = [];
    for (let i = 0; i < 150; i++) {
        newPool.push({
            id: period + '_' + i + '_' + Math.random().toString(36).substring(7),
            period: period,
            user: '**' + Math.floor(Math.random() * 900 + 100),
            select: selections[Math.floor(Math.random() * selections.length)],
            point: amounts[Math.floor(Math.random() * amounts.length)]
        });
    }
    fakePoolRef.current = newPool;
  }, [period]);

  useEffect(() => {
    if (!isBettingOpen) return;
    const interval = setInterval(() => {
       if (fakePoolRef.current.length > 0) {
           const nextOrder = fakePoolRef.current.shift();
           setLiveOrders(prev => [nextOrder, ...prev].slice(0, 50));
       }
    }, Math.floor(Math.random() * 2000) + 1000); // 1 to 3 seconds
    return () => clearInterval(interval);
  }, [isBettingOpen]);


  const history = (realHistory || []).map(r => ({
    period: r.period,
    label: r.result?.label,
    number: r.result?.number,
    color: r.result?.color
  }));
  const displayHistory = history.slice(0, 14);

  const REVEAL_ANIMATION_MS = 4000;

  useEffect(() => {
    // We only trigger when entering 'revealing' phase exactly once per round_id
    if (status === 'revealing' && settledRef.current !== round_id) {
      // The result must already be in memory from Supabase realtime
      const resultObj = realHistory.find(r => r.round_id === round_id);
      if (!resultObj) return; // Wait for realtime event to deliver the result

      settledRef.current = round_id;
      
      // Calculate ResultCard payout strictly based on DB winner
      const myCurrentBets = myOrders.filter(o => o.game === GAME && o.round_id === round_id);
      if (myCurrentBets.length > 0) {
        const totalBet = myCurrentBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        
        const resultLabel = resultObj.label || resultObj.result?.label || 'Unknown';
        
        let totalWin = 0;
        myCurrentBets.forEach(b => {
          const betSel = String(b.selection).toLowerCase().trim();
          const resSel = String(resultLabel).toLowerCase().trim();
          if (betSel === resSel) {
            const multiplier = betSel === 'violet' ? 4.5 : 1.9;
            totalWin += parseFloat(b.amount) * multiplier;
          }
        });
        
        const won = totalWin > 0;
        const uniqueSelections = [...new Set(myCurrentBets.map(b => b.selection))];
        const selectionStr = uniqueSelections.join(' + ');
        
        // Wait for the reveal spin to finish before popping up
        setTimeout(() => {
          setResultCard({
            won,
            period: period,
            game: GAME,
            selection: selectionStr,
            selectionColor: uniqueSelections.length > 1 ? '#555' : getSelColor(selectionStr),
            resultLabel,
            resultColor: getSelColor(resultLabel),
            betAmount: totalBet,
            winAmount: totalWin > 0 ? totalWin : 0,
          });
        }, REVEAL_ANIMATION_MS);
      }
    }
  }, [status, round_id, realHistory, myOrders, period]);

  const openBetCard = (sel) => { if (!isBettingOpen) return; setPendingSelection(sel); setBetModalOpen(true); };
  const handleConfirmBet = (selection, amount) => { 
    if (!round_id) { alert('Connecting to server...'); return; }
    setBetModalOpen(false); 
    if (!placeBet(GAME, period, round_id, selection, amount)) alert('Insufficient balance'); 
  };

  const myActiveBets = myOrders.filter(o => o.game === GAME && o.round_id === round_id);
  const myGameOrders = myOrders.filter(o => o.game === GAME);

  return (
    <div className="rui-screen">
      <div className="rui-header">
        <button className="rui-header-back" onClick={() => navigate(-1)}><ChevronLeft size={22} /></button>
        <div className="rui-header-title">Sapre</div>
        <button className="rui-header-rules">Rules</button>
      </div>
      <div className="rui-timer-bar">
        <div><div className="rui-timer-label">Period</div><div className="rui-timer-val">{period}</div></div>
        <div style={{ textAlign: 'right' }}>
          <div className="rui-timer-label">Count Down</div>
          <div className="rui-timer-blocks">
            <div className="rui-timer-digit">{timeStr.m1}</div><div className="rui-timer-digit">{timeStr.m2}</div>
            <div className="rui-timer-colon">:</div>
            <div className="rui-timer-digit">{timeStr.s1}</div><div className="rui-timer-digit">{timeStr.s2}</div>
          </div>
        </div>
      </div>
      <div className="rui-bet-row">
        <button className="rui-bet-pill rui-pill-green" onClick={() => openBetCard('Green')} disabled={!isBettingOpen}>
          <span className="rui-bet-pill-label">Green</span>
          <span className="rui-bet-pill-ratio">1:1.9</span>
        </button>
        <button className="rui-bet-pill rui-pill-violet" onClick={() => openBetCard('Violet')} disabled={!isBettingOpen}>
          <span className="rui-bet-pill-label">Violet</span>
          <span className="rui-bet-pill-ratio">1:4.5</span>
        </button>
        <button className="rui-bet-pill rui-pill-red" onClick={() => openBetCard('Red')} disabled={!isBettingOpen}>
          <span className="rui-bet-pill-label">Red</span>
          <span className="rui-bet-pill-ratio">1:1.9</span>
        </button>
      </div>
      <div className="rui-record-section">
        <div className="rui-record-header">
          <span className="rui-record-title">Sapre Record</span>
          <button className="rui-record-more" onClick={() => setShowHistoryModal(true)}>more &gt;</button>
        </div>
        <div className="rui-ball-row" style={{ padding: '0 4px 4px', width: '100%' }}>
          {displayHistory.slice().reverse().map((rec, i) => {
            const color = getBallColor(rec);
            const ballText = getBallText(rec);
            return (<div key={i} className="rui-ball-item"><div className="rui-ball" style={{ background: color }}>{ballText}</div><div className="rui-ball-period">{String(rec.period || '').slice(-3)}</div></div>);
          })}
        </div>
      </div>
      {myActiveBets.length > 0 && (
        <div className="rui-active-bets">
          <div className="rui-active-bets-title">💰 Your Active Bets</div>
          {myActiveBets.map(o => (<div key={o.id} className="rui-active-bet-row"><span style={{ background: getSelColor(o.selection), color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 700 }}>{o.selection}</span><strong>₹{o.amount}</strong></div>))}
        </div>
      )}
      <div className="rui-tabs" style={{ marginTop: 8 }}>
        <button className={`rui-tab ${activeTab === 'everyone' ? 'active' : ''}`} onClick={() => setActiveTab('everyone')}>Everyone's Order</button>
        <button className={`rui-tab ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>My Order</button>
      </div>
      <div className="rui-order-section">
        {activeTab === 'everyone' ? (
          <table className="rui-order-table">
            <thead><tr><th>Period</th><th>User</th><th>Select</th><th>Point</th></tr></thead>
            <tbody>
              {liveOrders.map((ord, i) => (
                <tr key={ord.id} style={{ animation: `slideInRow 0.35s ease ${Math.min(i,8)*60}ms both`, opacity: 0 }}>
                  <td>{ord.period}</td>
                  <td><div className="rui-user-cell"><div className="rui-avatar">{randAvatar(ord.user)}</div>{ord.user}</div></td>
                  <td><div className="rui-select-badge" style={{ background: getOrderBadgeColor(ord.select) }}>{ord.select?.charAt(0)}</div></td>
                  <td>₹{ord.point}</td>
                </tr>
              ))}
              {liveOrders.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#bbb' }}>{isBettingOpen ? 'Waiting for bets...' : 'Round closed'}</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="rui-order-table">
            <thead><tr><th>Period</th><th>Select</th><th>Bet</th><th>Result</th></tr></thead>
            <tbody>
              {myGameOrders.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#bbb' }}>No bets yet</td></tr>
                : myGameOrders.map(ord => (
                    <tr key={ord.id}>
                      <td style={{ color: '#666', fontSize: '0.82rem' }}>{ord.period}</td>
                      <td><div className="rui-select-badge" style={{ background: getSelColor(ord.selection) }}>{ord.selection?.charAt(0)}</div></td>
                      <td>₹{ord.amount}</td>
                      <td>{ord.status === 'Pending' ? <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem' }}>Pending</span> : ord.status === 'Won' ? <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.88rem' }}>▲ +₹{ord.winAmount?.toFixed(2)}</span> : <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.88rem' }}>✗ Lost</span>}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>
      <BetCardModal isOpen={betModalOpen} game={GAME} selection={pendingSelection} defaultAmount={10} minAmount={5} maxAmount={5000} feePercent={2} showNumberSelector={false} onClose={() => setBetModalOpen(false)} onConfirm={handleConfirmBet} />
      <ResultCard isOpen={!!resultCard} result={resultCard} onClose={() => setResultCard(null)} />
      {showHistoryModal && (
        <div className="rui-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="rui-modal" onClick={e => e.stopPropagation()}>
            <div className="rui-modal-header"><span className="rui-modal-title">Sapre History</span><button className="rui-modal-close" onClick={() => setShowHistoryModal(false)}>×</button></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {history.map((rec, i) => (<div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: getBallColor(rec), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>{getBallText(rec)}</div><div style={{ fontSize: '0.6rem', color: '#999' }}>{String(rec.period || '').slice(-3)}</div></div>))}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideInRow { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};
export default Sapre;
