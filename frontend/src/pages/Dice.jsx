import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  generateHistory,
  getOrderBadgeColor
} from '../hooks/useGameTimer';
import { useGlobalGame } from '../contexts/GlobalGameContext';
import { useWallet } from '../contexts/WalletContext';
import BetCardModal from '../components/BetCardModal';
import ResultCard from '../components/ResultCard';

const GAME = 'Dice';
const MULTIPLIERS = { Small: 1.9, Large: 1.9, Tie: 4.9, small: 1.9, large: 1.9, tie: 4.9, '7': 4.9 };

const AVATARS = ['🧑','👩','👦','👧','🧔','👱','🧕','🧑‍🦱'];
const randAvatar = (seed) => AVATARS[Math.abs(String(seed).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATARS.length];

const getDiceColor = (num) => {
  const n = parseInt(num);
  if (n === 7) return '#e8b84d';
  if (n >= 2 && n <= 6) return '#0ea5e9';
  if (n >= 8 && n <= 12) return '#e0413c';
  return '#3d4477';
};
const getLabelColor = (lbl) => {
  const l = String(lbl||'').toLowerCase();
  if (l === 'small') return '#0ea5e9';
  if (l === 'large') return '#e0413c';
  if (l === 'tie' || l === '7') return '#e8b84d';
  return '#888';
};

// Determine result label from dice result
const getDiceResultLabel = (result) => {
  if (!result) return null;
  if (result.label) return result.label;
  const n = parseInt(result.number);
  if (n === 7) return 'Tie';
  if (n >= 2 && n <= 6) return 'Small';
  if (n >= 8 && n <= 12) return 'Large';
  return null;
};

const Dice = () => {
  const navigate = useNavigate();
  const { timeLeft, isBettingOpen, period, previousPeriod, formatTime, secondsIntoPeriod, status, realHistory } = useGlobalGame(GAME);
  const { balance, placeBet, myOrders } = useWallet();
  const timeStr = formatTime();

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [activeTab, setActiveTab] = useState('everyone');
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState('Small');
  const [resultCard, setResultCard] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const settledRef = useRef('');

  // Fake orders restored per Phase 2
  const fakePoolRef = useRef([]);

  useEffect(() => {
    setLiveOrders([]);
    const selections = ['Small', 'Tie', 'Large'];
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

  useEffect(() => {
    const myCurrentBets = myOrders.filter(o => o.game === GAME && o.period === period);
    if (myCurrentBets.length > 0) {
      // Check if ALL bets for this period have been settled
      const isSettled = myCurrentBets.every(b => b.status !== 'Pending');
      if (isSettled && settledRef.current !== period) {
        settledRef.current = period;
        
        // Aggregate total bets and total winnings
        const totalBet = myCurrentBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const totalWin = myCurrentBets.reduce((sum, b) => sum + parseFloat(b.winAmount || 0), 0);
        
        const won = myCurrentBets.some(b => b.status === 'Won');
        // If multiple selections, list them joined by ' + '
        const uniqueSelections = [...new Set(myCurrentBets.map(b => b.selection))];
        const selectionStr = uniqueSelections.join(' + ');
        
        // We use the first bet's result (which is identical across all of them)
        const resultLabel = myCurrentBets[0].result;
        
        setTimeout(() => {
          setResultCard({
            won,
            period: period,
            game: GAME,
            selection: selectionStr,
            selectionColor: uniqueSelections.length > 1 ? '#555' : getLabelColor(selectionStr),
            resultLabel,
            resultColor: getLabelColor(resultLabel),
            betAmount: totalBet,
            winAmount: totalWin > 0 ? totalWin : 0,
          });
        }, 800);
      }
    }
  }, [period, myOrders]);

  const openBetCard = (sel) => { if (!isBettingOpen) return; setPendingSelection(sel); setBetModalOpen(true); };
  const handleConfirmBet = (selection, amount) => { setBetModalOpen(false); if (!placeBet(GAME, period, selection, amount)) alert('Insufficient balance'); };

  const myActiveBets = myOrders.filter(o => o.game === GAME && o.period === period);
  const myGameOrders = myOrders.filter(o => o.game === GAME);

  return (
    <div className="rui-screen">
      <div className="rui-header">
        <button className="rui-header-back" onClick={() => navigate(-1)}><ChevronLeft size={22} /></button>
        <div className="rui-header-title">Dice</div>
        <button className="rui-header-rules" onClick={() => setShowRule(true)}>Rules</button>
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
        <button className="rui-bet-pill" style={{ background: '#0ea5e9' }} onClick={() => openBetCard('Small')} disabled={!isBettingOpen}>
          <span className="rui-bet-pill-label">Small</span>
          <span className="rui-bet-pill-ratio">1:1.9</span>
        </button>
        <button className="rui-bet-pill" style={{ background: '#e8b84d' }} onClick={() => openBetCard('Tie')} disabled={!isBettingOpen}>
          <span className="rui-bet-pill-label">Tie</span>
          <span className="rui-bet-pill-ratio">1:5</span>
        </button>
        <button className="rui-bet-pill rui-pill-red" onClick={() => openBetCard('Large')} disabled={!isBettingOpen}>
          <span className="rui-bet-pill-label">Large</span>
          <span className="rui-bet-pill-ratio">1:1.9</span>
        </button>
      </div>
      <div className="rui-record-section">
        <div className="rui-record-header">
          <span className="rui-record-title">Dice Record</span>
          <button className="rui-record-more" onClick={() => setShowHistoryModal(true)}>more &gt;</button>
        </div>
        <div className="rui-ball-row" style={{ padding: '0 4px 4px', width: '100%' }}>
          {displayHistory.slice().reverse().map((rec, i) => {
            const letter = rec.label ? rec.label.charAt(0) : '?';
            const color = rec.color ? rec.color[0] : (rec.label === 'Small' ? '#0ea5e9' : rec.label === 'Large' ? '#dc3545' : rec.label === 'Tie' ? '#f1c40f' : '#3d4477');
            return (<div key={i} className="rui-ball-item"><div className="rui-ball" style={{ background: color }}>{letter}</div><div className="rui-ball-period">{rec.period.slice(-3)}</div></div>);
          })}
        </div>
      </div>
      {myActiveBets.length > 0 && (
        <div className="rui-active-bets">
          <div className="rui-active-bets-title">💰 Your Active Bets</div>
          {myActiveBets.map(o => (<div key={o.id} className="rui-active-bet-row"><span style={{ background: getLabelColor(o.selection), color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 700 }}>{o.selection}</span><strong>₹{o.amount}</strong></div>))}
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
                      <td><div className="rui-select-badge" style={{ background: getLabelColor(ord.selection) }}>{ord.selection?.charAt(0)}</div></td>
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
            <div className="rui-modal-header"><span className="rui-modal-title">Dice History</span><button className="rui-modal-close" onClick={() => setShowHistoryModal(false)}>×</button></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {history.map((rec, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#444' }}>{rec.period}</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: getDiceColor(rec.number), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>{rec.number === 7 ? 'T' : (rec.number >= 2 && rec.number <= 6) ? 'S' : (rec.number >= 8 && rec.number <= 12) ? 'L' : '?'}</div>
                  <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{getDiceResultLabel(rec)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showRule && (
        <div className="rui-modal-backdrop" onClick={() => setShowRule(false)}>
          <div className="rui-modal" onClick={e => e.stopPropagation()}>
            <div className="rui-modal-header"><span className="rui-modal-title">Dice Rules</span><button className="rui-modal-close" onClick={() => setShowRule(false)}>×</button></div>
            <p style={{ color: '#555', lineHeight: 1.6, fontSize: '0.9rem' }}>1 minute per round. 15 seconds to bet. Two dice are rolled (sum 2–12).<br /><br /><strong>Small</strong>: Sum 2–6 → 1.98x<br /><strong>Tie (7)</strong>: Sum = 7 → 12x<br /><strong>Large</strong>: Sum 8–12 → 1.98x</p>
            <button onClick={() => setShowRule(false)} style={{ width: '100%', marginTop: 16, background: '#007bff', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, cursor: 'pointer' }}>I GOT IT</button>
          </div>
        </div>
      )}
      <style>{`@keyframes slideInRow { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};
export default Dice;
