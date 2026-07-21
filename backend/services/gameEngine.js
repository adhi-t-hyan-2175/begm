const supabase = require('../config/supabase');

const EPOCH = 1783617840000;

const gameConfigs = [
  { game: 'FastParity', totalDuration: 60, bettingDuration: 30, evaluationDuration: 30, revealBeforeEnd: 10 },
  { game: 'Parity', totalDuration: 120, bettingDuration: 60, evaluationDuration: 60, revealBeforeEnd: 10 },
  { game: 'Sapre', totalDuration: 180, bettingDuration: 120, evaluationDuration: 60, revealBeforeEnd: 10 },
  { game: 'Dice', totalDuration: 60, bettingDuration: 30, evaluationDuration: 30, revealBeforeEnd: 10 },
  { game: 'Wheelocity', totalDuration: 60, bettingDuration: 30, evaluationDuration: 30, revealBeforeEnd: 10 }
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
    round_id: elapsedPeriods,
    previousPeriod, 
    isBettingOpen, 
    secondsIntoCurrentBlock,
    startTime: new Date(blockStartMs),
    bettingEndTime: new Date(bettingEndMs),
    endTime: new Date(blockEndMs)
  };
};

// Initialise the global_game_state rows at server start
// This runs once before the periodic tick loop.
const initializeState = async () => {
  console.log('[GameEngine] Initializing global game state...');
  const now = Date.now();
  for (const config of gameConfigs) {
    const state = calculateTimerState(config.totalDuration, config.bettingDuration, now);
    const currentStatus = state.isBettingOpen ? 'betting' : 'resolving';
    try {
      await supabase.from('global_game_state').upsert({
        game: config.game,
        period: state.period,
        round_id: state.round_id,
        start_time: state.startTime.toISOString(),
        end_time: state.endTime.toISOString(),
        status: currentStatus,
        updated_at: new Date(now).toISOString()
      }, { onConflict: 'game' });
      console.log(`[GameEngine] Initialized ${config.game} period ${state.period} round ${state.round_id} status ${currentStatus}`);
    } catch (e) {
      console.error(`[GameEngine] Failed to init ${config.game}:`, e.message);
    }
  }
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
  if (normalized.includes('party') || normalized.includes('pick') || normalized.includes('parity') || normalized.includes('sapre')) {
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
  
  if (gameType === 'FastParity' || gameType === 'PrimePick' || gameType === 'LuckyPick' || gameType === 'Parity' || gameType === 'Sapre') {
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
const resolvePeriod = async (gameConfig, period, round_id) => {
  const game = gameConfig.game;
  console.log(`[GameEngine] Resolving ${game} Period ${period} (Round ${round_id})`);
  
  try {
    // 1. Fetch real bets for the current round
    const { data: realBets } = await supabase
      .from('bets')
      .select('*')
      .eq('game_type', game)
      .eq('round_id', round_id)
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
      let match = null;
      if (overrideObj.label) {
        match = outcomes.find(o => String(o.label).toLowerCase().trim() === String(overrideObj.label).toLowerCase().trim());
      } else if (overrideObj.color) {
        match = outcomes.find(o => JSON.stringify(o.color) === JSON.stringify(overrideObj.color));
      }
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

    // 4. Save to game_results safely (prevent overwrite by multiple instances)
    const { data: existing } = await supabase.from('game_results').select('id, is_override, result').eq('game', game).eq('round_id', round_id).maybeSingle();
    
    if (existing) {
      console.log(`[GameEngine] Result already exists for ${game} Round ${round_id}. Skipping overwrite to enforce immutable results.`);
      return; // Skip everything else - winner is written only once per round_id
    }

    await supabase.from('game_results').insert({
      game,
      period,
      round_id,
      result: finalResult,
      is_override: !!adminOverride,
      profit: maxProfit,
      total_bets: allBets.length,
      created_at: new Date().toISOString()
    });

    // 5. Settle real bets
    if (realBets && realBets.length > 0) {
      for (const bet of realBets) {
        try {
          const won = String(bet.selection).toLowerCase().trim() === String(finalResult.label).toLowerCase().trim();
          const multiplier = multipliersMap[bet.selection] || multipliersMap[String(bet.selection).toLowerCase().trim()] || 2;
          const payoutAmount = won ? parseFloat(bet.amount) * multiplier : 0;
          const betProfit = won ? payoutAmount - parseFloat(bet.amount) : -parseFloat(bet.amount);
          const newStatus = won ? 'won' : 'lost';

          let currentBalance = parseFloat(bet.wallet_before || 0);

          if (won && payoutAmount > 0) {
            // Credit wallet
            const { data: wallet, error: walletErr } = await supabase.from('wallets').select('main_balance').eq('user_id', bet.user_id).single();
            if (walletErr) throw new Error(`Wallet fetch failed for user ${bet.user_id}: ${walletErr.message}`);
            
            if (wallet) {
              currentBalance = parseFloat(wallet.main_balance || 0);
              const newBalance = currentBalance + payoutAmount;
              
              const { error: walletUpdateErr } = await supabase.from('wallets').update({ main_balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', bet.user_id);
              if (walletUpdateErr) throw new Error(`Wallet update failed: ${walletUpdateErr.message}`);
              
              // Verify user exists before inserting transaction
              const { data: userRow, error: userErr } = await supabase.from('users').select('*').eq('id', bet.user_id).single();
              if (userErr || !userRow) {
                throw new Error(`User with id ${bet.user_id} not found. Aborting transaction insert.`);
              }
              
              const txPayload = {
                user_id: bet.user_id,
                amount: payoutAmount,
                type: 'Win',
                status: 'Success',
                notes: `${game} Period ${period} — Won`
              };
              const { error: txError } = await supabase.from('transactions').insert(txPayload);
              if (txError) {
                console.error('Transaction insert error:', txError.message);
                throw txError;
              }
              
              currentBalance = newBalance;
            }
          }

          const { error: betUpdateErr } = await supabase.from('bets').update({ 
            result: finalResult.label, 
            payout: payoutAmount, 
            status: newStatus,
            profit: betProfit,
            wallet_after: currentBalance
          }).eq('id', bet.id);
          
          if (betUpdateErr) throw new Error(`Bet update failed: ${betUpdateErr.message}`);

        } catch (betError) {
          console.error(`[GameEngine Error] Failed to process bet ${bet.id} for ${game} ${period}:`, betError.message);
          // Continue to the next bet even if this one failed
        }
      }
    }
    
    // Clean up admin override for next period
    if (adminOverride) {
      await supabase.from('global_game_state').update({ admin_override: null }).eq('game', game);
    }
    
    console.log(`[GameEngine] Successfully resolved ${game} Period ${period}. Winner: ${finalResult?.label}`);
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
    
    // Determine exact phase based on time
    let currentStatus = 'betting';
    if (!state.isBettingOpen) {
      const revealTimeMs = state.endTime.getTime() - ((config.revealBeforeEnd || 10) * 1000);
      if (now < revealTimeMs) {
        currentStatus = 'resolving'; // waiting for the reveal point
      } else {
        currentStatus = 'revealing'; // 10 seconds remaining, time to publish!
      }
    }
    
    const stateKey = `${state.period}-${currentStatus}`;
    
    if (lastStateMap[game] !== stateKey) {
      lastStateMap[game] = stateKey;
      
      if (currentStatus === 'betting') {
        // Start of a new betting phase (new period). Upsert safely.
        await supabase.from('global_game_state').upsert({
          game,
          period: state.period,
          round_id: state.round_id,
          start_time: state.startTime.toISOString(),
          end_time: state.endTime.toISOString(),
          status: 'betting',
          updated_at: new Date(now).toISOString()
        }, { onConflict: 'game' });
      } else if (currentStatus === 'resolving') {
        // Betting just closed. Lock the global state so APIs reject new bets.
        await supabase
          .from('global_game_state')
          .update({ status: 'resolving', updated_at: new Date(now).toISOString() })
          .eq('game', game)
          .eq('period', state.period)
          .eq('status', 'betting');
      } else if (currentStatus === 'revealing') {
        // The reveal moment has arrived! Attempt to acquire lock to resolve.
        const { data: lockResult, error: lockErr } = await supabase
          .from('global_game_state')
          .update({ status: 'revealing', updated_at: new Date(now).toISOString() })
          .eq('game', game)
          .eq('period', state.period)
          .eq('status', 'resolving') // Only succeed if it was currently in resolving phase
          .select()
          .maybeSingle();
          
        if (lockResult && !lockErr) {
          // 🏆 THIS INSTANCE ACQUIRED THE LOCK!
          console.log(`[GameEngine] Lock acquired for ${game} Period ${state.period}. Calling resolvePeriod...`);
          
          // No setTimeout needed! We naturally waited by tracking time.
          resolvePeriod(config, state.period, state.round_id);
        } else {
          console.log(`[GameEngine] Instance skipped revealing ${game} ${state.period} (lock acquired by another instance or already revealed).`);
        }
      }
    }
  }
};

const startGameEngine = async () => {
  console.log('🎮 [GameEngine] Starting Global Game Engine...');
  // Initialise state before ticking
  await initializeState();
  // Run tick every 500ms for precision
  setInterval(tick, 500);
};

module.exports = { startGameEngine, resolvePeriod, gameConfigs };
