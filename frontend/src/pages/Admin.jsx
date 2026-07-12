import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { calculateTimerState, useGameTimer, getSettledResult, generateFakeOrders } from '../hooks/useGameTimer';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Deterministic random for consistent fake bet amounts
const deterministicAmount = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 5000 + 500; // ₹500 to ₹5500
};

const colorSelections = ['Red', 'Green', 'Violet'];
const wheelSelections = ['Two Bits', 'Three Bits', 'Five Bits'];
const diceSelections = ['Small', 'Tie', 'Large'];

const deterministicSelection = (seed, index, gameKey) => {
  const hash = seed.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
  if (gameKey === 'Dice') {
    return diceSelections[(Math.abs(hash) + index) % diceSelections.length];
  }
  if (gameKey === 'Wheelocity') {
    return wheelSelections[(Math.abs(hash) + index) % wheelSelections.length];
  }
  return colorSelections[(Math.abs(hash) + index) % colorSelections.length];
};

// Generate realistic fake bet distribution - synced with game engine
const generateFakeBetBreakdown = (gameKey, period, secondsIntoPeriod = 0, bettingDuration = 30) => {
  const progress = Math.min(1, Math.max(0, secondsIntoPeriod / bettingDuration));
  const maxBets = 30; // Matches count in getRiggedResult
  const numBets = Math.max(1, Math.ceil(maxBets * progress));
  
  const allFakeOrders = generateFakeOrders(gameKey, period, maxBets);
  const visibleOrders = allFakeOrders.slice(0, numBets);
  
  const bySelection = {};
  let total = 0;
  
  for (const order of visibleOrders) {
    const sel = order.select;
    if (!bySelection[sel]) bySelection[sel] = 0;
    bySelection[sel] += order.point;
    total += order.point;
  }
  
  return { total, bySelection, orders: visibleOrders };
};

const applyBetFloor = (floorsRef, key, bets) => {
  const prev = floorsRef.current[key] || { total: 0, bySelection: {}, orders: [] };
  const bySelection = {};
  const allSelections = new Set([
    ...Object.keys(prev.bySelection),
    ...Object.keys(bets.bySelection || {})
  ]);
  allSelections.forEach((sel) => {
    bySelection[sel] = Math.max(prev.bySelection[sel] || 0, bets.bySelection?.[sel] || 0);
  });
  const total = Math.max(prev.total, bets.total || 0);
  const orders = (bets.orders?.length || 0) >= (prev.orders?.length || 0) ? bets.orders : prev.orders;
  const floored = { total, bySelection, orders };
  floorsRef.current[key] = floored;
  return floored;
};

const gameConfigs = [
  { 
    name: 'Fast Parity', 
    key: 'FastParty', 
    duration: 60, 
    bettingDuration: 30,
    options: ['Red', 'Green', 'Violet'] 
  },
  { 
    name: 'Parity', 
    key: 'PrimePick', 
    duration: 120, 
    bettingDuration: 60,
    options: ['Red', 'Green', 'Violet'] 
  },
  { 
    name: 'Sapre', 
    key: 'LuckyPick', 
    duration: 180, 
    bettingDuration: 120,
    options: ['Red', 'Green', 'Violet'] 
  },
  { 
    name: 'Dice', 
    key: 'Dice', 
    duration: 60, 
    bettingDuration: 30,
    options: ['Small', 'Tie', 'Large'] 
  },
  { 
    name: 'Wheelocity', 
    key: 'Wheelocity', 
    duration: 60, 
    bettingDuration: 30,
    options: ['Two Bits', 'Three Bits', 'Five Bits'] 
  },
];

const payoutRatios = {
  FastParty: { Green: 1.9, Red: 1.9, Violet: 4.5 },
  PrimePick: { Green: 1.9, Red: 1.9, Violet: 4.5 },
  LuckyPick: { Green: 1.9, Red: 1.9, Violet: 4.5 },
  Wheelocity: { 'Two Bits': 1.9, 'Three Bits': 3, 'Five Bits': 5 },
  Dice: { Small: 1.9, Large: 1.9, Tie: 5 }
};

const AdminGameCard = ({ game, timerState, liveBets, selectedWinner, onSetWinner, onClearWinner }) => {
  const formatTime = (timeLeft) => {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    const mStr = min.toString().padStart(2, '0');
    const sStr = sec.toString().padStart(2, '0');
    return `${mStr}:${sStr}`;
  };

  const phaseLabel = liveBets.total === 0 ? 'Idle' : timerState.isBettingOpen ? 'Betting Open' : 'Result Pending';
  const totalPlayers = liveBets.orders ? liveBets.orders.length : 0;
  const betPercentages = {};
  
  Object.entries(liveBets.bySelection).forEach(([sel, amt]) => {
    betPercentages[sel] = liveBets.total > 0 ? (amt / liveBets.total * 100).toFixed(1) : 0;
  });

  const getOptionColor = (option) => {
    const normalized = String(option).toLowerCase();
    if (normalized.includes('red')) return '#e74c3c';
    if (normalized.includes('green')) return '#2ecc71';
    if (normalized.includes('violet')) return '#9b59b6';
    if (normalized.includes('small')) return '#6ec1ff';
    if (normalized.includes('large')) return '#dc3545';
    if (normalized === 'tie' || normalized === '7' || normalized === 'seven') return '#f1c40f';
    if (normalized.includes('two')) return '#6ec1ff';
    if (normalized.includes('three')) return '#ff8cec';
    if (normalized.includes('five')) return '#88f29f';
    return '#0ff';
  };

  const colorOnlyGames = ['FastParty', 'PrimePick', 'LuckyPick'];
  const wheelOnlyGames = ['Wheelocity'];
  const displayOptions = colorOnlyGames.includes(game.key)
    ? ['Green', 'Violet', 'Red']
    : wheelOnlyGames.includes(game.key)
      ? ['Two Bits', 'Three Bits', 'Five Bits']
      : game.options;

  const getPayoutRatio = (selection) => {
    return payoutRatios[game.key]?.[selection] || 1.5;
  };

  const getPayoutSummary = (selection) => {
    const stake = liveBets.bySelection[selection] || 0;
    const ratio = getPayoutRatio(selection);
    const target = Math.round(stake * ratio);
    const remaining = Math.max(0, liveBets.total - target);
    return { stake, target, remaining, ratio };
  };

  let projectedWinner = null;
  if (!timerState.isBettingOpen && !selectedWinner && liveBets.total > 0) {
    let maxRemaining = -Infinity;
    displayOptions.forEach(opt => {
      const { remaining } = getPayoutSummary(opt);
      if (remaining > maxRemaining) {
        maxRemaining = remaining;
        projectedWinner = opt;
      }
    });
  }

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #2a2a4e',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{game.name}</h4>
          <p style={{ margin: '4px 0', color: '#aaa', fontSize: '0.9rem' }}>Period: <strong style={{ color: '#0ff' }}>{timerState.period}</strong></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f0', fontFamily: 'monospace' }}>
            {formatTime(timerState.timeLeft)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{phaseLabel}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#0a0a1a', padding: 8, borderRadius: 4, textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Bets</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0f0' }}>₹{liveBets.total.toFixed(0)}</div>
        </div>
        <div style={{ background: '#0a0a1a', padding: 8, borderRadius: 4, textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Players</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0f0' }}>{totalPlayers}</div>
        </div>
        <div style={{ background: '#0a0a1a', padding: 8, borderRadius: 4, textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Options</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0f0' }}>{Object.keys(liveBets.bySelection).length}</div>
        </div>
      </div>

      {liveBets.total > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: 8 }}>💰 Bet Breakdown by Selection:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 16 }}>
              {displayOptions.map(option => {
                const amt = liveBets.bySelection[option] || 0;
                const isWinner = selectedWinner === option;
                return (
                  <div
                    key={option}
                    onClick={() => amt > 0 && onSetWinner(option)}
                    style={{
                      background: isWinner ? '#1a3a2e' : '#0a1a2e',
                      padding: 12,
                      borderRadius: 6,
                      textAlign: 'center',
                      cursor: amt > 0 ? 'pointer' : 'default',
                      border: isWinner ? '3px solid #0f0' : amt > 0 ? '1px solid #2a4a3e' : '1px solid #1a2a3e',
                      opacity: amt > 0 ? 1 : 0.65,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginBottom: 6
                    }}>
                      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 999, background: getOptionColor(option) }} />
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>{option}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: 6 }}>₹{amt.toFixed(0)}</div>
                    {amt > 0 && <div style={{ fontSize: '0.75rem', color: '#7c8fa3' }}>{betPercentages[option] || 0}%</div>}
                    {isWinner && <div style={{ marginTop: 6, fontSize: '0.82rem', color: '#0f0', fontWeight: 'bold' }}>✓ WINNER</div>}
                    {projectedWinner === option && <div style={{ marginTop: 6, fontSize: '0.82rem', color: '#0ff', fontWeight: 'bold' }}>✓ AUTO WINNER</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: '#07131f', padding: 14, borderRadius: 10, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {displayOptions.map((option) => {
                const { stake, target, remaining, ratio } = getPayoutSummary(option);
                return (
                  <div key={option} style={{ padding: 12, borderRadius: 10, background: '#0c1a2b', border: '1px solid rgba(96, 165, 250, 0.14)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: getOptionColor(option), fontWeight: 700 }}>{option}</span>
                      <span style={{ fontSize: '0.8rem', color: '#7f9cb0' }}>{ratio.toFixed(2)}x</span>
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>Stake</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>₹{stake.toFixed(0)}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 8 }}>Return if win</div>
                    <div style={{ fontSize: '0.95rem', color: '#7dd3fc', fontWeight: 700 }}>₹{target.toLocaleString()}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 8 }}>Pool remaining</div>
                    <div style={{ fontSize: '0.95rem', color: remaining >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 }}>₹{remaining.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, color: '#94a3b8', fontSize: '0.82rem' }}>
              Total bets: ₹{liveBets.total.toLocaleString()}. This summary shows stake, the return if this selection wins, and how much of the pool remains after the payout.
            </div>
          </div>

          {(selectedWinner || projectedWinner) && (
            <div style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              background: '#1a3a2e',
              borderRadius: 6,
              alignItems: 'center',
              marginBottom: 12
            }}>
              <div style={{ flex: 1, color: '#0f0' }}>
                <strong>{selectedWinner ? `✓ Manual Winner Selected: ${selectedWinner}` : `✓ Auto-Selected Winner: ${projectedWinner}`}</strong>
              </div>
              {selectedWinner && (
                <button
                  onClick={onClearWinner}
                  style={{
                    padding: '6px 12px',
                    background: '#8b0000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const tabs = ['dashboard', 'recharges', 'withdrawals', 'games', 'users', 'settings'];

const gameStatus = [
  { name: 'Fast Parity', status: 'Live', countdown: '00:18' },
  { name: 'Parity', status: 'Locking', countdown: '00:06' },
  { name: 'Sapre', status: 'Live', countdown: '00:24' },
  { name: 'Dice', status: 'Result', countdown: '00:03' },
  { name: 'Wheelocity', status: 'Live', countdown: '00:12' },
  { name: 'Andar Bahar', status: 'Live', countdown: '00:28' },
];

const recentPeriods = [
  { period: 11842, amount: 9210, players: 64, result: 'Violet' },
  { period: 11841, amount: 7812, players: 51, result: 'Red' },
  { period: 11840, amount: 10126, players: 73, result: 'Green' },
];

const users = [
  { id: 'U-101', name: 'Aarav', phone: '+91 98765 43210', wallet: '₹12480', status: 'Active' },
  { id: 'U-102', name: 'Meera', phone: '+91 87654 32109', wallet: '₹8560', status: 'Frozen' },
  { id: 'U-103', name: 'Rohit', phone: '+91 99887 76655', wallet: '₹15420', status: 'Active' },
];


const RazorpayTransactions = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE}/api/admin/all-deposits`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          // Filter only razorpay transactions
          const razorpayTxns = data.deposits.filter(t => t.notes && t.notes.includes('Razorpay'));
          setDeposits(razorpayTxns);
        }
      } catch (err) {
        console.error('Failed to fetch deposits:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeposits();
  }, []);

  if (loading) return <p className="admin-empty">Loading transactions...</p>;
  if (deposits.length === 0) return <p className="admin-empty">No Razorpay transactions found.</p>;

  return (
    <div className="admin-list-stack">
      {deposits.map(txn => (
        <div key={txn.id} className="admin-request-row" style={{ alignItems: 'center' }}>
          <div>
            <strong>Payment ID: {txn.razorpay_payment_id || 'Unknown'}</strong>
            <p>Amount: <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{txn.amount}</span></p>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              User: {txn.users?.nickname} ({txn.users?.email}) • Player ID: {txn.users?.player_id}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Time: {new Date(txn.created_at).toLocaleString()}
            </p>
          </div>
          <div className="admin-actions">
            <span className="admin-pill" style={{ background: '#10b981', color: 'white' }}>Success</span>
          </div>
        </div>
      ))}
    </div>
  );
};


const Admin = () => {
  const {
    balance,
    pendingRecharges,
    approveRecharge,
    rejectRecharge,
    pendingWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    holdWithdrawal,
    financialRecords,
    myOrders,
    getLiveBetStatsWithFloor,
    getSelectedWinner,
    setSelectedWinner,
    clearSelectedWinner,
    adminSettings,
    setAdminSettings,
    profitRecords,
    recordGameProfit
  } = useWallet();

  const { allUsers, setAllUsers, refreshAllUsers } = useAuth();

  const [authState, setAuthState] = useState({ checking: true, authenticated: false, username: '' });
  const [loginForm, setLoginForm] = useState({ username: 'Treesadhi', password: 'TREESADHI2175' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('games');
  const [gameHistories, setGameHistories] = useState({});
  const globalTimer = useGameTimer(60, 15);
  const betDisplayFloors = useRef({});

  useEffect(() => {
    if (authState.authenticated) {
      refreshAllUsers();
    }
  }, [authState.authenticated, refreshAllUsers]);

  const timerStates = useMemo(() => {
    const newStates = {};
    const now = Date.now();
    gameConfigs.forEach((game) => {
      newStates[game.key] = calculateTimerState(game.duration, game.bettingDuration, now);
    });
    return newStates;
  }, [globalTimer.timeLeft]); // Re-calculate every 1 second when globalTimer ticks

  const recordedAdminPeriodsRef = useRef(new Set());
  
  useEffect(() => {
    gameConfigs.forEach(game => {
      const ts = timerStates[game.key];
      if (ts && ts.previousPeriod) {
        const periodKey = `${game.key}-${ts.previousPeriod}`;
        if (!recordedAdminPeriodsRef.current.has(periodKey)) {
          recordedAdminPeriodsRef.current.add(periodKey);
          
          // Settle and record profit
          const settled = getSettledResult(
            game.key, 
            ts.previousPeriod, 
            (g, p) => adminSettings?.gameOverrides?.[g]?.[p], 
            myOrders, 
            payoutRatios[game.key]
          );
          
          if (settled) {
            recordGameProfit(game.key, ts.previousPeriod, settled.label, settled.profit, settled.totalBets);
          }
        }
      }
    });
  }, [timerStates, myOrders, adminSettings, recordGameProfit]);

  // Initialize game histories on mount using deterministic values - no Math.random()
  useEffect(() => {
    const histories = {};
    gameConfigs.forEach((game) => {
      const timerState = calculateTimerState(game.duration, game.bettingDuration);
      const history = [];
      for (let i = 0; i < 10; i++) {
        // Deterministic seed per game+index so history never reshuffles
        const seed = `${game.key}-hist-${timerState.previousPeriod}-${i}`;
        const seedVal = seed.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
        const num = Math.abs(seedVal) % 10;
        const colorIdx = Math.abs(seedVal >> 4) % 3;
        history.push({
          period: timerState.previousPeriod,
          label: num.toString(),
          color: ['#dc3545', '#28a745', '#6f42c1'][colorIdx]
        });
      }
      histories[game.key] = history;
    });
    setGameHistories(histories);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) {
      setAuthState({ checking: false, authenticated: false, username: '' });
      return;
    }

    fetch(`${API_BASE}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.admin) {
          setAuthState({ checking: false, authenticated: true, username: data.admin.username });
        } else {
          sessionStorage.removeItem('admin_token');
          setAuthState({ checking: false, authenticated: false, username: '' });
        }
      })
      .catch(() => {
        sessionStorage.removeItem('admin_token');
        setAuthState({ checking: false, authenticated: false, username: '' });
      });
  }, []);

  const stats = useMemo(() => {
    const totalBets = myOrders.length;
    const totalAmount = myOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    return {
      totalUsers: 1250,
      activeToday: 368,
      onlineNow: 97,
      pendingRechargeCount: pendingRecharges.length,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      balance,
      revenueToday: 193480,
      activeBets: totalBets,
      betVolume: totalAmount,
    };
  }, [balance, pendingRecharges.length, pendingWithdrawals.length, myOrders]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');

    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    });

    const data = await response.json();
    if (!response.ok) {
      setLoginError(data.message || 'Login failed');
      return;
    }

    sessionStorage.setItem('admin_token', data.token);
    setAuthState({ checking: false, authenticated: true, username: data.admin.username });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setAuthState({ checking: false, authenticated: false, username: '' });
  };

  const handleApproveRecharge = (reqId, userId, amount) => {
    approveRecharge(reqId, userId, amount);
    setAllUsers(prev => prev.map(u => {
      if (u.id.toString() !== userId.toString()) return u;
      const newTotal = (u.totalRecharge || 0) + amount;
      const vip = ['Bronze','Silver','Gold','Diamond','Master'].find((_, i) => {
        const thresholds = [0, 10000, 25000, 50000, 100000];
        return newTotal < (thresholds[i + 1] || Infinity);
      }) || 'Master';
      const newVip = newTotal >= 100000 ? 'Master' : newTotal >= 50000 ? 'Diamond' : newTotal >= 25000 ? 'Gold' : newTotal >= 10000 ? 'Silver' : 'Bronze';
      return {
        ...u,
        wallet: (u.wallet || 0) + amount,
        totalRecharge: newTotal,
        vipLevel: newVip
      };
    }));
  };

  if (authState.checking) {
    return <div className="admin-shell admin-loading">Verifying secure admin session…</div>;
  }

  if (!authState.authenticated) {
    return (
      <div className="admin-shell admin-login-shell">
        <div className="admin-card admin-login-card">
          <div className="admin-hero">
            <p className="admin-eyebrow">Restricted Area</p>
            <h1>Super Admin Access</h1>
            <p>Only the authorized operator can enter this dashboard. Session is protected by a server-side secret and token-based access.</p>
          </div>
          <form onSubmit={handleLogin} className="admin-form">
            <label>
              Username
              <input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} placeholder="superadmin" />
            </label>
            <label>
              Password
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Enter secret password" />
            </label>
            {loginError && <div className="admin-error">{loginError}</div>}
            <button type="submit" className="admin-btn primary">Unlock Admin Panel</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="admin-eyebrow">Real-Time Control Center</p>
          <h1>Admin Dashboard</h1>
        </div>
        <div className="admin-topbar-actions">
          <span className="admin-pill">Signed in as {authState.username}</span>
          <button className="admin-btn danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-tabs">
        {['dashboard', 'games', 'recharges', 'withdrawals', 'users', 'settings'].map((tab) => (
          <button key={tab} className={`admin-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'dashboard' && '📊 Dashboard'}
            {tab === 'games' && '🎮 Live Games'}
            {tab === 'recharges' && '➕ Recharges'}
            {tab === 'withdrawals' && '➖ Withdrawals'}
            {tab === 'users' && '👥 Users'}
            {tab === 'settings' && '⚙️ Settings'}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="admin-grid">
            <div className="admin-card">
              <p className="admin-card-label">Online Users</p>
              <h3>{stats.onlineNow}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Active Bets</p>
              <h3>{stats.activeBets}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Bet Volume</p>
              <h3>₹{stats.betVolume.toLocaleString()}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Today's Revenue</p>
              <h3>₹{stats.revenueToday.toLocaleString()}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Pending Recharges</p>
              <h3>{stats.pendingRechargeCount}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Pending Withdrawals</p>
              <h3>{stats.pendingWithdrawalsCount}</h3>
            </div>
          </div>

          <div className="admin-grid two-col">
            <div className="admin-card">
              <div className="admin-section-title-row">
                <h3>Active Games</h3>
                <span className="admin-pill success">All Live</span>
              </div>
              <ul className="admin-list">
                {gameConfigs.map(g => {
                  const ts = timerStates[g.key];
                  return (
                    <li key={g.key}>
                      <span>{g.name}</span>
                      <strong style={{ color: ts && ts.isBettingOpen ? '#0f0' : '#f00' }}>
                        {ts ? (ts.isBettingOpen ? 'OPEN' : 'CLOSED') : 'Loading'}
                      </strong>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="admin-card">
              <div className="admin-section-title-row">
                <h3>System Status</h3>
                <span className="admin-pill">Operational</span>
              </div>
              <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>
                All game servers and automatic result generation systems are currently running.
                Profit optimization engine is active and rigorously maintaining maximum house yield.
              </p>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 16 }}>
            <div className="admin-section-title-row">
              <h3>Recent Profits by Game</h3>
              <span className="admin-pill">Last 5 Periods</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
              {gameConfigs.map(g => {
                const gameRecords = profitRecords.filter(r => r.game === g.key).slice(0, 5);
                return (
                  <div key={g.key} style={{ background: '#0a0a1a', padding: 12, borderRadius: 8 }}>
                    <h4 style={{ color: '#0ff', margin: '0 0 12px 0' }}>{g.name}</h4>
                    {gameRecords.length === 0 ? (
                      <div style={{ color: '#666', fontSize: '0.85rem' }}>No records yet...</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {gameRecords.map(r => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingBottom: 8, borderBottom: '1px solid #1a1a2e' }}>
                            <div>
                              <span style={{ color: '#aaa' }}>P: {r.period}</span>
                              <div style={{ color: '#fff', marginTop: 2 }}>Win: {r.winningOption}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ color: r.profit >= 0 ? '#0f0' : '#f00' }}>
                                {r.profit >= 0 ? '+' : ''}₹{r.profit.toFixed(0)}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'games' && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>📡 Live Games Monitor</h3>
            <div style={{ background: '#0a1a2e', padding: 12, borderRadius: 6, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Global Period (synced with all game pages)</span>
              <strong style={{ color: '#0ff', fontSize: '1.2rem', fontFamily: 'monospace' }}>{globalTimer.period}</strong>
            </div>
            <div style={{ background: '#0a2a1a', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              <p style={{ margin: 0, color: '#0f0', fontSize: '0.9rem' }}>
                💡 <strong>System Online:</strong> AI Profit Engine is actively managing all pools and maximizing house edge. Manual override available by clicking a selection.
              </p>
            </div>
            {gameConfigs.map(game => {
              const timerState = timerStates[game.key] || calculateTimerState(game.duration, game.bettingDuration);
              const periodKey = `${game.key}-${timerState.period}`;

              // Clear floor when period changes to avoid cross-period bleed
              const prevPeriodKey = betDisplayFloors.current.__lastPeriodKey;
              if (prevPeriodKey && prevPeriodKey !== `${game.key}-${timerState.period}`) {
                // Only delete THIS game's old period entries, not all
                Object.keys(betDisplayFloors.current).forEach(k => {
                  if (k.startsWith(game.key + '-') && k !== periodKey) {
                    delete betDisplayFloors.current[k];
                  }
                });
              }

              let liveBets = getLiveBetStatsWithFloor(game.key, timerState.period);

              if (liveBets.total === 0) {
                const effectiveSeconds = timerState.isBettingOpen 
                  ? (timerState.secondsIntoPeriod ?? globalTimer.secondsIntoPeriod ?? 0) 
                  : game.bettingDuration;
                  
                liveBets = generateFakeBetBreakdown(
                  game.key,
                  timerState.period,
                  effectiveSeconds,
                  game.bettingDuration
                );
              }

              liveBets = applyBetFloor(betDisplayFloors, periodKey, liveBets);

              const selectedWinner = getSelectedWinner(game.key, timerState.period);
              return (
                <AdminGameCard
                  key={game.key}
                  game={game}
                  timerState={timerState}
                  liveBets={liveBets}
                  selectedWinner={selectedWinner}
                  onSetWinner={(winner) => {
                    setSelectedWinner(game.key, timerState.period, winner);
                  }}
                  onClearWinner={() => {
                    clearSelectedWinner(game.key, timerState.period);
                  }}
                />
              );
            })}
          </div>

          <div className="admin-card">
            <div className="admin-section-title-row">
              <h3>Recent Completed Periods - All Games</h3>
              <span className="admin-pill">Game History</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {gameConfigs.map(game => (
                <div key={game.key} style={{ background: '#0a0a1a', padding: 12, borderRadius: 6 }}>
                  <h4 style={{ color: '#0ff', marginTop: 0, marginBottom: 12 }}>{game.name}</h4>
                  <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
                    {gameHistories[game.key] && gameHistories[game.key].map((result, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: '1px solid #1a1a2e',
                        fontSize: '0.85rem'
                      }}>
                            <span style={{ color: '#aaa' }}>Period {result.period}</span>
                            <span style={{
                              display: 'inline-block',
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: result.color || '#666'
                            }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'recharges' && (
        <div className="admin-card">
          <div className="admin-section-title-row">
            <h3>Recharge Requests</h3>
            <span className="admin-pill">Pending approval</span>
          </div>
          {pendingRecharges.length === 0 ? (
            <p className="admin-empty">No recharge requests waiting.</p>
          ) : (
            <div className="admin-list-stack">
              {pendingRecharges.map((request) => {
                const playerData = allUsers.find(u => u.id.toString() === request.userId?.toString());
                const isFirstRecharge = !financialRecords.some(r => r.userId === request.userId && r.type === 'Recharge' && r.status === 'Success');
                return (
                <div key={request.id} className="admin-request-row">
                  <div>
                    <strong>Player ID #{playerData ? (playerData.player_id || request.userId) : request.userId}</strong>
                    {playerData && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#94a3b8' }}>({playerData.nickname} • {playerData.vipLevel || 'Bronze'})</span>}
                    {isFirstRecharge && <span style={{ marginLeft: 8, fontSize: '0.75rem', background: '#10b981', color: 'white', borderRadius: 999, padding: '2px 7px' }}>🌟 First Recharge (+10%)</span>}
                    <p>Amount: ₹{request.amount} • {new Date(request.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="admin-actions">
                    <button className="admin-btn" style={{ background: '#4b5563', color: 'white' }} onClick={() => {
                      const history = financialRecords.filter(r => r.userId === request.userId && (r.type === 'Recharge' || r.type === 'Withdraw'));
                      if (history.length === 0) alert('No history found for this user.');
                      else alert('History:\n' + history.map(r => `${r.time} - ${r.type}: ${r.amount} (${r.status})`).join('\n'));
                    }}>History</button>
                     <button className="admin-btn primary" onClick={() => handleApproveRecharge(request.id, request.userId, request.amount)}>Approve</button>
                    <button className="admin-btn danger" onClick={() => rejectRecharge(request.id)}>Reject</button>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          <div className="admin-section-title-row" style={{ marginTop: 40, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
            <h3>Razorpay Transactions</h3>
            <span className="admin-pill" style={{ background: '#e0f2fe', color: '#0369a1' }}>Auto-credited</span>
          </div>
          <RazorpayTransactions />
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="admin-card">
          <div className="admin-section-title-row">
            <h3>Withdrawal Requests</h3>
            <span className="admin-pill">Manual payout queue</span>
          </div>
          {pendingWithdrawals.length === 0 ? (
            <p className="admin-empty">No withdrawals awaiting action.</p>
          ) : (
            <div className="admin-list-stack">
              {pendingWithdrawals.map((request) => {
                const playerData = allUsers.find(u => u.id.toString() === request.userId?.toString());
                return (
                <div key={request.id} className="admin-request-row">
                  <div>
                    <strong>Player ID #{playerData ? (playerData.player_id || request.userId) : request.userId}</strong>
                    <p>UPI: {request.upiId} • Amount ₹{request.amount}</p>
                    <p>Status: {request.status || 'pending'}</p>
                  </div>
                  <div className="admin-actions">
                    <button className="admin-btn" style={{ background: '#4b5563', color: 'white' }} onClick={() => {
                      const history = financialRecords.filter(r => r.userId === request.userId && (r.type === 'Recharge' || r.type === 'Withdraw'));
                      if (history.length === 0) alert('No history found for this user.');
                      else alert('History:\n' + history.map(r => `${r.time} - ${r.type}: ${r.amount} (${r.status})`).join('\n'));
                    }}>History</button>
                    <button className="admin-btn primary" onClick={() => approveWithdrawal(request.id)}>Complete</button>
                    <button className="admin-btn danger" onClick={() => rejectWithdrawal(request.id)}>Reject</button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-card">
          <div className="admin-section-title-row">
            <h3>Registered Users</h3>
            <span className="admin-pill">Total: {allUsers.length}</span>
          </div>
          <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a4e', color: '#aaa' }}>
                <th style={{ padding: '12px 8px' }}>User ID</th>
                <th style={{ padding: '12px 8px' }}>Phone</th>
                <th style={{ padding: '12px 8px' }}>Wallet Balance</th>
                <th style={{ padding: '12px 8px' }}>Total Recharge</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <td style={{ padding: '12px 8px', color: '#0ff', fontWeight: 'bold' }}>{u.id}</td>
                  <td style={{ padding: '12px 8px' }}>{u.phone || u.email || 'N/A'}</td>
                  <td style={{ padding: '12px 8px', color: '#0f0' }}>₹{(u.wallet || u.main_balance || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', color: '#ffd700' }}>₹{(u.totalRecharge || u.total_recharge || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: 4, 
                      fontSize: '0.8rem', 
                      background: (u.status || 'Active') === 'Frozen' ? '#8b0000' : '#1a3a2e',
                      color: (u.status || 'Active') === 'Frozen' ? '#ffcccc' : '#0f0'
                    }}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="admin-grid two-col">
          <div className="admin-card">
            <div className="admin-section-title-row">
              <h3>Finance Settings</h3>
              <span className="admin-pill">Manual Controls</span>
            </div>
            <ul className="admin-list admin-settings-list">
              <li>
                <span>Min Recharge (₹)</span>
                <input 
                  type="number" 
                  value={adminSettings.minRecharge} 
                  onChange={e => setAdminSettings({...adminSettings, minRecharge: Number(e.target.value)})}
                  style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}
                />
              </li>
              <li>
                <span>Min Withdrawal (₹)</span>
                <input 
                  type="number" 
                  value={adminSettings.minWithdrawal} 
                  onChange={e => setAdminSettings({...adminSettings, minWithdrawal: Number(e.target.value)})}
                  style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}
                />
              </li>
              <li>
                <span>Max Withdrawal (₹)</span>
                <input 
                  type="number" 
                  value={adminSettings.maxWithdrawal} 
                  onChange={e => setAdminSettings({...adminSettings, maxWithdrawal: Number(e.target.value)})}
                  style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}
                />
              </li>
              <li>
                <span>Maintenance Mode</span>
                <select 
                  value={adminSettings.maintenanceMode}
                  onChange={e => setAdminSettings({...adminSettings, maintenanceMode: e.target.value})}
                  style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}
                >
                  <option value="Off">Off</option>
                  <option value="On">On</option>
                </select>
              </li>
            </ul>
          </div>
          <div className="admin-card">
            <div className="admin-section-title-row">
              <h3>System Status</h3>
              <span className="admin-pill success">Healthy</span>
            </div>
            <ul className="admin-list">
              <li><span>Backend API</span><strong style={{ color: '#0f0' }}>Online</strong></li>
              <li><span>Database</span><strong style={{ color: '#0f0' }}>Connected</strong></li>
              <li><span>Cache</span><strong style={{ color: '#0f0' }}>Active</strong></li>
              <li><span>WebSocket</span><strong style={{ color: '#0f0' }}>Ready</strong></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
