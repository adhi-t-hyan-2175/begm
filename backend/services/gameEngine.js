const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const EPOCH = 1784738400000; // Reset: 2026-07-22 — periods restart at 001

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
  const elapsedSeconds = Math.max(0, Math.floor((now - EPOCH) / 1000));
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
    round_id: elapsedPeriods + 1000000,
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
  logger.info({ action: 'Engine Initialization', status: 'Starting global game state initialization' });
  const now = Date.now();
  for (const config of gameConfigs) {
    const state = calculateTimerState(config.totalDuration, config.bettingDuration, now);
    await backfillMissingPeriods(config, state.round_id);
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
      logger.info({ game: config.game, round_id: state.round_id, action: 'Initialize Game', status: currentStatus });
    } catch (e) {
      logger.error({ game: config.game, round_id: state.round_id, action: 'Initialize Game', error: e.message });
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

const generateBaseResult = (gameType, round_id) => {
  const rnd = deterministicRandom(gameType + round_id);
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
    const sum = (Math.floor(rnd * 6) + 1) + (Math.floor(deterministicRandom(gameType + round_id + '-2') * 6) + 1);
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

const backfillMissingPeriods = async (config, currentRoundId) => {
  try {
    const game = config.game;
    const { data: latest } = await supabase
      .from('game_results')
      .select('round_id')
      .eq('game', game)
      .order('round_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    let startRound = latest?.round_id ? Number(latest.round_id) + 1 : currentRoundId - 50;
    if (startRound >= currentRoundId) return;

    if (currentRoundId - startRound > 100) {
      startRound = currentRoundId - 100;
    }

    const missing = [];
    for (let r = startRound; r < currentRoundId; r++) {
      const periodIdx = r - 1000000;
      if (periodIdx < 0) continue;
      const periodStr = formatPeriodIndex(periodIdx);
      const resultObj = generateBaseResult(game, r);
      const periodEndTimeMs = EPOCH + (periodIdx * config.totalDuration * 1000) + (config.totalDuration * 1000);
      const createdISO = new Date(periodEndTimeMs).toISOString();

      missing.push({
        game,
        period: periodStr,
        round_id: r,
        result: resultObj,
        is_override: false,
        result_source: 'AI',
        locked_at: createdISO,
        profit: 0,
        total_bets: 0,
        created_at: createdISO
      });
    }

    if (missing.length > 0) {
      for (let i = 0; i < missing.length; i += 50) {
        const batch = missing.slice(i, i + 50);
        await supabase.from('game_results').upsert(batch, { onConflict: 'game,period' });
      }
      logger.info({ game, count: missing.length, action: 'Backfill Periods', status: 'Successfully backfilled missing periods' });
    }
  } catch (err) {
    logger.error({ game: config.game, action: 'Backfill Error', error: err.message });
  }
};



// ─── Settlement Logic ───
const resolvePeriod = async (gameConfig, period, round_id) => {
  const game = gameConfig.game;
  logger.info({ game, round_id, action: 'Resolve Period', status: 'Resolving started' });
  
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

    const getMultiplier = (gameType, selection) => {
      const sel = String(selection || '').toLowerCase().trim();
      const g = String(gameType || '').toLowerCase().trim();
      if (g.includes('parity') || g.includes('fastparity') || g.includes('sapre')) {
        if (sel === 'violet') return 4.5;
        return 1.9;
      }
      if (g.includes('wheelocity')) {
        if (sel.includes('3')) return 3.0;
        if (sel.includes('5')) return 5.0;
        return 1.9;
      }
      if (g.includes('dice')) {
        if (sel === 'tie' || sel === '7') return 4.9;
        return 1.9;
      }
      return 1.9;
    };

    if (adminOverride) {
      const overrideObj = typeof adminOverride === 'string' ? JSON.parse(adminOverride) : adminOverride;
      const outcomes = getPossibleOutcomes(game);
      let match = null;
      if (overrideObj.label) {
        match = outcomes.find(o => String(o.label).toLowerCase().trim() === String(overrideObj.label).toLowerCase().trim());
      } else if (overrideObj.color) {
        match = outcomes.find(o => JSON.stringify(o.color) === JSON.stringify(overrideObj.color));
      }
      const base = generateBaseResult(game, round_id);
      finalResult = match ? { ...base, ...match } : { ...base, ...overrideObj };
      let payout = 0;
      for (const bet of allBets) {
        if (String(bet.select).toLowerCase().trim() === String(finalResult.label).toLowerCase().trim()) {
          const multi = getMultiplier(game, bet.select);
          payout += bet.point * multi;
        }
      }
      maxProfit = totalPool - payout;
    } else {
      const outcomes = getPossibleOutcomes(game);
      if (allBets.length === 0 || totalPool === 0) {
        // If 0 bets placed in this period: pick a RANDOM outcome so colors/options are randomly distributed
        const rnd = deterministicRandom(game + round_id);
        const randomOutcome = outcomes[Math.floor(rnd * outcomes.length)];
        const base = generateBaseResult(game, round_id);
        finalResult = { ...base, ...randomOutcome };
        maxProfit = 0;
      } else {
        // If bets placed: STRICTLY pick the outcome that leaves the HIGHEST POOL REMAINING (Maximum House Profit)
        let maxRemaining = -Infinity;
        let bestOutcomes = [];

        for (const outcome of outcomes) {
          let payout = 0;
          for (const bet of allBets) {
            const betSel = String(bet.select).toLowerCase().trim();
            const outLbl = String(outcome.label).toLowerCase().trim();
            if (betSel === outLbl) {
              const multi = getMultiplier(game, bet.select);
              payout += bet.point * multi;
            }
          }
          const poolRemaining = totalPool - payout;
          if (poolRemaining > maxRemaining) {
            maxRemaining = poolRemaining;
            bestOutcomes = [outcome];
          } else if (poolRemaining === maxRemaining) {
            bestOutcomes.push(outcome);
          }
        }

        const selectedOutcome = bestOutcomes[0] || outcomes[0];
        maxProfit = maxRemaining;
        const base = generateBaseResult(game, round_id);
        finalResult = { ...base, ...selectedOutcome };
      }
    }

    // 4. Save to game_results safely (prevent overwrite by multiple instances)
    const { data: existing } = await supabase.from('game_results').select('id, is_override, result').eq('game', game).eq('round_id', round_id).maybeSingle();
    
    if (existing) {
      logger.info({ game, round_id, action: 'Resolve Period', status: 'Skipped - Result already exists' });
      return; // Skip everything else - winner is written only once per round_id
    }

    const nowISO = new Date().toISOString();
    await supabase.from('game_results').insert({
      game,
      period,
      round_id,
      result: finalResult,
      is_override: !!adminOverride,
      result_source: adminOverride ? 'Admin' : 'AI',
      locked_at: nowISO,
      profit: maxProfit,
      total_bets: allBets.length,
      created_at: nowISO
    });

    // Mark global_game_state as locked and clear single-round admin_override
    await supabase.from('global_game_state').update({ status: 'locked', admin_override: null, updated_at: nowISO }).eq('game', game).eq('round_id', round_id);

    // 5. Settle real bets
    if (realBets && realBets.length > 0) {
      for (const bet of realBets) {
        try {
          const won = String(bet.selection).toLowerCase().trim() === String(finalResult.label).toLowerCase().trim();
          const multiplier = getMultiplier(game, bet.selection);
          const payoutAmount = won ? parseFloat(bet.amount) * multiplier : 0;
          const betProfit = won ? payoutAmount - parseFloat(bet.amount) : -parseFloat(bet.amount);
          const newStatus = won ? 'won' : 'lost';

          let currentBalance = parseFloat(bet.wallet_before || 0);

          if (won && payoutAmount > 0) {
            // Credit wallet
            const { data: wallet, error: walletErr } = await supabase.from('wallets').select('main_balance').eq('user_id', bet.user_id).single();
            if (!walletErr && wallet) {
              currentBalance = parseFloat(wallet.main_balance || 0);
              const newBalance = currentBalance + payoutAmount;
              
              await supabase.from('wallets').update({ main_balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', bet.user_id);
              
              const txPayload = {
                user_id: bet.user_id,
                amount: payoutAmount,
                type: 'Win',
                status: 'Success',
                notes: `${game} Period ${period} — Won`
              };
              await supabase.from('transactions').insert(txPayload);
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
          
          if (betUpdateErr) {
            logger.error({ game, round_id, user_id: bet.user_id, action: 'Update Bet Status', error: betUpdateErr.message });
          } else {
            console.log(`[GameEngine] Bet ${bet.id} settled as ${newStatus}. Payout: ${payoutAmount}`);
          }

        } catch (betError) {
          logger.error({ game, round_id, user_id: bet.user_id, action: 'Process Bet Settlement', error: betError.message });
        }
      }
    }
    
    // Clean up admin override for next period
    if (adminOverride) {
      await supabase.from('global_game_state').update({ admin_override: null }).eq('game', game);
    }
    
    console.log(`[GameEngine] Successfully resolved ${game} Round ${round_id}. Winner: ${finalResult?.label}`);
    logger.info({ game, round_id, action: 'Resolve Period', status: `Successfully resolved. Winner: ${finalResult?.label}` });
  } catch (err) {
    logger.error({ game, round_id, action: 'Resolve Period', error: err.message });
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
    
    const stateKey = `${state.round_id}-${currentStatus}`;
    
    if (lastStateMap[game] !== stateKey) {
      lastStateMap[game] = stateKey;
      
      if (currentStatus === 'betting') {
        // Auto-backfill any missed periods before starting new period
        await backfillMissingPeriods(config, state.round_id);
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
          .eq('round_id', state.round_id)
          .eq('status', 'betting');
        
        // Immediately resolve the period so the winning option is written to game_results
        await resolvePeriod(config, state.period, state.round_id);
      } else if (currentStatus === 'revealing') {
        // The reveal moment has arrived! Ensure result is resolved & state updated.
        await supabase
          .from('global_game_state')
          .update({ status: 'revealing', updated_at: new Date(now).toISOString() })
          .eq('game', game)
          .eq('round_id', state.round_id);
          
        await resolvePeriod(config, state.period, state.round_id);
      }
    }
  }
};

const startGameEngine = async () => {
  logger.info({ action: 'Engine Boot', status: 'Starting Global Game Engine' });
  // Initialise state before ticking
  await initializeState();
  // Run tick every 500ms for precision
  setInterval(tick, 500);
};

module.exports = { startGameEngine, resolvePeriod, gameConfigs };
