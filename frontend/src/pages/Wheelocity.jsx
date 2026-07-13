import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  generateHistory, generateFakeOrders,
  getOrderBadgeColor, deterministicRandom
} from '../hooks/useGameTimer';
import { useGlobalGame } from '../contexts/GlobalGameContext';
import { useWallet } from '../contexts/WalletContext';
import BetCardModal from '../components/BetCardModal';
import ResultCard from '../components/ResultCard';

const GAME = 'Wheelocity';
const MULTIPLIERS = { '2 Hits': 1.9, '3 Hits': 3, '5 Hits': 5, '2 hits': 1.9, '3 hits': 3, '5 hits': 5, '2x': 1.9, '3x': 3, '5x': 5 };

const AVATARS = ['🧑','👩','👦','👧','🧔','👱','🧕','🧑‍🦱'];
const randAvatar = (seed) => AVATARS[Math.abs(String(seed).split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATARS.length];

const WHEEL_SEGMENTS = [
  { label: '2 Hits',   ratio: '1:1.9',  color: '#4da6e8' },
  { label: '3 Hits', ratio: '1:3',  color: '#e87fb0' },
  { label: '5 Hits',  ratio: '1:5',  color: '#48b85c' },
];

const getWheelColor = (rec) => {
  if (!rec) return '#3d4477';
  if (rec.label === '2 Hits')   return '#4da6e8';
  if (rec.label === '3 Hits') return '#e87fb0';
  if (rec.label === '5 Hits')  return '#48b85c';
  return rec.color?.[0] || '#3d4477';
};
const getSelColor = (sel) => {
  const s = String(sel||'').toLowerCase();
  if (s === '2 hits' || s === '2x') return '#4da6e8';
  if (s === '3 hits' || s === '3x') return '#e87fb0';
  if (s === '5 hits' || s === '5x') return '#48b85c';
  return '#888';
};

const Wheelocity = () => {
  const navigate = useNavigate();
  const { timeLeft, isBettingOpen, period, previousPeriod, formatTime, secondsIntoPeriod, status } = useGlobalGame(GAME);
  const timeStr = formatTime();

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [activeTab, setActiveTab] = useState('everyone');
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState('2 Hits');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [resultCard, setResultCard] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const settledRef = useRef('');
  const baseOrdersRef = useRef([]);

  const {
    placeBet, myOrders
  } = useWallet();

  const history = generateHistory(GAME, period, 50);
  const displayHistory = history.slice(0, 14);

  useEffect(() => {
    baseOrdersRef.current = generateFakeOrders(GAME, period, 30);
    setLiveOrders([]);
  }, [period]);

  useEffect(() => {
    if (!isBettingOpen) {
      setLiveOrders(baseOrdersRef.current);
      return;
    }
    const progress = secondsIntoPeriod / 30;
    const toShow = Math.min(
      Math.floor(progress * baseOrdersRef.current.length) + 1,
      baseOrdersRef.current.length
    );
    setLiveOrders(baseOrdersRef.current.slice(0, toShow));
  }, [secondsIntoPeriod, isBettingOpen]);

  useEffect(() => {
    if (!isBettingOpen) {
      setWheelRotation(1440 + Math.floor(deterministicRandom(period) * 360));
    } else {
      setWheelRotation(0);
    }
  }, [isBettingOpen, period]);

  useEffect(() => {
    if (settledRef.current === previousPeriod || status === 'betting') return;
    
    // Check if user had a bet on the previous period
    const myPrevBets = myOrders.filter(o => o.game_type === GAME && o.period === previousPeriod);
    if (myPrevBets.length > 0) {
      const bet = myPrevBets[0];
      // Only show card if the bet is resolved by backend
      if (bet.status !== 'pending') {
        settledRef.current = previousPeriod;
        const won = bet.status === 'won';
        const resultLabel = bet.result;
        
        setTimeout(() => {
          setResultCard({
            won,
            period: previousPeriod,
            game: GAME,
            selection: bet.selection,
            selectionColor: getSelColor(bet.selection),
            resultLabel,
            resultColor: getSelColor(resultLabel),
            betAmount: bet.amount,
            winAmount: parseFloat(bet.payout || 0),
          });
        }, 800);
      }
    }
  }, [previousPeriod, status, myOrders]);

  const openBetCard = (sel) => { if (!isBettingOpen) return; setPendingSelection(sel); setBetModalOpen(true); };
  const handleConfirmBet = (selection, amount) => { setBetModalOpen(false); if (!placeBet(GAME, period, selection, amount)) alert('Insufficient balance'); };

  const myActiveBets = myOrders.filter(o => o.game === GAME && o.period === period);
  const myGameOrders = myOrders.filter(o => o.game === GAME);

  return (
    <div className="rui-screen">
      <div className="rui-header">
        <button className="rui-header-back" onClick={() => navigate(-1)}><ChevronLeft size={22} /></button>
        <div className="rui-header-title">Wheelocity</div>
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
        {WHEEL_SEGMENTS.map(seg => (
          <button key={seg.label} className="rui-bet-pill" style={{ background: seg.color }} onClick={() => openBetCard(seg.label)} disabled={!isBettingOpen}>
            <span className="rui-bet-pill-label">{seg.label}</span>
            <span className="rui-bet-pill-ratio">{seg.ratio}</span>
          </button>
        ))}
      </div>

      <div className="rui-wheel-wrap">
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '18px solid #ffbe76' }} />
          <div style={{ width: 220, height: 220, borderRadius: '50%', background: 'conic-gradient(from 180deg, #4da6e8 0deg 120deg, #e87fb0 120deg 240deg, #48b85c 240deg 360deg)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', transform: `rotate(${wheelRotation}deg)`, transition: 'transform 3.2s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ position: 'absolute', inset: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 6px rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 700, color: '#555' }}>
              {status === 'resolving' ? 'Spin' : 'Spin'}
            </div>
          </div>
        </div>
      </div>

      <div className="rui-record-section">
        <div className="rui-record-header">
          <span className="rui-record-title">Wheelocity Record</span>
          <button className="rui-record-more" onClick={() => setShowHistoryModal(true)}>more &gt;</button>
        </div>
        <div className="rui-ball-row" style={{ padding: '0 4px 4px', width: '100%', justifyContent: 'flex-start' }}>
          {displayHistory.slice().reverse().map((rec, i) => {
            const label = rec.label;
            const color = getWheelColor(rec);
            return (
              <div key={i} className="rui-ball-item">
                <div className="rui-ball" style={{ background: color }}>{label?.charAt(0) || '?'}</div>
                <div className="rui-ball-period">{rec.period.slice(-3)}</div>
              </div>
            );
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
            <div className="rui-modal-header"><span className="rui-modal-title">Wheelocity History</span><button className="rui-modal-close" onClick={() => setShowHistoryModal(false)}>×</button></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {history.map((rec, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#444' }}>{rec.period}</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: getWheelColor(rec), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>
                    {rec.label?.charAt(0) || '?'}
                  </div>
                  <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{rec.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRule && (
        <div className="rui-modal-backdrop" onClick={() => setShowRule(false)}>
          <div className="rui-modal" onClick={e => e.stopPropagation()}>
            <div className="rui-modal-header"><span className="rui-modal-title">Wheelocity Rules</span><button className="rui-modal-close" onClick={() => setShowRule(false)}>×</button></div>
            <p style={{ color: '#555', lineHeight: 1.6, fontSize: '0.9rem' }}>
              1 minute per round. 15 seconds to bet. The wheel spins and lands on a segment.<br /><br />
              <strong>2 Hits</strong>: 2x multiplier<br />
              <strong>3 Hits</strong>: 3x multiplier<br />
              <strong>5 Hits</strong>: 5x multiplier
            </p>
            <button onClick={() => setShowRule(false)} style={{ width: '100%', marginTop: 16, background: '#007bff', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, cursor: 'pointer' }}>I GOT IT</button>
          </div>
        </div>
      )}
      <style>{`@keyframes slideInRow { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default Wheelocity;
