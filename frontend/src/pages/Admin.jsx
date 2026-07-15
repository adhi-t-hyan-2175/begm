import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { calculateTimerState, useGameTimer } from '../hooks/useGameTimer';
import { GlobalGameContext } from '../contexts/GlobalGameContext';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    options: ['2 Hits', '3 Hits', '5 Hits'] 
  },
];

const payoutRatios = {
  FastParty: { Green: 1.9, Red: 1.9, Violet: 4.5 },
  PrimePick: { Green: 1.9, Red: 1.9, Violet: 4.5 },
  LuckyPick: { Green: 1.9, Red: 1.9, Violet: 4.5 },
  Wheelocity: { '2 Hits': 1.9, '3 Hits': 3, '5 Hits': 5 },
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
    if (normalized.includes('small')) return '#0ea5e9';
    if (normalized.includes('large')) return '#dc3545';
    if (normalized === 'tie' || normalized === '7' || normalized === 'seven') return '#f1c40f';
    if (normalized.includes('two')) return '#0ea5e9';
    if (normalized.includes('three')) return '#ff8cec';
    if (normalized.includes('five')) return '#88f29f';
    return '#0ff';
  };

  const colorOnlyGames = ['FastParty', 'PrimePick', 'LuckyPick'];
  const wheelOnlyGames = ['Wheelocity'];
  const displayOptions = colorOnlyGames.includes(game.key)
    ? ['Green', 'Violet', 'Red']
    : wheelOnlyGames.includes(game.key)
      ? ['2 Hits', '3 Hits', '5 Hits']
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

      {liveBets.total >= 0 && (
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
                    onClick={() => {
                      if (!timerState.isBettingOpen) {
                        alert("⚠️ Too late! You must select the winner DURING the betting phase (countdown > 00:00). The game engine has already processed this period.");
                        return;
                      }
                      onSetWinner(option);
                    }}
                    style={{
                      background: isWinner ? '#1a3a2e' : '#0a1a2e',
                      padding: 12,
                      borderRadius: 6,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: isWinner ? '3px solid #0f0' : '1px solid #2a4a3e',
                      opacity: 1,
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

// Removed mock gameStatus, recentPeriods, and users arrays to ensure only real DB data is shown.


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
              User: {txn.users?.nickname} ({txn.users?.email}) â€¢ Player ID: {txn.users?.player_id}
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
  const [authState, setAuthState] = useState({ checking: true, authenticated: false, email: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('games');
  const globalTimer = useGameTimer(60, 15);
  const { gameHistories } = useContext(GlobalGameContext);

  const [adminSettings, setAdminSettings] = useState({ platform: {}, tasks: {}, vip_levels: [], games: [] });
  const [profitRecords, setProfitRecords] = useState([]);
  
  // Stats state from dashboard API
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineNow: 0,
    activeUsers: 0,
    totalWalletBalance: 0,
    pendingRechargeCount: 0,
    pendingWithdrawalsCount: 0,
    todayTotalBets: 0,
    todayRevenue: 0,
    todayProfit: 0,
    todayRecharge: 0,
    todayWithdrawal: 0
  });

  // Local Admin State for Global Data
  const [allUsers, setAllUsers] = useState([]);
  const [allRecharges, setAllRecharges] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [globalLiveBets, setGlobalLiveBets] = useState([]);
  const [betHistorySearch, setBetHistorySearch] = useState('');

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [userProfileLoading, setUserProfileLoading] = useState(false);

  // Phase 6 Monitor States
  const [fraudReport, setFraudReport] = useState({ duplicate_utrs: [], duplicate_upis: [], duplicate_devices: [] });
  const [adminSessions, setAdminSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ server_status: 'Online', database_status: 'Connected', active_users: 0, bets_per_minute: 0, recharge_volume_today: 0, withdrawal_volume_today: 0, errors_today: 0 });
  const [systemLogs, setSystemLogs] = useState([]);

  const fetchUserProfile = async (id) => {
    setUserProfileLoading(true);
    setSelectedUserProfile(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/user/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedUserProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
    setUserProfileLoading(false);
  };
  const getGlobalLiveBetStats = (gameKey, period) => {
    const relevantBets = globalLiveBets.filter(b => b.game_type === gameKey && String(b.period) === String(period));
    const bySelection = {};
    let total = 0;
    relevantBets.forEach(b => {
      const amt = parseFloat(b.amount) || 0;
      bySelection[b.selection] = (bySelection[b.selection] || 0) + amt;
      total += amt;
    });
    return { total, bySelection, orders: relevantBets };
  };

  // Fetch admin data on mount and poll
  useEffect(() => {
    if (!authState.authenticated) return;
    const fetchAdminData = async () => {
      try {
        const token = sessionStorage.getItem('admin_token');
        if (!token) return;
        
        // Fetch Users
        const usersRes = await fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        const usersData = await usersRes.json();
        if (usersData.success) setAllUsers(usersData.users);

        // Fetch Recharges
        const rechargeRes = await fetch(`${API_BASE}/api/admin/recharge-requests`, { headers: { Authorization: `Bearer ${token}` } });
        const rechargeData = await rechargeRes.json();
        if (rechargeData.success) {
          setAllRecharges(rechargeData.requests.map(r => ({
            id: r.id,
            userId: r.user_id,
            amount: r.amount,
            utrNumber: r.utr_number,
            senderName: r.sender_name,
            senderUpi: r.sender_upi,
            status: r.status,
            timestamp: r.created_at,
            users: r.users || null,
            approvedBy: r.approved_by || null,
            rejectReason: r.reject_reason || null
          })));
        }

        // Fetch Withdrawals
        const withdrawalRes = await fetch(`${API_BASE}/api/admin/withdrawal-requests`, { headers: { Authorization: `Bearer ${token}` } });
        const withdrawalData = await withdrawalRes.json();
        if (withdrawalData.success) {
          setAllWithdrawals(withdrawalData.requests.map(w => ({
            id: w.id,
            userId: w.user_id,
            amount: w.amount,
            upiId: w.upi_id,
            upiName: w.upi_name,
            status: w.status,
            timestamp: w.created_at,
            users: w.users || null,
            approvedBy: w.approved_by || null,
            rejectReason: w.reject_reason || null
          })));
        }

        // Fetch Live Bets
        const betsRes = await fetch(`${API_BASE}/api/admin/live-bets`, { headers: { Authorization: `Bearer ${token}` } });
        const betsData = await betsRes.json();
        if (betsData.success) setGlobalLiveBets(betsData.bets);

        // Fetch Dashboard Stats
        const dashboardRes = await fetch(`${API_BASE}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        const dashboardData = await dashboardRes.json();
        if (dashboardData.success) {
          setStats(dashboardData.stats);
        }

        // Fetch Settings
        const settingsRes = await fetch(`${API_BASE}/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
          setAdminSettings(settingsData.settings || {});
        }

        // Phase 6 Fetches
        const fraudRes = await fetch(`${API_BASE}/api/admin/fraud-report`, { headers: { Authorization: `Bearer ${token}` } });
        const fraudData = await fraudRes.json();
        if (fraudData.success) setFraudReport(fraudData);

        const activityRes = await fetch(`${API_BASE}/api/admin/activity`, { headers: { Authorization: `Bearer ${token}` } });
        const activityData = await activityRes.json();
        if (activityData.success) {
          setAdminSessions(activityData.sessions || []);
          setAuditLogs(activityData.logs || []);
        }

        const dStatsRes = await fetch(`${API_BASE}/api/admin/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } });
        const dStatsData = await dStatsRes.json();
        if (dStatsData.success) {
          setDashboardStats(dStatsData.stats);
          setSystemLogs(dStatsData.system_logs || []);
        }

      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      }
    };
    fetchAdminData();

    // Realtime subscriptions for admin panel
    let subscriptions = [];
    
    import('../services/supabase').then(({ supabase, isSupabaseReady }) => {
      if (isSupabaseReady()) {
        const handleDbChange = () => fetchAdminData();
        
        subscriptions = [
          supabase.channel('admin:recharge_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'recharge_requests' }, handleDbChange).subscribe(),
          supabase.channel('admin:withdrawal_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, handleDbChange).subscribe(),
          supabase.channel('admin:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, handleDbChange).subscribe(),
          supabase.channel('admin:wallets').on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, handleDbChange).subscribe(),
          supabase.channel('admin:bets').on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, handleDbChange).subscribe(),
          supabase.channel('admin:transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, handleDbChange).subscribe(),
        ];
      }
    }).catch(err => console.warn('Supabase realtime error', err));

    return () => {
      import('../services/supabase').then(({ supabase }) => {
        subscriptions.forEach(sub => supabase.removeChannel(sub));
      });
    };
  }, [authState.authenticated]);

  const getSelectedWinner = (gameKey) => {
    try {
      if (adminSettings?.forced_game_result) {
        const forced = JSON.parse(adminSettings.forced_game_result);
        if (forced.gameType === gameKey && Date.now() - forced.timestamp < 120000) {
          return forced.result;
        }
      }
    } catch (e) {}
    return null;
  };

  const setSelectedWinner = async (gameKey, period, winner) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/set-game-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` },
        body: JSON.stringify({ gameType: gameKey, result: winner })
      });
      if (res.ok) {
        setAdminSettings(prev => ({
          ...prev,
          forced_game_result: JSON.stringify({ gameType: gameKey, result: winner, timestamp: Date.now() })
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearSelectedWinner = async (gameKey, period) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/set-game-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` },
        body: JSON.stringify({ gameType: gameKey, result: null })
      });
      if (res.ok) {
        setAdminSettings(prev => ({
          ...prev,
          forced_game_result: JSON.stringify({ gameType: gameKey, result: null, timestamp: Date.now() })
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const approveRecharge = async (reqId, userId, amount) => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/admin/approve-recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: reqId, userId, amount })
      });
      if (res.ok) {
        setAllRecharges(prev => prev.map(r => r.id === reqId ? { ...r, status: 'approved' } : r));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve recharge');
      }
    } catch (err) {
      console.error(err);
      alert('Network error approving recharge');
    }
  };

  const rejectRecharge = async (reqId) => {
    const reason = window.prompt("Enter reason for rejection:", "Invalid UTR / Payment not received");
    if (reason === null) return; // Admin cancelled

    try {
      const token = sessionStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/admin/reject-recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: reqId, reason })
      });
      const data = await res.json();
      if (data.success) {
        setAllRecharges(prev => prev.map(r => r.id === reqId ? { ...r, status: 'rejected', rejectReason: reason } : r));
      } else {
        alert(data.error || 'Failed to reject recharge');
      }
    } catch (err) {
      console.error(err);
      alert('Network error rejecting recharge');
    }
  };

  const approveWithdrawal = async (reqId) => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/admin/approve-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: reqId })
      });
      const data = await res.json();
      if (data.success) {
        setAllWithdrawals(prev => prev.map(r => r.id === reqId ? { ...r, status: 'completed' } : r));
      } else {
        alert(data.error || 'Failed to approve withdrawal');
      }
    } catch (err) {
      console.error(err);
      alert('Network error approving withdrawal');
    }
  };

  const rejectWithdrawal = async (reqId) => {
    const reason = window.prompt("Enter reason for rejection:", "Bank details incorrect");
    if (reason === null) return; // Admin cancelled

    try {
      const token = sessionStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/admin/reject-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: reqId, reason })
      });
      const data = await res.json();
      if (data.success) {
        setAllWithdrawals(prev => prev.map(r => r.id === reqId ? { ...r, status: 'rejected', rejectReason: reason } : r));
      } else {
        alert(data.error || 'Failed to reject withdrawal');
      }
    } catch (err) {
      console.error(err);
      alert('Network error rejecting withdrawal');
    }
  };

  const holdWithdrawal = async (reqId) => {
    setAllWithdrawals(prev => prev.map(r => r.id === reqId ? { ...r, status: 'held' } : r));
  };


  const timerStates = useMemo(() => {
    const newStates = {};
    const now = Date.now();
    gameConfigs.forEach((game) => {
      newStates[game.key] = calculateTimerState(game.duration, game.bettingDuration, now);
    });
    return newStates;
  }, [globalTimer.timeLeft]); // Re-calculate every 1 second when globalTimer ticks



  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) {
      setAuthState({ checking: false, authenticated: false, email: '' });
      return;
    }

    fetch(`${API_BASE}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.admin) {
          setAuthState({ checking: false, authenticated: true, email: data.admin.email });
        } else {
          sessionStorage.removeItem('admin_token');
          setAuthState({ checking: false, authenticated: false, email: '' });
        }
      })
      .catch(() => {
        sessionStorage.removeItem('admin_token');
        setAuthState({ checking: false, authenticated: false, email: '' });
      });
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    
    // Extract directly from the DOM to bypass any browser autofill React state staleness
    const formData = new FormData(event.target);
    const email = formData.get('email') || loginForm.email;
    const password = formData.get('password') || loginForm.password;

    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      setLoginError(data.message || 'Login failed');
      return;
    }

    sessionStorage.setItem('admin_token', data.token);
    setAuthState({ checking: false, authenticated: true, email: data.admin.email });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setAuthState({ checking: false, authenticated: false, email: '' });
  };

  const updateSettingSection = async (type, data) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/update-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` },
        body: JSON.stringify({ type, data })
      });
      if (res.ok) alert(`${type} settings saved successfully!`);
      else alert(`Failed to save ${type} settings`);
    } catch (err) {
      alert('Network error while saving settings');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Frozen' ? 'Active' : 'Frozen';
    try {
      const res = await fetch(`${API_BASE}/api/admin/set-user-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` },
        body: JSON.stringify({ userId, status: newStatus })
      });
      if (res.ok) {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Network error updating status');
    }
  };

  const handleEditUser = async (user) => {
    const newBalance = prompt(`Enter new Main Balance for User ${user.id}:`, user.wallet || user.main_balance || 0);
    if (newBalance === null) return;
    
    const newNickname = prompt(`Enter new Nickname for User ${user.id}:`, user.nickname || '');
    if (newNickname === null) return;

    const newAdminNote = prompt(`Enter new Admin Note for User ${user.id}:`, user.admin_note || '');

    try {
      const res = await fetch(`${API_BASE}/api/admin/edit-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('admin_token')}` },
        body: JSON.stringify({ userId: user.id, mainBalance: newBalance, nickname: newNickname, adminNote: newAdminNote })
      });
      if (res.ok) {
        setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, wallet: Number(newBalance), main_balance: Number(newBalance), nickname: newNickname, admin_note: newAdminNote } : u));
        if (selectedUserProfile?.user?.id === user.id) {
          fetchUserProfile(user.id);
        }
        alert('User updated successfully!');
      } else {
        alert('Failed to edit user');
      }
    } catch (err) {
      alert('Network error editing user');
    }
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
    return <div className="admin-shell admin-loading">Verifying secure admin session...</div>;
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
              Email Address
              <input type="email" name="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="admin@example.com" required />
            </label>
            <label>
              Password
              <input type="password" name="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Enter secret password" required />
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
          <span className="admin-pill">Signed in as {authState.email}</span>
          <button className="admin-btn danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-tabs">
        {['dashboard', 'analytics', 'games', 'recharges', 'withdrawals', 'users', 'settings', 'backups', 'audit'].map((tab) => (
          <button key={tab} className={`admin-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'dashboard' && '📊 Dashboard'}
            {tab === 'analytics' && '📈 Analytics'}
            {tab === 'games' && '🎮 Live Games'}
            {tab === 'recharges' && '➕ Recharges'}
            {tab === 'withdrawals' && '➖ Withdrawals'}
            {tab === 'users' && '👥 Users'}
            {tab === 'settings' && '⚙️ Settings'}
            {tab === 'backups' && '💾 Backups'}
            {tab === 'audit' && '📋 Audit Logs'}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="admin-grid">
            <div className="admin-card">
              <p className="admin-card-label">Total Users</p>
              <h3>{stats.totalUsers}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Online Users</p>
              <h3>{stats.onlineNow}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Active Users</p>
              <h3>{stats.activeUsers}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Total Wallet Balance</p>
              <h3>₹{stats.totalWalletBalance?.toLocaleString()}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Pending Recharges</p>
              <h3>{stats.pendingRechargeCount}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Pending Withdrawals</p>
              <h3>{stats.pendingWithdrawalsCount}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Today's Total Bets</p>
              <h3>₹{stats.todayTotalBets?.toLocaleString()}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Today's Revenue</p>
              <h3>₹{stats.todayRevenue?.toLocaleString()}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Today's Profit</p>
              <h3 style={{ color: stats.todayProfit >= 0 ? '#10b981' : '#ef4444' }}>
                ₹{stats.todayProfit?.toLocaleString()}
              </h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Today's Recharge</p>
              <h3 style={{ color: '#10b981' }}>₹{stats.todayRecharge?.toLocaleString() || 0}</h3>
            </div>
            <div className="admin-card">
              <p className="admin-card-label">Today's Withdrawal</p>
              <h3 style={{ color: '#ef4444' }}>₹{stats.todayWithdrawal?.toLocaleString() || 0}</h3>
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
              let liveBets = getGlobalLiveBetStats(game.key, timerState.period);
              const selectedWinner = getSelectedWinner(game.key);
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

          <div className="admin-card" style={{ marginBottom: 24 }}>
            <div className="admin-section-title-row">
              <h3>Global Betting History</h3>
              <span className="admin-pill success">Live Feed</span>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <input 
                type="text" 
                placeholder="Search by Player, Game, Period, or Amount..." 
                value={betHistorySearch}
                onChange={(e) => setBetHistorySearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Player</th>
                    <th>Game / Period</th>
                    <th>Selection</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {globalLiveBets
                    .filter(b => {
                      if (!betHistorySearch) return true;
                      const s = betHistorySearch.toLowerCase();
                      return (
                        (b.users?.nickname || '').toLowerCase().includes(s) ||
                        (b.users?.email || '').toLowerCase().includes(s) ||
                        String(b.game_type).toLowerCase().includes(s) ||
                        String(b.period).includes(s) ||
                        String(b.amount).includes(s)
                      );
                    })
                    .slice(0, 100) // Show top 100 for performance
                    .map((bet, idx) => (
                    <tr key={idx}>
                      <td>{new Date(bet.created_at).toLocaleString()}</td>
                      <td>
                        <strong>{bet.users?.nickname || 'Unknown'}</strong><br/>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{bet.users?.email}</span>
                      </td>
                      <td>
                        {bet.game_type.toUpperCase()}<br/>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{bet.period}</span>
                      </td>
                      <td><strong>{String(bet.selection).toUpperCase()}</strong></td>
                      <td>₹{bet.amount}</td>
                      <td>
                        <span className={`admin-pill ${bet.status === 'won' ? 'success' : bet.status === 'lost' ? 'danger' : 'warning'}`}>
                          {bet.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {globalLiveBets.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center' }}>No bets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
            <span className="admin-pill">Global Queue</span>
          </div>
          {allRecharges.length === 0 ? (
            <p className="admin-empty">No recharge requests found.</p>
          ) : (
            <div className="admin-list-stack">
              {allRecharges.map((request) => {
                const playerData = allUsers.find(u => u.id.toString() === request.userId?.toString());
                const isFirstRecharge = request.users && request.users.first_recharge_bonus_claimed === false;
                
                return (
                <div key={request.id} className="admin-request-row">
                  <div>
                    <strong>Player ID #{request.users?.player_id || request.userId}</strong>
                    {request.users && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#94a3b8' }}>({request.users.nickname} • {request.users.email || 'No email'})</span>}
                    {isFirstRecharge && <span style={{ marginLeft: 8, fontSize: '0.75rem', background: '#10b981', color: 'white', borderRadius: 999, padding: '2px 7px' }}>🌟 First Recharge (100% Bonus)</span>}
                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>Amount: ₹{request.amount} • {new Date(request.timestamp).toLocaleString()}</p>
                    
                    <div style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: 6, fontSize: '0.85rem', marginTop: 4 }}>
                      <div><strong>Sender Name:</strong> {request.senderName || 'N/A'}</div>
                      <div><strong>Sender UPI:</strong> {request.senderUpi || 'N/A'}</div>
                      {request.utrNumber && (
                        <div style={{ color: '#059669', fontWeight: 'bold' }}>
                          <strong>UTR / Ref:</strong> {request.utrNumber}
                        </div>
                      )}
                      {request.status !== 'pending' && (
                        <div style={{ marginTop: 4, color: request.status === 'approved' ? '#059669' : '#dc2626' }}>
                          <strong>Status:</strong> {request.status.toUpperCase()} 
                          {request.approvedBy && ` (by ${request.approvedBy})`}
                          {request.rejectReason && ` - Reason: ${request.rejectReason}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button className="admin-btn" style={{ background: '#4b5563', color: 'white' }} onClick={async () => {
                      try {
                        const token = sessionStorage.getItem('admin_token');
                        const res = await fetch(`${API_BASE}/api/admin/transactions/${request.userId}`, { headers: { Authorization: `Bearer ${token}` }});
                        const data = await res.json();
                        if (data.success && data.transactions.length > 0) {
                          alert('History:\n' + data.transactions.map(r => `${new Date(r.created_at).toLocaleString()} - ${r.type}: ₹${r.amount} (${r.status})`).join('\n'));
                        } else {
                          alert('No history found for this user.');
                        }
                      } catch (e) {
                        alert('Error fetching history');
                      }
                    }}>History</button>
                    {request.status === 'pending' ? (
                      <>
                        <button className="admin-btn primary" onClick={() => handleApproveRecharge(request.id, request.userId, request.amount)}>Approve</button>
                        <button className="admin-btn danger" onClick={() => rejectRecharge(request.id)}>Reject</button>
                      </>
                    ) : (
                      <span className={`admin-pill ${request.status === 'approved' ? 'success' : 'danger'}`}>
                        {request.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="admin-card">
          <div className="admin-section-title-row">
            <h3>Withdrawal Requests</h3>
            <span className="admin-pill">Global Queue</span>
          </div>
          {allWithdrawals.length === 0 ? (
            <p className="admin-empty">No withdrawals found.</p>
          ) : (
            <div className="admin-list-stack">
              {allWithdrawals.map((request) => {
                const playerData = allUsers.find(u => u.id.toString() === request.userId?.toString());
                const walletBalance = playerData?.wallets?.length > 0 ? playerData.wallets[0].main_balance : 'N/A';
                
                return (
                <div key={request.id} className="admin-request-row">
                  <div>
                    <strong>Player ID #{request.users?.player_id || request.userId}</strong>
                    {request.users && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#94a3b8' }}>({request.users.nickname} • {request.users.email || 'No email'})</span>}
                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>Amount: ₹{request.amount} • {new Date(request.timestamp).toLocaleString()}</p>
                    
                    <div style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: 6, fontSize: '0.85rem', marginTop: 4 }}>
                      <div><strong>Wallet Balance:</strong> ₹{walletBalance}</div>
                      <div><strong>Total Recharge:</strong> ₹{request.users?.total_recharge || 0}</div>
                      <div style={{ marginTop: 4 }}><strong>UPI ID:</strong> {request.upiId}</div>
                      <div><strong>Account Holder:</strong> {request.upiName || 'N/A'}</div>
                      
                      {request.status !== 'pending' && (
                        <div style={{ marginTop: 4, color: request.status === 'completed' ? '#059669' : '#dc2626' }}>
                          <strong>Status:</strong> {request.status.toUpperCase()} 
                          {request.approvedBy && ` (by ${request.approvedBy})`}
                          {request.rejectReason && ` - Reason: ${request.rejectReason}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button className="admin-btn" style={{ background: '#4b5563', color: 'white' }} onClick={async () => {
                      try {
                        const token = sessionStorage.getItem('admin_token');
                        const res = await fetch(`${API_BASE}/api/admin/transactions/${request.userId}`, { headers: { Authorization: `Bearer ${token}` }});
                        const data = await res.json();
                        if (data.success && data.transactions.length > 0) {
                          alert('History:\n' + data.transactions.map(r => `${new Date(r.created_at).toLocaleString()} - ${r.type}: ₹${r.amount} (${r.status})`).join('\n'));
                        } else {
                          alert('No history found for this user.');
                        }
                      } catch (e) {
                        alert('Error fetching history');
                      }
                    }}>History</button>
                    {request.status === 'pending' ? (
                      <>
                        <button className="admin-btn primary" onClick={() => approveWithdrawal(request.id)}>Approve</button>
                        <button className="admin-btn danger" onClick={() => rejectWithdrawal(request.id)}>Reject</button>
                      </>
                    ) : (
                      <span className={`admin-pill ${request.status === 'completed' ? 'success' : 'danger'}`}>
                        {request.status.toUpperCase()}
                      </span>
                    )}
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

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input 
              type="text" 
              placeholder="Search Player ID, Email, or Name..." 
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
            />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
            >
              <option value="All">All Users</option>
              <option value="VIP">VIP Members</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended/Frozen</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a4e', color: '#aaa' }}>
                  <th style={{ padding: '12px 8px' }}>Player ID</th>
                  <th style={{ padding: '12px 8px' }}>Name / Email</th>
                  <th style={{ padding: '12px 8px' }}>VIP Level</th>
                  <th style={{ padding: '12px 8px' }}>Wallet</th>
                  <th style={{ padding: '12px 8px' }}>Total In/Out</th>
                  <th style={{ padding: '12px 8px' }}>Bets (W/L)</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers
                  .filter(u => {
                    if (userFilter === 'VIP' && (u.vip_level || 0) < 1) return false;
                    if (userFilter === 'Active' && u.status === 'Frozen') return false;
                    if (userFilter === 'Suspended' && u.status !== 'Frozen') return false;
                    if (!userSearchQuery) return true;
                    const sq = userSearchQuery.toLowerCase();
                    return (
                      String(u.player_id).includes(sq) ||
                      (u.email || '').toLowerCase().includes(sq) ||
                      (u.nickname || '').toLowerCase().includes(sq) ||
                      String(u.id).includes(sq)
                    );
                  })
                  .map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                    <td style={{ padding: '12px 8px', color: '#0ff', fontWeight: 'bold' }}>{u.player_id || u.id}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <strong>{u.nickname || 'Unknown'}</strong><br/>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email || u.phone || 'N/A'}</span>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#ffd700' }}>VIP {u.vip_level || 0}</td>
                    <td style={{ padding: '12px 8px', color: '#0f0' }}>₹{(u.wallet || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ color: '#10b981' }}>+₹{(u.totalRecharge || u.total_recharge || 0).toLocaleString()}</span><br/>
                      <span style={{ color: '#ef4444' }}>-₹{(u.total_withdrawal || 0).toLocaleString()}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {u.total_bets || 0} <span style={{ fontSize: '0.8rem', color: '#aaa' }}>({u.total_wins || 0}/{u.total_losses || 0})</span>
                    </td>
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
                    <td style={{ padding: '12px 8px' }}>
                      <button onClick={() => fetchUserProfile(u.id)} style={{ marginRight: 8, padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>View Profile</button>
                      <button onClick={() => handleEditUser(u)} style={{ marginRight: 8, padding: '4px 8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>Quick Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedUserProfile && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#0f172a', width: '90%', maxWidth: '900px', height: '90%', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #334155' }}>
                <div style={{ padding: 20, borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0f1c' }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#fff' }}>{selectedUserProfile.user?.nickname || 'Player'} <span style={{ color: '#0ff', fontSize: '1rem' }}>#{selectedUserProfile.user?.player_id}</span></h2>
                    <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>{selectedUserProfile.user?.email}</p>
                  </div>
                  <button onClick={() => setSelectedUserProfile(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <div className="admin-card" style={{ background: '#1e293b' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Main Balance</p>
                      <h3 style={{ margin: '8px 0 0 0', color: '#0f0' }}>₹{selectedUserProfile.wallet?.main_balance?.toLocaleString() || 0}</h3>
                      <button onClick={() => handleEditUser(selectedUserProfile.user)} style={{ marginTop: 8, fontSize: '0.8rem', padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Adjust</button>
                    </div>
                    <div className="admin-card" style={{ background: '#1e293b' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>VIP Level</p>
                      <h3 style={{ margin: '8px 0 0 0', color: '#ffd700' }}>VIP {selectedUserProfile.user?.vip_level || 0}</h3>
                      <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>Total Recharge: ₹{selectedUserProfile.user?.total_recharge?.toLocaleString() || 0}</p>
                    </div>
                    <div className="admin-card" style={{ background: '#1e293b' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Account Status</p>
                      <h3 style={{ margin: '8px 0 0 0', color: selectedUserProfile.user?.status === 'Frozen' ? '#ef4444' : '#10b981' }}>{selectedUserProfile.user?.status || 'Active'}</h3>
                      <button onClick={() => handleToggleStatus(selectedUserProfile.user?.id, selectedUserProfile.user?.status)} style={{ marginTop: 8, fontSize: '0.8rem', padding: '4px 8px', background: selectedUserProfile.user?.status === 'Frozen' ? '#10b981' : '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Toggle Status</button>
                    </div>
                    <div className="admin-card" style={{ background: '#1e293b' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Admin Note</p>
                      <p style={{ margin: '8px 0 0 0', color: '#fff', fontSize: '0.9rem' }}>{selectedUserProfile.user?.admin_note || 'No notes.'}</p>
                    </div>
                  </div>

                  <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 16 }}>Recent Bets ({selectedUserProfile.bets?.length || 0})</h3>
                  <div style={{ overflowX: 'auto', marginBottom: 24, maxHeight: 200 }}>
                    <table className="admin-table">
                      <thead><tr><th>Time</th><th>Game</th><th>Period</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {selectedUserProfile.bets?.map((b, i) => (
                          <tr key={i}>
                            <td>{new Date(b.created_at).toLocaleString()}</td>
                            <td>{b.game_type}</td>
                            <td>{b.period}</td>
                            <td>₹{b.amount}</td>
                            <td><span className={`admin-pill ${b.status === 'won' ? 'success' : b.status === 'lost' ? 'danger' : 'warning'}`}>{b.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 16 }}>Financial Transactions</h3>
                  <div style={{ overflowX: 'auto', maxHeight: 200 }}>
                    <table className="admin-table">
                      <thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>Status</th><th>Notes</th></tr></thead>
                      <tbody>
                        {selectedUserProfile.transactions?.map((t, i) => (
                          <tr key={i}>
                            <td>{new Date(t.created_at).toLocaleString()}</td>
                            <td>{t.type}</td>
                            <td style={{ color: t.type === 'Recharge' || t.type === 'Deposit' ? '#10b981' : '#ef4444' }}>₹{t.amount}</td>
                            <td>{t.status}</td>
                            <td>{t.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="admin-grid two-col">
          <div className="admin-card">
            <div className="admin-section-title-row">
              <h3>Platform Configuration</h3>
              <button className="admin-btn primary" onClick={() => updateSettingSection('platform', adminSettings.platform)}>Save Platform</button>
            </div>
            <ul className="admin-list admin-settings-list">
              <li><span>Min Recharge (₹)</span><input type="number" value={adminSettings.platform?.min_recharge || 0} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, min_recharge: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
              <li><span>Max Recharge (₹)</span><input type="number" value={adminSettings.platform?.max_recharge || 0} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, max_recharge: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
              <li><span>Min Withdrawal (₹)</span><input type="number" value={adminSettings.platform?.min_withdrawal || 0} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, min_withdrawal: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
              <li><span>Max Withdrawal (₹)</span><input type="number" value={adminSettings.platform?.max_withdrawal || 0} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, max_withdrawal: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
              <li><span>Referral Bonus (₹)</span><input type="number" value={adminSettings.platform?.referral_bonus || 0} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, referral_bonus: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
              <li><span>Registration Bonus (₹)</span><input type="number" value={adminSettings.platform?.registration_bonus || 0} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, registration_bonus: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
              <li><span>Admin UPI ID</span><input type="text" value={adminSettings.platform?.upi_id || ''} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, upi_id: e.target.value}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '200px', textAlign: 'right' }}/></li>
              <li><span>Telegram Link</span><input type="text" value={adminSettings.platform?.telegram_link || ''} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, telegram_link: e.target.value}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '200px', textAlign: 'right' }}/></li>
              <li><span>Maintenance Mode</span>
                <select value={adminSettings.platform?.maintenance_mode || 'Off'} onChange={e => setAdminSettings({...adminSettings, platform: {...adminSettings.platform, maintenance_mode: e.target.value}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}>
                  <option value="Off">Off</option><option value="On">On</option>
                </select>
              </li>
            </ul>
          </div>
          
          <div className="admin-card">
            <div className="admin-section-title-row">
              <h3>Task & Rewards Settings</h3>
              <button className="admin-btn primary" onClick={() => updateSettingSection('tasks', adminSettings.tasks)}>Save Tasks</button>
            </div>
            <ul className="admin-list admin-settings-list">
              <li><span>Enable Tasks</span>
                <select value={adminSettings.tasks?.enable_tasks ? 'true' : 'false'} onChange={e => setAdminSettings({...adminSettings, tasks: {...adminSettings.tasks, enable_tasks: e.target.value === 'true'}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}>
                  <option value="true">Enabled</option><option value="false">Disabled</option>
                </select>
              </li>
              <li><span>Daily Reward (₹)</span><input type="number" value={adminSettings.tasks?.daily_reward || 0} onChange={e => setAdminSettings({...adminSettings, tasks: {...adminSettings.tasks, daily_reward: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
              <li><span>Weekly Reward (₹)</span><input type="number" value={adminSettings.tasks?.weekly_reward || 0} onChange={e => setAdminSettings({...adminSettings, tasks: {...adminSettings.tasks, weekly_reward: Number(e.target.value)}})} style={{ background: '#0a0a1a', border: '1px solid #2a2a4e', color: '#fff', padding: '6px 12px', borderRadius: 4, width: '100px', textAlign: 'right' }}/></li>
            </ul>
            
            <div className="admin-section-title-row" style={{ marginTop: 24 }}>
              <h3>System Status</h3>
              <span className="admin-pill success">Healthy</span>
            </div>
            <ul className="admin-list">
              <li><span>Backend API</span><strong style={{ color: '#0f0' }}>Online</strong></li>
              <li><span>Database</span><strong style={{ color: '#0f0' }}>Connected</strong></li>
              <li><span>Realtime</span><strong style={{ color: '#0f0' }}>Active</strong></li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <>
          {/* ── Monitoring Dashboard ── */}
          <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '20px' }}>
            {[
              { label: 'Server Status', value: dashboardStats.server_status, color: '#00d26a' },
              { label: 'Database', value: dashboardStats.database_status, color: '#00d26a' },
              { label: 'Total Users', value: dashboardStats.active_users?.toLocaleString(), color: '#00bfff' },
              { label: 'Bets / Min', value: dashboardStats.bets_per_minute, color: '#f59e0b' },
              { label: 'Recharge Today', value: `₹${Number(dashboardStats.recharge_volume_today || 0).toLocaleString()}`, color: '#00d26a' },
              { label: 'Withdrawal Today', value: `₹${Number(dashboardStats.withdrawal_volume_today || 0).toLocaleString()}`, color: '#ef4444' },
              { label: 'Errors Today', value: dashboardStats.errors_today, color: dashboardStats.errors_today > 0 ? '#ef4444' : '#00d26a' },
            ].map((m, i) => (
              <div key={i} className="admin-card" style={{ textAlign: 'center', padding: '18px 12px' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value ?? '—'}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div className="admin-grid two-col" style={{ marginBottom: '20px' }}>
            {/* ── Fraud Detection Report ── */}
            <div className="admin-card">
              <div className="admin-section-title-row">
                <h3>🚨 Fraud Detection</h3>
                <span className="admin-pill danger">Auto-Scan</span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <strong style={{ color: '#f59e0b' }}>Duplicate UTR Numbers ({fraudReport.duplicate_utrs?.length || 0})</strong>
                {fraudReport.duplicate_utrs?.length > 0 ? (
                  <table className="admin-table" style={{ marginTop: '8px' }}>
                    <thead><tr><th>UTR</th><th>Users Affected</th><th>Amounts</th></tr></thead>
                    <tbody>
                      {fraudReport.duplicate_utrs.map((d, i) => (
                        <tr key={i}>
                          <td><code>{d.utr}</code></td>
                          <td>{d.accounts.map(a => a.users?.email || a.user_id).join(', ')}</td>
                          <td>{d.accounts.map(a => `₹${a.amount}`).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#00d26a', margin: '6px 0 0', fontSize: '13px' }}>✓ No duplicate UTRs found</p>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <strong style={{ color: '#f59e0b' }}>Shared UPI IDs Across Accounts ({fraudReport.duplicate_upis?.length || 0})</strong>
                {fraudReport.duplicate_upis?.length > 0 ? (
                  <table className="admin-table" style={{ marginTop: '8px' }}>
                    <thead><tr><th>UPI ID</th><th>Accounts</th></tr></thead>
                    <tbody>
                      {fraudReport.duplicate_upis.map((d, i) => (
                        <tr key={i}>
                          <td><code>{d.upi_id}</code></td>
                          <td>{[...new Set(d.accounts.map(a => a.users?.email || a.user_id))].join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#00d26a', margin: '6px 0 0', fontSize: '13px' }}>✓ No shared UPI IDs found</p>
                )}
              </div>

              <div>
                <strong style={{ color: '#f59e0b' }}>Shared Devices ({fraudReport.duplicate_devices?.length || 0})</strong>
                {fraudReport.duplicate_devices?.length > 0 ? (
                  <table className="admin-table" style={{ marginTop: '8px' }}>
                    <thead><tr><th>Device</th><th>Accounts</th></tr></thead>
                    <tbody>
                      {fraudReport.duplicate_devices.map((d, i) => (
                        <tr key={i}>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }} title={d.device}>{d.device}</td>
                          <td>{d.accounts.map(a => a.email).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#00d26a', margin: '6px 0 0', fontSize: '13px' }}>✓ No shared devices found</p>
                )}
              </div>
            </div>

            {/* ── System Error Logs ── */}
            <div className="admin-card">
              <div className="admin-section-title-row">
                <h3>🔴 System Error Logs</h3>
                <span className="admin-pill" style={{ background: dashboardStats.errors_today > 0 ? '#ef4444' : '#00d26a', color: '#fff' }}>
                  {dashboardStats.errors_today || 0} Today
                </span>
              </div>
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {systemLogs.length === 0 ? (
                  <p style={{ color: '#00d26a', textAlign: 'center', padding: '30px', fontSize: '14px' }}>✓ No system errors logged</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Error</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td style={{ fontSize: '11px' }}>{new Date(log.created_at).toLocaleString()}</td>
                          <td><span className="admin-pill danger">{log.type}</span></td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }} title={log.error_message}>{log.error_message}</td>
                          <td><span className="admin-pill" style={{ background: log.resolved ? '#00d26a' : '#f59e0b', color: '#fff' }}>{log.resolved ? 'Resolved' : 'Open'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'backups' && (
        <div className="admin-card">
          <div className="admin-section-title-row">
            <h3>Database Backups</h3>
            <span className="admin-pill success">Automated</span>
          </div>
          <p>Backups are managed via the backend /api/admin/backups endpoint and run automatically every day at 4:00 AM.</p>
          <div style={{ marginTop: '20px', padding: '20px', border: '1px dashed #2a2a4e', borderRadius: '8px', textAlign: 'center', color: '#aaa' }}>
            List of backup files will populate here.
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="admin-grid two-col">
          <div className="admin-card">
            <div className="admin-section-title-row">
              <h3>Active Admin Sessions</h3>
              <span className="admin-pill success">Live</span>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>IP Address</th>
                    <th>Browser</th>
                    <th>Login Time</th>
                  </tr>
                </thead>
                <tbody>
                  {adminSessions.map((s, idx) => (
                    <tr key={idx}>
                      <td>{s.admin_email}</td>
                      <td><code>{s.ip}</code></td>
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.browser}>{s.browser}</td>
                      <td>{new Date(s.login_time).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-section-title-row">
              <h3>Admin Audit Ledger</h3>
              <span className="admin-pill danger">Immutable</span>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((l, idx) => (
                    <tr key={idx}>
                      <td>{new Date(l.created_at).toLocaleString()}</td>
                      <td>{l.admin_email}</td>
                      <td><strong>{l.action}</strong></td>
                      <td>{l.target_user || '-'}</td>
                      <td>
                        <small>
                          {l.old_value && `Old: ${l.old_value}`}
                          {l.new_value && ` | New: ${l.new_value}`}
                          {l.ip && ` | IP: ${l.ip}`}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
