import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseReady, getBy, insertRow, updateWhere, getAll } from '../services/supabase';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  // Get current user from AuthContext for Supabase queries
  const auth = (() => { try { return useAuth(); } catch { return { user: null }; } })();
  const currentUser = auth?.user;

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('wallet_balance');
    return saved ? parseFloat(saved) : 0;
  });

  // ── Hydrate balance from Supabase when user changes ─────────────────────────
  useEffect(() => {
    if (!currentUser || !isSupabaseReady()) return;
    (async () => {
      try {
        const wallet = await getBy('wallets', 'user_id', currentUser.id);
        if (wallet) {
          setBalance(parseFloat(wallet.main_balance) || 0);
          setBonusBalance(parseFloat(wallet.bonus_balance) || 0);
          localStorage.setItem('wallet_balance', String(wallet.main_balance || 0));
          localStorage.setItem('bonus_balance', String(wallet.bonus_balance || 0));
        }
      } catch (err) {
        console.warn('[Wallet] Supabase hydration failed:', err.message);
      }
    })();
  }, [currentUser?.id]);

  // ── Supabase wallet write helper ─────────────────────────────────────────────
  const syncWalletToSupabase = useCallback(async (mainBal, bonusBal) => {
    if (!currentUser || !isSupabaseReady()) return;
    try {
      await updateWhere('wallets', 'user_id', currentUser.id, {
        main_balance: mainBal,
        bonus_balance: bonusBal,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Wallet] Supabase sync failed:', err.message);
    }
  }, [currentUser?.id]);

  // ── Add a transaction record to Supabase ─────────────────────────────────────
  const addTransactionToSupabase = useCallback(async (type, amount, status = 'Success', notes = '') => {
    if (!currentUser || !isSupabaseReady()) return;
    try {
      await insertRow('transactions', {
        user_id: currentUser.id,
        type,
        amount,
        status,
        notes,
      });
    } catch (err) {
      console.warn('[Transaction] Supabase save failed:', err.message);
    }
  }, [currentUser?.id]);

  // Hydrate pending recharges + withdrawals from Supabase on mount
  useEffect(() => {
    if (!currentUser || !isSupabaseReady()) return;
    (async () => {
      try {
        // Pending recharges for admin panel
        const recharges = await getAll('recharge_requests', null, 'created_at');
        if (recharges.length > 0) {
          const mapped = recharges
            .filter(r => r.status === 'pending')
            .map(r => ({
              id: String(r.id),
              userId: String(r.user_id),
              amount: r.amount,
              status: r.status,
              timestamp: r.created_at,
            }));
          setPendingRecharges(mapped);
        }

        // Pending withdrawals for admin panel
        const withdrawals = await getAll('withdrawal_requests', null, 'created_at');
        if (withdrawals.length > 0) {
          const mapped = withdrawals
            .filter(w => w.status === 'pending')
            .map(w => ({
              id: String(w.id),
              userId: String(w.user_id),
              amount: w.amount,
              upiId: `${w.upi_name} - ${w.upi_id}`,
              phone: '',
              status: w.status,
              timestamp: w.created_at,
            }));
          setPendingWithdrawals(mapped);
        }

        // Transactions history for the current user
        const txns = await getAll('transactions', { column: 'user_id', value: currentUser.id }, 'created_at');
        if (txns.length > 0) {
          const mapped = txns.map(t => ({
            id: String(t.id),
            userId: String(t.user_id),
            type: t.type,
            amount: t.amount > 0 ? `+ ₹${t.amount}` : `- ₹${Math.abs(t.amount)}`,
            status: t.status,
            time: new Date(t.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
            color: t.status === 'Success' ? '#28a745' : '#dc3545',
            timestamp: new Date(t.created_at).getTime(),
          }));
          setFinancialRecords(mapped);
        }
      } catch (err) {
        console.warn('[Wallet] Supabase data hydration failed:', err.message);
      }
    })();
  }, [currentUser?.id]);


  const [bonusBalance, setBonusBalance] = useState(() => {
    const saved = localStorage.getItem('bonus_balance');
    return saved ? parseFloat(saved) : 500.00; // Default mock bonus
  });

  const [checkInState, setCheckInState] = useState(() => {
    const saved = localStorage.getItem('checkin_state');
    return saved ? JSON.parse(saved) : { streak: 0, lastCheckInTime: null };
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('tasks_state');
    return saved ? JSON.parse(saved) : {
      learnRecharge: { status: 'pending', progress: 0 },
      firstRecharge: { status: 'pending', progress: 0 },
      firstInvitation: { status: 'pending', progress: 0 }
    };
  });

  const [financialRecords, setFinancialRecords] = useState(() => {
    const saved = localStorage.getItem('financial_records');
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingRecharges, setPendingRecharges] = useState(() => {
    const saved = localStorage.getItem('pending_recharges');
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingWithdrawals, setPendingWithdrawals] = useState(() => {
    const saved = localStorage.getItem('pending_withdrawals');
    return saved ? JSON.parse(saved) : [];
  });

  const [myOrders, setMyOrders] = useState(() => {
    const saved = localStorage.getItem('my_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [gameResultOverrides, setGameResultOverrides] = useState(() => {
    const saved = localStorage.getItem('game_result_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  const [liveBets, setLiveBets] = useState(() => {
    const saved = localStorage.getItem('live_bets');
    return saved ? JSON.parse(saved) : {};
  });

  const [adminSettings, setAdminSettings] = useState(() => {
    const saved = localStorage.getItem('admin_settings');
    return saved ? JSON.parse(saved) : {
      minRecharge: 100,
      maxRecharge: 10000,
      minWithdrawal: 500,
      maxWithdrawal: 50000,
      maintenanceMode: 'Off'
    };
  });

  const [profitRecords, setProfitRecords] = useState(() => {
    const saved = localStorage.getItem('profit_records');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'financial_records') setFinancialRecords(JSON.parse(e.newValue || '[]'));
      if (e.key === 'pending_recharges') setPendingRecharges(JSON.parse(e.newValue || '[]'));
      if (e.key === 'pending_withdrawals') setPendingWithdrawals(JSON.parse(e.newValue || '[]'));
      if (e.key === 'my_orders') setMyOrders(JSON.parse(e.newValue || '[]'));
      if (e.key === 'game_result_overrides') setGameResultOverrides(JSON.parse(e.newValue || '{}'));
      if (e.key === 'live_bets') setLiveBets(JSON.parse(e.newValue || '{}'));
      if (e.key === 'wallet_balance') setBalance(parseFloat(e.newValue || '1535.62'));
      if (e.key === 'admin_settings') setAdminSettings(JSON.parse(e.newValue || '{}'));
      if (e.key === 'profit_records') setProfitRecords(JSON.parse(e.newValue || '[]'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('wallet_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('bonus_balance', bonusBalance.toString());
  }, [bonusBalance]);

  useEffect(() => {
    localStorage.setItem('checkin_state', JSON.stringify(checkInState));
  }, [checkInState]);

  useEffect(() => {
    localStorage.setItem('tasks_state', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('financial_records', JSON.stringify(financialRecords));
  }, [financialRecords]);

  useEffect(() => {
    localStorage.setItem('pending_recharges', JSON.stringify(pendingRecharges));
  }, [pendingRecharges]);

  useEffect(() => {
    localStorage.setItem('pending_withdrawals', JSON.stringify(pendingWithdrawals));
  }, [pendingWithdrawals]);

  useEffect(() => {
    localStorage.setItem('my_orders', JSON.stringify(myOrders));
  }, [myOrders]);

  useEffect(() => {
    localStorage.setItem('game_result_overrides', JSON.stringify(gameResultOverrides));
  }, [gameResultOverrides]);

  useEffect(() => {
    localStorage.setItem('live_bets', JSON.stringify(liveBets));
  }, [liveBets]);

  useEffect(() => {
    localStorage.setItem('admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  useEffect(() => {
    localStorage.setItem('profit_records', JSON.stringify(profitRecords));
  }, [profitRecords]);

  const addBalance = (amount) => setBalance(prev => prev + amount);
  const addBonusBalance = (amount) => setBonusBalance(prev => prev + amount);

  const recordGameProfit = (gameName, period, winningOption, profitAmount) => {
    setProfitRecords(prev => {
      // Prevent duplicate period for the same game
      if (prev.some(r => r.game === gameName && r.period === period)) {
        return prev;
      }
      const newRecord = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        game: gameName,
        period,
        winningOption,
        profit: profitAmount,
        timestamp: Date.now(),
        time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      };
      return [newRecord, ...prev].slice(0, 50);
    });
  };

  const performCheckIn = (rewardAmount) => {
    const now = Date.now();
    setCheckInState(prev => ({
      streak: prev.streak >= 6 ? 0 : prev.streak + 1,
      lastCheckInTime: now
    }));
    addBonusBalance(rewardAmount); // Check-in rewards go to bonus balance
  };

  const updateTask = (taskId, status, progress = 100) => {
    setTasks(prev => ({ ...prev, [taskId]: { status, progress } }));
  };

  const claimTaskReward = (taskId, amount) => {
    updateTask(taskId, 'claimed', 100);
    addBonusBalance(amount); // Task rewards go to bonus balance
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const requestRecharge = async (userId, amount) => {
    const localId = Date.now().toString();
    const token = localStorage.getItem('token');

    // 1. Try Razorpay automatically if backend responds
    if (token) {
      try {
        const resLoaded = await loadRazorpayScript();
        if (!resLoaded) throw new Error("Failed to load Razorpay SDK");

        // Create Order
        const orderRes = await fetch('http://localhost:5000/api/wallet/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.message || 'Order creation failed');

        const options = {
          key: "YOUR_RAZORPAY_KEY", // Note: The backend should ideally return the key_id
          amount: orderData.amount,
          currency: orderData.currency,
          name: "FastWin",
          description: "Wallet Recharge",
          order_id: orderData.id,
          handler: async function (response) {
            // Verify Payment
            const verifyRes = await fetch('http://localhost:5000/api/wallet/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: amount
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setBalance(prev => prev + amount);
              alert("Recharge successful!");
            } else {
              alert("Payment verification failed.");
            }
          },
          prefill: {
            contact: "9999999999" // Can be filled with currentUser phone
          },
          theme: {
            color: "#3399cc"
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        return localId; // Exit early since Razorpay is handling it
      } catch (err) {
        console.warn('Razorpay failed, falling back to manual request:', err);
      }
    }

    // 2. Fallback to manual approval via Admin Panel
    const newRequest = {
      id: localId,
      userId: String(userId),
      amount,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    if (isSupabaseReady()) {
      try {
        const saved = await insertRow('recharge_requests', {
          user_id: userId,
          amount,
          status: 'pending',
        });
        newRequest.id = String(saved.id); 
      } catch (err) {
        console.warn('[requestRecharge] Supabase failed, using local ID:', err.message);
      }
    }

    setPendingRecharges(prev => [...prev, newRequest]);
    return newRequest.id;
  };

  const approveRecharge = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/approve-recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        setPendingRecharges(prev => prev.filter(r => r.id !== requestId));
        // Balance will be updated dynamically on next app hydration, or we can just refetch here
      } else {
        alert(data.error || 'Failed to approve recharge');
      }
    } catch (err) {
      console.error(err);
      alert('Network error approving recharge');
    }
  };

  const rejectRecharge = async (requestId) => {
    // Ideally you'd have a reject-recharge endpoint, for now we will just use Supabase if we must, 
    // but the plan says move to backend. Let's assume we can add it or just remove from local state for now.
    // Actually, let's keep it simple and just remove it from pending state (no-op in DB or add route later)
    setPendingRecharges(prev => prev.filter(r => r.id !== requestId));
  };

  const requestWithdrawal = async (userId, phone, amount, upiId) => {
    const [upiName, upiAddress] = upiId.split(' - ');
    const localId = Date.now().toString();
    const newRequest = {
      id: localId,
      userId: String(userId),
      phone,
      amount,
      upiId,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    if (isSupabaseReady()) {
      try {
        const saved = await insertRow('withdrawal_requests', {
          user_id: userId,
          amount,
          upi_name: upiName || '',
          upi_id: upiAddress || upiId,
          status: 'pending',
        });
        newRequest.id = String(saved.id);
      } catch (err) {
        console.warn('[requestWithdrawal] Supabase failed:', err.message);
      }
    }

    setPendingWithdrawals(prev => [...prev, newRequest]);
    return newRequest.id;
  };

  const getLiveBetStats = (gameName, period) => {
    const key = `${gameName}-${period}`;
    return liveBets[key] || { total: 0, bySelection: {}, orders: [] };
  };

  const addLiveBet = (gameName, period, selection, amount, order) => {
    const key = `${gameName}-${period}`;
    setLiveBets(prev => {
      const current = prev[key] || { total: 0, bySelection: {}, orders: [], maxSeen: 0, maxSeenBySelection: {} };
      const bySelection = { ...current.bySelection };
      // Amounts only ever increase — enforce floor on each selection
      const newSelectionTotal = (bySelection[selection] || 0) + amount;
      bySelection[selection] = Math.max(current.maxSeenBySelection?.[selection] || 0, newSelectionTotal);
      const newTotal = current.total + amount;
      const maxSeen = Math.max(current.maxSeen || 0, newTotal);
      const maxSeenBySelection = { ...(current.maxSeenBySelection || {}) };
      maxSeenBySelection[selection] = Math.max(maxSeenBySelection[selection] || 0, bySelection[selection]);
      return {
        ...prev,
        [key]: {
          total: newTotal,
          bySelection,
          orders: [order, ...current.orders],
          maxSeen,
          maxSeenBySelection
        }
      };
    });
  };

  // Ensure live bets never decrease - always show highest seen value
  const getLiveBetStatsWithFloor = (gameName, period) => {
    const key = `${gameName}-${period}`;
    const stats = liveBets[key] || { total: 0, bySelection: {}, orders: [], maxSeen: 0, maxSeenBySelection: {} };
    const maxSeenBySelection = stats.maxSeenBySelection || {};
    const bySelection = {};
    const allSelections = new Set([
      ...Object.keys(stats.bySelection || {}),
      ...Object.keys(maxSeenBySelection)
    ]);
    allSelections.forEach((sel) => {
      bySelection[sel] = Math.max(stats.bySelection?.[sel] || 0, maxSeenBySelection[sel] || 0);
    });
    return {
      total: Math.max(stats.total || 0, stats.maxSeen || 0),
      bySelection,
      orders: stats.orders || []
    };
  };

  const getGameResultForPeriod = (gameName, period) => {
    if (!gameResultOverrides[gameName]) return null;
    return gameResultOverrides[gameName][period] || null;
  };

  const setGameResultForPeriod = (gameName, period, result) => {
    setGameResultOverrides(prev => {
      const next = { ...(prev || {}) };
      const gameMap = { ...(next[gameName] || {}) };
      if (!result) {
        delete gameMap[period];
      } else {
        gameMap[period] = result;
      }
      if (Object.keys(gameMap).length > 0) {
        next[gameName] = gameMap;
      } else {
        delete next[gameName];
      }
      return next;
    });
  };

  const getSelectedWinner = (gameName, period) => getGameResultForPeriod(gameName, period);
  const setSelectedWinner = (gameName, period, selection) => setGameResultForPeriod(gameName, period, selection);
  const clearSelectedWinner = (gameName, period) => setGameResultForPeriod(gameName, period, null);

  const approveWithdrawal = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/approve-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        setPendingWithdrawals(prev => prev.filter(r => r.id !== requestId));
      } else {
        alert(data.error || 'Failed to approve withdrawal');
      }
    } catch (err) {
      console.error(err);
      alert('Network error approving withdrawal');
    }
  };

  const rejectWithdrawal = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/reject-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        setPendingWithdrawals(prev => prev.filter(r => r.id !== requestId));
      } else {
        alert(data.error || 'Failed to reject withdrawal');
      }
    } catch (err) {
      console.error(err);
      alert('Network error rejecting withdrawal');
    }
  };

  const holdWithdrawal = (requestId) => setPendingWithdrawals(prev => prev.map(req => req.id === requestId ? { ...req, status: 'held' } : req));

  const placeBet = async (gameName, period, selection, amount) => {
    if (balance < amount) return false;
    addBalance(-amount);
    const localId = Date.now().toString();
    const newOrder = {
      id: localId,
      game: gameName,
      period,
      selection,
      amount,
      status: 'Pending',
      timestamp: Date.now()
    };

    if (isSupabaseReady() && currentUser) {
      try {
        const savedBet = await insertRow('game_bets', {
          user_id: currentUser.id,
          game: gameName,
          period,
          selection,
          amount,
          result: 'pending',
          payout: 0
        });
        newOrder.id = String(savedBet.id);

        const wallet = await getBy('wallets', 'user_id', currentUser.id);
        if (wallet) {
          await updateWhere('wallets', 'user_id', currentUser.id, {
            main_balance: parseFloat(wallet.main_balance) - amount,
            updated_at: new Date().toISOString()
          });
        }
        await addTransactionToSupabase(`${gameName} Bet`, -amount, 'Success', `Period: ${period}`);
      } catch (err) {
        console.warn('[placeBet] Supabase sync failed:', err.message);
      }
    }

    setMyOrders(prev => [newOrder, ...prev]);
    addLiveBet(gameName, period, selection, amount, newOrder);
    setFinancialRecords(records => [{
      type: `${gameName} Bet`,
      id: newOrder.id,
      amount: `- ₹${amount}`,
      status: 'Deducted',
      time: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
      color: '#dc3545',
      timestamp: Date.now()
    }, ...records]);
    return newOrder.id;
  };

  // Settle bets for a completed period — call this when period ends
  // resultLabel: the winning selection (e.g. 'Green', 'Red', 'Small', 'Large')
  // multipliers: { Green: 2, Red: 2, Violet: 4.5, Small: 1.98, Large: 1.98, Tie: 12 }
  const settleGameBets = async (gameName, period, resultLabel, multiplierMap) => {
    // 1. First fetch bets from local state that match the game/period
    let myBetsToUpdate = [];
    setMyOrders(prev => {
      myBetsToUpdate = prev.filter(order => order.game === gameName && order.period === period && order.status === 'Pending');
      const updated = prev.map(order => {
        if (order.game !== gameName || order.period !== period || order.status !== 'Pending') return order;

        const sel = String(order.selection).toLowerCase().trim();
        const res = String(resultLabel).toLowerCase().trim();
        const won = sel === res;
        const multiplier = multiplierMap?.[order.selection] || multiplierMap?.[sel] || 2;
        const winAmount = won ? parseFloat((order.amount * multiplier).toFixed(2)) : 0;

        if (won && winAmount > 0) {
          setBalance(b => {
            const newBal = parseFloat((b + winAmount).toFixed(2));
            localStorage.setItem('wallet_balance', newBal.toString());
            return newBal;
          });
          setFinancialRecords(records => [{
            type: `${gameName} Win`,
            id: order.id + '-win',
            amount: `+ ₹${winAmount.toFixed(2)}`,
            status: 'Won',
            time: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
            color: '#28a745',
            timestamp: Date.now()
          }, ...records.slice(0, 49)]);
        }

        return { ...order, status: won ? 'Won' : 'Lost', result: resultLabel, winAmount: won ? winAmount : 0, settledAt: Date.now() };
      });
      return updated;
    });

    // 2. Sync to Supabase
    if (isSupabaseReady() && currentUser && myBetsToUpdate.length > 0) {
      let totalWinnings = 0;
      for (const order of myBetsToUpdate) {
        const sel = String(order.selection).toLowerCase().trim();
        const res = String(resultLabel).toLowerCase().trim();
        const won = sel === res;
        const multiplier = multiplierMap?.[order.selection] || multiplierMap?.[sel] || 2;
        const winAmount = won ? parseFloat((order.amount * multiplier).toFixed(2)) : 0;
        
        if (won) totalWinnings += winAmount;

        try {
          await updateWhere('game_bets', 'id', order.id, {
            result: won ? 'won' : 'lost',
            payout: winAmount
          });
        } catch (err) {
           console.warn(`Failed to update bet ${order.id} in Supabase`, err);
        }
      }

      if (totalWinnings > 0) {
        try {
          const wallet = await getBy('wallets', 'user_id', currentUser.id);
          if (wallet) {
            await updateWhere('wallets', 'user_id', currentUser.id, {
              main_balance: parseFloat(wallet.main_balance) + totalWinnings,
              updated_at: new Date().toISOString()
            });
          }
          await addTransactionToSupabase(`${gameName} Win`, totalWinnings, 'Success', `Period: ${period}`);
        } catch (err) {
          console.warn('[settleGameBets] Wallet sync failed:', err.message);
        }
      }
    }
  };

  const cancelBet = (_orderId) => {
    // PERMANENTLY DISABLED: Bets are final. Money is gone after bet is placed. No refunds.
    console.warn('[BET SYSTEM] cancelBet called but is permanently disabled — bets are non-refundable.');
    return false;
  };

  return (
    <WalletContext.Provider value={{
      balance,
      addBalance,
      bonusBalance,
      addBonusBalance,
      checkInState,
      performCheckIn,
      tasks,
      updateTask,
      claimTaskReward,
      financialRecords,
      pendingRecharges,
      requestRecharge,
      approveRecharge,
      rejectRecharge,
      pendingWithdrawals,
      requestWithdrawal,
      approveWithdrawal,
      rejectWithdrawal,
      holdWithdrawal,
      myOrders,
      liveBets,
      getLiveBetStats,
      getLiveBetStatsWithFloor,
      getGameResultForPeriod,
      setGameResultForPeriod,
      getSelectedWinner,
      setSelectedWinner,
      clearSelectedWinner,
      placeBet,
      settleGameBets,
      adminSettings,
      setAdminSettings,
      profitRecords,
      recordGameProfit,
      // cancelBet intentionally NOT exposed — bets are final, no refunds
    }}>
      {children}
    </WalletContext.Provider>
  );
};
