import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  
  getOrderBadgeColor, deterministicRandom
} from '../hooks/useGameTimer';
import { useGlobalGame } from '../contexts/GlobalGameContext';
import { useWallet } from '../contexts/WalletContext';
import BetCardModal from '../components/BetCardModal';
import ResultCard from '../components/ResultCard';

const GAME = 'FastParity';
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

const FastParity = () => {
  const navigate = useNavigate();
  const { timeLeft, isBettingOpen, period, round_id, previousPeriod, formatTime, secondsIntoPeriod, status, realHistory } = useGlobalGame(GAME);
  const timeStr = formatTime();

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [activeTab, setActiveTab] = useState('everyone');
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState('Green');
  const [resultCard, setResultCard] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const settledRef = useRef('');

  const {
    placeBet, myOrders
  } = useWallet();

  const history = (realHistory || []).map(r => ({
    period: r.period,
    label: r.label || r.result?.label,
    number: r.number !== undefined ? r.number : r.result?.number,
    color: r.color || r.result?.color
  }));
  const displayHistory = history.slice(0, 14);

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


  // ─── Phase 6: Sync Frontend Reveal from Database ───────────────
  const REVEAL_ANIMATION_MS = 4000;

  const shownResultsRef = useRef(new Set());

  useEffect(() => {
    if (!myOrders || myOrders.length === 0 || !realHistory || realHistory.length === 0) return;

    const myGameBets = myOrders.filter(o => o.game === GAME);
    if (myGameBets.length === 0) return;

    for (const bet of myGameBets) {
      const betKey = `${bet.id || bet.round_id || bet.period}-${bet.selection}`;
      if (shownResultsRef.current.has(betKey)) continue;

      const resultObj = realHistory.find(r => 
        (r.round_id && bet.round_id && Number(r.round_id) === Number(bet.round_id)) ||
        (r.period && String(r.period) === String(bet.period))
      );

      if (resultObj) {
        shownResultsRef.current.add(betKey);

        const resultLabel = resultObj.label || resultObj.result?.label || 'Unknown';
        const betSel = String(bet.selection).toLowerCase().trim();
        const resSel = String(resultLabel).toLowerCase().trim();

        const multiplier = betSel === 'violet' ? 4.5 : 1.9;
        const won = (betSel === resSel);
        const winAmount = won ? parseFloat(bet.amount) * multiplier : 0;

        setResultCard({
          won,
          period: bet.period || resultObj.period,
          game: GAME,
          selection: bet.selection,
          selectionColor: getSelColor(bet.selection),
          resultLabel,
          resultColor: getSelColor(resultLabel),
          betAmount: parseFloat(bet.amount),
          winAmount: winAmount > 0 ? winAmount : 0,
        });
        break;
      }
    }
  }, [realHistory, myOrders]);

  const openBetCard = (sel) => {
    if (!isBettingOpen) return;
    setPendingSelection(sel);
    setBetModalOpen(true);
  };

  const handleConfirmBet = (selection, amount) => {
    const activeRoundId = round_id || (period ? Number(period) + 1000000 : Date.now());
    setBetModalOpen(false);
    const ok = placeBet(GAME, period, activeRoundId, selection, amount);
    if (!ok) alert('Insufficient balance');
  };

  const myActiveBets = myOrders.filter(o => o.game === GAME && o.round_id === round_id);
  const myGameOrders = myOrders.filter(o => o.game === GAME);

  return (
    <div className="alt-ui">
      {/* Header */}
      <div className="rui-header">
        <button className="rui-header-back" onClick={() => navigate(-1)}><ChevronLeft size={22} /></button>
        <div className="rui-header-title">Fast-Parity</div>
        <button className="rui-header-rules" onClick={() => setShowRule(true)}>Rules</button>
      </div>

      {/* Timer */}
      <div className="fp-timer-bar-alt">
        <div>
          <div className="fp-label-alt">Period</div>
          <div className="fp-period-val-alt">{period}</div>
        </div>
        <div className="fp-countdown-group text-right">
          <div className="fp-label-alt">Count Down</div>
          <div className="fp-countdown-blocks">
            <div className="fp-block">{timeStr.m1}</div>
            <div className="fp-block">{timeStr.m2}</div>
            <div className="fp-colon">:</div>
            <div className="fp-block">{timeStr.s1}</div>
            <div className="fp-block">{timeStr.s2}</div>
          </div>
        </div>
      </div>

      {/* Bet Buttons */}
      <div className="fp-bet-buttons-alt">
        <button 
          className="fp-bet-btn-alt green" 
          onClick={() => openBetCard('Green')} 
          disabled={!isBettingOpen}
        >
          <span className="fp-btn-icon">🚀</span>
          <span className="fp-btn-title">Join Green</span>
          <span className="fp-btn-ratio">1:2</span>
        </button>
        <button 
          className="fp-bet-btn-alt violet" 
          onClick={() => openBetCard('Violet')} 
          disabled={!isBettingOpen}
        >
          <span className="fp-btn-icon">🚀</span>
          <span className="fp-btn-title">Join Violet</span>
          <span className="fp-btn-ratio">1:4.5</span>
        </button>
        <button 
          className="fp-bet-btn-alt red" 
          onClick={() => openBetCard('Red')} 
          disabled={!isBettingOpen}
        >
          <span className="fp-btn-icon">🚀</span>
          <span className="fp-btn-title">Join Red</span>
          <span className="fp-btn-ratio">1:2</span>
        </button>
      </div>

      {/* Record Strip */}
      <div className="rui-record-section">
        <div className="rui-record-header">
          <span className="rui-record-title">Fast-Parity Record</span>
          <button className="rui-record-more" onClick={() => setShowHistoryModal(true)}>more &gt;</button>
        </div>
        <div className="rui-ball-row" style={{ padding: '0 4px 4px', width: '100%' }}>
          {displayHistory.slice().reverse().map((rec, i) => {
            const color = getBallColor(rec);
            const ballText = getBallText(rec);
            return (
              <div key={i} className="rui-ball-item">
                <div className="rui-ball" style={{ background: color }}>{ballText}</div>
                <div className="rui-ball-period">{String(rec.period || '').slice(-3)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Active Bets */}
      {myActiveBets.length > 0 && (
        <div className="rui-active-bets">
          <div className="rui-active-bets-title">💰 Your Active Bets</div>
          {myActiveBets.map(order => (
            <div key={order.id} className="rui-active-bet-row">
              <span style={{ background: getSelColor(order.selection), color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 700 }}>
                {order.selection}
              </span>
              <strong>₹{order.amount}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="fp-tabs-alt">
        <button className={activeTab === 'everyone' ? 'active' : ''} onClick={() => setActiveTab('everyone')}>Everyone's Order</button>
        <button className={activeTab === 'my' ? 'active' : ''} onClick={() => setActiveTab('my')}>My Order</button>
      </div>

      {/* Orders Table */}
      <div className="rui-order-section">
        {activeTab === 'everyone' ? (
          <table className="rui-order-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>User</th>
                <th>Select</th>
                <th>Point</th>
              </tr>
            </thead>
            <tbody>
              {liveOrders.map((ord, i) => (
                <tr key={ord.id} style={{
                  animation: `slideInRow 0.35s ease ${Math.min(i, 8) * 60}ms both`,
                  opacity: 0
                }}>
                  <td>{ord.period}</td>
                  <td>
                    <div className="rui-user-cell">
                      <div className="rui-avatar">{randAvatar(ord.user)}</div>
                      {ord.user}
                    </div>
                  </td>
                  <td>
                    <div className="rui-select-badge" style={{ background: getOrderBadgeColor(ord.select) }}>
                      {ord.select?.charAt(0)}
                    </div>
                  </td>
                  <td>₹{ord.point}</td>
                </tr>
              ))}
              {liveOrders.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#bbb' }}>
                  {isBettingOpen ? 'Waiting for bets...' : 'Round closed'}
                </td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="rui-order-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Select</th>
                <th>Bet</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {myGameOrders.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#bbb' }}>No bets yet</td></tr>
              ) : myGameOrders.map((ord, i) => (
                <tr key={ord.id}>
                  <td style={{ color: '#666', fontSize: '0.82rem' }}>{ord.period}</td>
                  <td>
                    <div className="rui-select-badge" style={{ background: getSelColor(ord.selection) }}>
                      {ord.selection?.charAt(0)}
                    </div>
                  </td>
                  <td>₹{ord.amount}</td>
                  <td>
                    {ord.status === 'Pending' ? (
                      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem' }}>Pending</span>
                    ) : ord.status === 'Won' ? (
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.88rem' }}>
                        ▲ +₹{ord.winAmount?.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.88rem' }}>
                        ✗ Lost
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bet Modal */}
      <BetCardModal
        isOpen={betModalOpen}
        game={GAME}
        selection={pendingSelection}
        defaultAmount={10}
        minAmount={5}
        maxAmount={5000}
        feePercent={2}
        showNumberSelector={false}
        onClose={() => setBetModalOpen(false)}
        onConfirm={handleConfirmBet}
      />

      {/* Win/Lose Result Card */}
      <ResultCard
        isOpen={!!resultCard}
        result={resultCard}
        onClose={() => setResultCard(null)}
      />

      {/* History Modal */}
      {showHistoryModal && (
        <div className="rui-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="rui-modal" onClick={e => e.stopPropagation()}>
            <div className="rui-modal-header">
              <span className="rui-modal-title">Fast Parity History</span>
              <button className="rui-modal-close" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {history.map((rec, i) => {
                const color = getBallColor(rec);
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>
                      {getBallText(rec)}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#999' }}>{String(rec.period || '').slice(-3)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showRule && (
        <div className="rui-modal-backdrop" onClick={() => setShowRule(false)}>
          <div className="rui-modal" onClick={e => e.stopPropagation()}>
            <div className="rui-modal-header"><span className="rui-modal-title">Fast-Parity Rules</span><button className="rui-modal-close" onClick={() => setShowRule(false)}>×</button></div>
            <p style={{ color: '#555', lineHeight: 1.6, fontSize: '0.9rem' }}>
              30 seconds per round. Fast-paced action! Choose Green, Violet, or Red.<br /><br />
              <strong>Green</strong>: 1:2 payout<br />
              <strong>Red</strong>: 1:2 payout<br />
              <strong>Violet</strong>: 1:4.5 payout
            </p>
            <button onClick={() => setShowRule(false)} style={{ width: '100%', marginTop: 16, background: '#007bff', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, cursor: 'pointer' }}>I GOT IT</button>
          </div>
        </div>
      )}

      {/* Reveal Animation Overlay */}
      {isRevealing && (
        <div className="rui-modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="rui-modal glass-modal" style={{ background: 'var(--glass-bg)', padding: '40px', boxShadow: 'var(--glass-shadow)' }}>
            <div className="spin-reveal-glow" style={{
              width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, var(--game-purple), var(--primary-blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '4rem', fontWeight: 900,
              margin: '0 auto',
              border: '4px solid rgba(255,255,255,0.3)',
            }}>
              ?
            </div>
            <div style={{ marginTop: 24, color: '#fff', fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', letterSpacing: '2px' }}>
              REVEALING...
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRow {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinReveal { 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};

export default FastParity;
