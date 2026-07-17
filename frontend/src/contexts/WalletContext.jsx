import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseReady, getBy, insertRow, updateWhere, getAll } from '../services/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

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
  const hydrateWallet = useCallback(async () => {
    if (!currentUser || !isSupabaseReady()) return;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await fetch(`${API_URL}/api/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.wallet) {
          const wallet = data.wallet;
          setBalance(parseFloat(wallet.main_balance) || 0);
          setBonusBalance(parseFloat(wallet.bonus_balance) || 0);
          localStorage.setItem('wallet_balance', String(wallet.main_balance || 0));
          localStorage.setItem('bonus_balance', String(wallet.bonus_balance || 0));
        }
      }
    } catch (err) {
      console.warn('[Wallet] Backend hydration failed:', err.message);
    }
  }, [currentUser]);

  const hydrateOrders = useCallback(async () => {
    if (!currentUser || !isSupabaseReady()) return;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await fetch(`${API_URL}/api/game/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.bets) {
          const mappedOrders = data.bets.map(b => ({
            id: b.id,
            game: b.game_type,
            period: b.period,
            amount: b.amount,
            selection: b.selection,
            status: b.status === 'won' ? 'Won' : b.status === 'lost' ? 'Lost' : 'Pending',
            result: b.result,
            profit: b.profit,
            winAmount: b.payout,
            walletBefore: b.wallet_before,
            walletAfter: b.wallet_after,
            odds: b.odds,
            timestamp: b.created_at
          }));
          setMyOrders(mappedOrders);
        }
      }
    } catch (err) {
      console.warn('[Wallet] Failed to fetch orders:', err.message);
    }
  }, [currentUser]);

  useEffect(() => {
    hydrateWallet();
    hydrateOrders();
  }, [hydrateWallet, hydrateOrders]);

  useEffect(() => {
    const handlePeriodChange = () => {
      // Small delay to ensure backend has completed DB updates
      setTimeout(() => {
        hydrateWallet();
        hydrateOrders();
      }, 500);
    };
    window.addEventListener('global_period_changed', handlePeriodChange);
    return () => window.removeEventListener('global_period_changed', handlePeriodChange);
  }, [hydrateWallet, hydrateOrders]);

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
        // The actual settlement is handled by the backend. We just re-hydrate the orders.
        await hydrateOrders();
        if (recharges.length > 0) {
          const mapped = recharges
            .filter(r => r.status === 'pending')
            .map(r => ({
              id: String(r.id),
              userId: String(r.user_id),
              amount: r.amount,
              utrNumber: r.utr_number,
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

        // Transactions history for the current user via secure backend route
        const token = localStorage.getItem('token');
        if (token) {
          const res = await fetch(`${API_URL}/api/wallet/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const txData = await res.json();
          
          if (txData.success && txData.transactions.length > 0) {
            const mapped = txData.transactions.map(t => ({
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
        }
      } catch (err) {
        console.warn('[Wallet] Supabase data hydration failed:', err.message);
      }
    })();

    // Supabase Realtime for wallet and transactions
    let realtimeSubscription = null;
    if (isSupabaseReady()) {
      realtimeSubscription = supabase.channel(`wallet-context:user:${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${currentUser.id}` }, payload => {
          hydrateWallet();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${currentUser.id}` }, payload => {
          // Re-fetch transactions
          fetch(`${API_URL}/api/wallet/transactions`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }).then(res => res.json()).then(txData => {
            if (txData.success && txData.transactions) {
              const mapped = txData.transactions.map(t => ({
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
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recharge_requests', filter: `user_id=eq.${currentUser.id}` }, payload => {
          // Refresh pending recharges
          getAll('recharge_requests', { column: 'user_id', value: currentUser.id }, 'created_at').then(recharges => {
            const mapped = recharges
              .filter(r => r.status === 'pending')
              .map(r => ({
                id: String(r.id),
                userId: String(r.user_id),
                amount: r.amount,
                utrNumber: r.utr_number,
                status: r.status,
                timestamp: r.created_at,
              }));
            setPendingRecharges(mapped);
          });
        })
        .subscribe();
    }

    return () => {
      if (realtimeSubscription) supabase.removeChannel(realtimeSubscription);
    };
  }, [currentUser?.id, hydrateWallet]);


  const [bonusBalance, setBonusBalance] = useState(() => {
    const saved = localStorage.getItem('bonus_balance');
    return saved ? parseFloat(saved) : 0;
  });

  const [checkInState, setCheckInState] = useState(() => {
    const saved = localStorage.getItem('checkin_state');
    return saved ? JSON.parse(saved) : { streak: 0, lastCheckInTime: null };
  });

  const [tasks, setTasks] = useState({
    registerEmail: { status: 'pending', progress: 0 },
    firstRecharge: { status: 'pending', progress: 0 },
    fiftyBets: { status: 'pending', progress: 0 },
    inviteFriend: { status: 'pending', progress: 0 },
    dailyLogin: { status: 'pending', progress: 0 }
  });

  useEffect(() => {
    if (currentUser) {
      const completed = currentUser.completed_tasks || [];
      const today = new Date().toISOString().split('T')[0];
      const dailyClaimed = currentUser.last_daily_claim === today;

      setTasks(prev => {
        const next = { ...prev };
        completed.forEach(taskId => {
          if (next[taskId]) next[taskId] = { status: 'claimed', progress: 100 };
        });
        if (dailyClaimed && next.dailyLogin) {
          next.dailyLogin = { status: 'claimed', progress: 100 };
        }
        return next;
      });
    }
  }, [currentUser]);

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

  const [myOrders, setMyOrders] = useState([]);

  // Game result overrides are now globally managed by backend
  const [liveBets, setLiveBets] = useState(() => {
    const saved = localStorage.getItem('live_bets');
    return saved ? JSON.parse(saved) : {};
  });

  const [adminSettings, setAdminSettings] = useState(() => {
    const saved = localStorage.getItem('platform_settings');
    return saved ? JSON.parse(saved) : {
      minRecharge: 100,
      maxRecharge: 10000,
      minWithdrawal: 500,
      maxWithdrawal: 50000,
      maintenanceMode: 'Off',
      adminUpiId: ''
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
      if (e.key === 'live_bets') setLiveBets(JSON.parse(e.newValue || '{}'));
      if (e.key === 'wallet_balance') setBalance(parseFloat(e.newValue || '0'));
      if (e.key === 'platform_settings') setAdminSettings(JSON.parse(e.newValue || '{}'));
      if (e.key === 'profit_records') setProfitRecords(JSON.parse(e.newValue || '[]'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/settings`);
        const data = await res.json();
        if (data.success && data.settings && data.settings.platform) {
          const p = data.settings.platform;
          setAdminSettings(prev => ({
            ...prev,
            ...p,
            telegramLink: p.telegram_link,
            adminUpiId: p.upi_id,
            adminUpiName: p.upi_name,
            maintenanceMode: p.maintenance_mode,
            firstRechargeBonusPercent: p.first_recharge_bonus_percent,
            minRecharge: p.min_recharge,
            maxRecharge: p.max_recharge,
            minWithdrawal: p.min_withdrawal,
            maxWithdrawal: p.max_withdrawal
          }));
        }
      } catch (err) {
        console.warn('[Wallet] Failed to fetch admin settings:', err.message);
      }
    })();
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
    localStorage.setItem('live_bets', JSON.stringify(liveBets));
  }, [liveBets]);

  useEffect(() => {
    localStorage.setItem('platform_settings', JSON.stringify(adminSettings));
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

  const performCheckIn = async (rewardAmount) => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please login first.');
    try {
      const res = await fetch(`${API_URL}/api/wallet/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: rewardAmount })
      });
      const data = await res.json();
      if (data.success) {
        const now = Date.now();
        setCheckInState(prev => ({
          streak: prev.streak >= 6 ? 0 : prev.streak + 1,
          lastCheckInTime: now
        }));
        setBalance(data.main_balance || (balance + rewardAmount));
        hydrateWallet();
        return true;
      } else {
        alert(data.message || 'Check-in failed');
        return false;
      }
    } catch (err) {
      console.error('Check-in error', err);
      alert('Network error. Please try again.');
      return false;
    }
  };

  const updateTask = (taskId, status, progress = 100) => {
    setTasks(prev => ({ ...prev, [taskId]: { status, progress } }));
  };

  const claimTaskReward = async (taskId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Please login first.");
      return false;
    }

    try {
      const res = await fetch(`${API_URL}/api/wallet/claim-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ taskId })
      });
      const data = await res.json();
      
      if (data.success) {
        updateTask(taskId, 'claimed', 100);
        setBalance(data.newBalance);
        
        // Refresh financial records to show the new transaction
        hydrateWallet();
        return true;
      } else {
        alert(data.message || 'Failed to claim task.');
        return false;
      }
    } catch (err) {
      console.error('[Task] Failed to claim reward:', err);
      alert('Network error. Please try again later.');
      return false;
    }
  };


  const requestRecharge = async (userId, amount, utrNumber, senderName, senderUpi) => {
    if (!utrNumber) {
      alert("UTR / Reference number is required.");
      return null;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/wallet/request-recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, utrNumber, senderName, senderUpi })
      });
      const data = await res.json();
      if (data.success && data.request) {
        const newRequest = {
          id: String(data.request.id),
          userId: String(userId),
          amount,
          utrNumber,
          senderName,
          senderUpi,
          status: 'pending',
          timestamp: data.request.created_at || new Date().toISOString()
        };
        // Local optimisic UI update (backend will also trigger realtime update)
        setPendingRecharges(prev => [...prev, newRequest]);
        return newRequest.id;
      } else {
        alert(data.message || data.error || 'Failed to submit recharge request');
        return null;
      }
    } catch (err) {
      console.error('[requestRecharge] Network error:', err.message);
      alert('Network error. Please try again.');
      return null;
    }
  };
  const requestWithdrawal = async (userId, email, amount, paymentDetails) => {
    try {
      const token = localStorage.getItem('token');
      const parts = paymentDetails.split(' - ');
      const upiName = parts[0] || '';
      const upiId = parts.length > 1 ? parts[1] : paymentDetails;

      const res = await fetch(`${API_URL}/api/wallet/request-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, upiId, upiName })
      });
      const data = await res.json();
      
      if (data.success && data.request) {
        const newRequest = {
          id: String(data.request.id),
          userId: String(userId),
          amount,
          paymentDetails,
          status: 'pending',
          timestamp: data.request.created_at || new Date().toISOString()
        };
        // Local optimisic UI update (backend will also trigger realtime update)
        setPendingWithdrawals(prev => [...prev, newRequest]);
        setBalance(data.main_balance !== undefined ? parseFloat(data.main_balance) : balance - amount);
        return newRequest.id;
      } else {
        alert(data.message || data.error || 'Failed to submit withdrawal request');
        return null;
      }
    } catch (err) {
      console.error('[requestWithdrawal] Network error:', err.message);
      alert('Network error. Please try again.');
      return null;
    }
  };



  const placeBet = async (gameName, period, selection, amount) => {
    if (balance < amount) return false;
    
    let orderId = Date.now().toString();

    if (currentUser) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/game/place-bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ game_type: gameName, period, amount, selection })
        });
        const data = await res.json();
        
        if (data.success) {
          orderId = String(data.bet.id);
          setBalance(parseFloat(data.main_balance) || 0); // Use exact backend balance
        } else {
          console.error('[placeBet] API failed:', data.error);
          alert(`Bet failed: ${data.error}`);
          return false; 
        }
      } catch (err) {
        console.error('[placeBet] Network error:', err.message);
        alert('Network error placing bet');
        return false;
      }
    } else {
      addBalance(-amount); // Fallback for unauthenticated dev testing
    }

    setMyOrders(prev => {
        const newOrders = [{
          id: orderId,
          game: gameName,
          period,
          amount,
          selection,
          status: 'Pending',
          timestamp: Date.now()
        }, ...prev];
        return newOrders;
      });

    addLiveBet(gameName, period, selection, amount, {
      id: orderId,
      game: gameName,
      period,
      selection,
      amount,
      status: 'Pending',
      timestamp: Date.now()
    });
    setFinancialRecords(records => [{
      type: `${gameName} Bet`,
      id: orderId,
      amount: `- ₹${amount}`,
      status: 'Deducted',
      time: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
      color: '#dc3545',
      timestamp: Date.now()
    }, ...records]);
    return orderId;
  };

  // Settle bets for a completed period — call this when period ends
  const settleGameBets = async (gameName, period, resultLabel, multiplierMap) => {
    const { calculatePayout } = await import('../utils/payout');
    // 1. Get pending bets for this period
    const betsToSettle = myOrders.filter(order => order.game === gameName && order.period === period && order.status === 'Pending');
    if (betsToSettle.length === 0) return;

    // 2. Prepare payload for batch resolution
    const betsPayload = betsToSettle.map(order => {
      const sel = String(order.selection).toLowerCase().trim();
      const res = String(resultLabel).toLowerCase().trim();
      const won = sel === res;
      const customMultiplier = multiplierMap?.[order.selection] || multiplierMap?.[sel] || null;
      
      let winAmount = 0;
      if (won) {
        const payoutData = calculatePayout(order.selection, order.amount, 2, customMultiplier);
        winAmount = payoutData.winningAmount;
      }

      return {
        betId: order.id,
        result: resultLabel,
        payout: winAmount,
        won
      };
    });

    // 3. Process settlements via backend batch API
    if (currentUser) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/game/resolve-bets-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bets: betsPayload })
        });
      } catch (err) {
        console.error('[settleGameBets] API failed for batch:', err);
      }
    }

    const resolvedBets = betsToSettle.map(order => {
      const payloadMatch = betsPayload.find(p => p.betId === order.id);
      return {
        ...order,
        status: payloadMatch.won ? 'Won' : 'Lost',
        result: resultLabel,
        winAmount: payloadMatch.won ? payloadMatch.payout : 0,
        settledAt: Date.now()
      };
    });

    // 3. Update local orders state
    setMyOrders(prev => prev.map(order => {
      const resolved = resolvedBets.find(rb => rb.id === order.id);
      return resolved ? resolved : order;
    }));

    // 4. Update financial records locally
    let totalWinnings = 0;
    resolvedBets.forEach(order => {
      if (order.status === 'Won') {
        totalWinnings += order.winAmount;
        setFinancialRecords(records => [{
          type: `${gameName} Win`,
          id: order.id + '-win',
          amount: `+ ₹${order.winAmount.toFixed(2)}`,
          status: 'Won',
          time: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
          color: '#28a745',
          timestamp: Date.now()
        }, ...records.slice(0, 49)]);
      }
    });

    // 5. Refresh exact balance directly from backend! No race conditions!
    if (currentUser) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.wallet) {
          setBalance(parseFloat(data.wallet.main_balance) || 0);
        }
      } catch (err) {
        console.error('[settleGameBets] Backend hydration failed:', err.message);
      }
    } else {
       setBalance(b => parseFloat((b + totalWinnings).toFixed(2))); // local unauthenticated fallback
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
      hydrateWallet,
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
      pendingWithdrawals,
      requestWithdrawal,
      myOrders,
      liveBets,
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
