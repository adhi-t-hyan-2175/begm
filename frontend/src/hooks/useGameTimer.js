import { useState, useEffect } from 'react';

// Math-based deterministic random generator for histories
// We hash the seed (period string) to get a predictable number between 0 and 1
export const deterministicRandom = (seed) => {
  let h = 0xdeadbeef;
  for(let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

// Generates an array of history records based on the current period
export const generateHistory = (gameType, currentPeriod, count = 50) => {
  const len = currentPeriod.length;
  const base = currentPeriod.substring(0, len - 3);
  let cycle = parseInt(currentPeriod.substring(len - 3), 10);
  
  const history = [];
  
  for (let i = 0; i < count; i++) {
    cycle--;
    let currentBase = base;
    let currentCycle = cycle;
    
    // Handle cycle wrap-around (if we go below 1, we must go to 999 of the previous base)
    if (currentCycle < 1) {
      currentCycle = 999 + currentCycle; // goes to 999, 998, etc.
      // We simulate base going down by 1 (just subtract 1 from last digit for seed)
      currentBase = base ? (parseInt(base) - 1).toString() : "";
    }
    
    const pStr = currentBase + currentCycle.toString().padStart(3, '0');
    const rnd = deterministicRandom(gameType + pStr);
    
    let result = {};
    if (gameType === 'FastParty' || gameType === 'PrimePick' || gameType === 'LuckyPick') {
      // Color-only result for Parity / Fast Parity / Sapre
      const choices = ['Red', 'Green', 'Violet'];
      const selected = choices[Math.floor(rnd * choices.length)];
      result.label = selected;
      result.number = undefined;
      if (selected === 'Red') result.color = ['#dc3545'];
      if (selected === 'Green') result.color = ['#28a745'];
      if (selected === 'Violet') result.color = ['#6f42c1'];
    } else if (gameType === 'Wheelocity') {
      const choices = ['Two Bits', 'Three Bits', 'Five Bits'];
      const selected = choices[Math.floor(rnd * choices.length)];
      result.label = selected;
      result.number = undefined;
      if (selected === 'Two Bits') result.color = ['#6ec1ff'];
      if (selected === 'Three Bits') result.color = ['#ff8cec'];
      if (selected === 'Five Bits') result.color = ['#88f29f'];
    } else if (gameType === 'Dice') {
      const die1 = (Math.floor(rnd * 6) + 1);
      const die2 = (Math.floor((deterministicRandom(gameType + pStr + '-2')) * 6) + 1);
      const sum = die1 + die2; // 2 - 12
      result.number = sum;
      if (sum === 7) {
        result.label = 'Tie';
        result.color = ['#f1c40f']; // yellow
      } else if (sum >= 2 && sum <= 6) {
        result.label = 'Small';
        result.color = ['#6ec1ff']; // sky blue
      } else {
        result.label = 'Large';
        result.color = ['#dc3545']; // red
      }
    } else if (gameType === 'AndarBahar') {
      const isAndar = rnd > 0.5;
      result.number = isAndar ? 'A' : 'B';
      result.color = isAndar ? ['#007bff'] : ['#dc3545'];
    } else {
      result.number = Math.floor(rnd * 10);
      result.color = ['#6f42c1'];
    }
    
    history.push({ period: pStr, ...result });
  }
  
  return history;
};

export const generateResult = (gameType, period) => {
  const result = generateHistory(gameType, period, 1)[0];
  if (!result) return { period, number: '', color: ['#6f42c1'] };
  return result;
};

export const isResultRevealed = (isBettingOpen, timeLeft) => !isBettingOpen && timeLeft <= 0;

export const getPossibleOutcomes = (gameType) => {
  const normalized = gameType.toLowerCase();
  if (normalized.includes('party') || normalized.includes('parity') || normalized.includes('sapre') || normalized.includes('pick')) {
    return [
      { label: 'Green', color: ['#28a745'] },
      { label: 'Red', color: ['#dc3545'] },
      { label: 'Violet', color: ['#6f42c1'] },
    ];
  } else if (normalized.includes('wheelocity')) {
    return [
      { label: 'Two Bits', color: ['#6ec1ff'] },
      { label: 'Three Bits', color: ['#ff8cec'] },
      { label: 'Five Bits', color: ['#88f29f'] },
    ];
  } else if (normalized.includes('dice')) {
    return [
      { label: 'Small', color: ['#6ec1ff'], number: 3 }, 
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

export const getRiggedResult = (gameType, period, myOrders = [], multipliersMap = {}) => {
  const fakeBets = generateFakeOrders(gameType, period, 30);
  const realBets = myOrders.filter(o => o.game === gameType && o.period === period);
  const allBets = [...fakeBets, ...realBets.map(o => ({ select: o.selection, point: o.amount }))];
  
  const totalPool = allBets.reduce((sum, b) => sum + b.point, 0);
  const outcomes = getPossibleOutcomes(gameType);
  
  let maxProfit = -Infinity;
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
    // Tie breaker goes to deterministic random outcome if profits are same (e.g. 0)
    if (profit > maxProfit) {
      maxProfit = profit;
      bestOutcome = outcome;
    }
  }
  
  let finalResult;
  if (!bestOutcome) {
    finalResult = generateResult(gameType, period);
  } else {
    // Maintain random numbers generated for history
    const base = generateResult(gameType, period);
    finalResult = { ...base, ...bestOutcome };
  }
  
  return { result: finalResult, profit: maxProfit, totalBets: allBets.length };
};

export const resolvePlayerDisplayResult = (gameType, period, adminOverride, isBettingOpen, timeLeft, myOrders = [], multipliersMap = {}) => {
  const periodEnded = !isBettingOpen;
  if (!periodEnded) {
    return { revealed: false, result: null };
  }
  if (adminOverride) {
    return { revealed: true, result: normalizeResultOverride(adminOverride, gameType, period) };
  }
  return { revealed: true, result: getRiggedResult(gameType, period, myOrders, multipliersMap).result };
};

export const getSettledResult = (gameType, period, getGameResultForPeriod, myOrders = [], multipliersMap = {}) => {
  const adminOverride = getGameResultForPeriod?.(gameType, period);
  if (adminOverride) {
    const norm = normalizeResultOverride(adminOverride, gameType, period);
    // calculate profit for admin override
    const rigged = getRiggedResult(gameType, period, myOrders, multipliersMap);
    let payout = 0;
    const allBets = [...generateFakeOrders(gameType, period, 30), ...myOrders.filter(o => o.game === gameType && o.period === period).map(o => ({ select: o.selection, point: o.amount }))];
    const totalPool = allBets.reduce((sum, b) => sum + b.point, 0);
    for (const bet of allBets) {
      if (String(bet.select).toLowerCase().trim() === String(norm.label).toLowerCase().trim()) {
        const multi = multipliersMap[bet.select] || multipliersMap[String(bet.select).toLowerCase().trim()] || 2;
        payout += bet.point * multi;
      }
    }
    return { ...norm, profit: totalPool - payout, totalBets: allBets.length };
  }
  
  const rigged = getRiggedResult(gameType, period, myOrders, multipliersMap);
  return { ...rigged.result, profit: rigged.profit, totalBets: rigged.totalBets };
};

const OVERRIDE_COLORS = {
  red: '#dc3545',
  green: '#28a745',
  violet: '#6f42c1',
  andar: '#3b78d8',
  bahar: '#e74c3c',
  'two bits': '#6ec1ff',
  'three bits': '#ff8cec',
  'five bits': '#88f29f',
  '2x': '#333',
  '3x': '#dc3545',
  '5x': '#007bff',
};

const deterministicDiceNumber = (period, limit) => {
  const seed = `dice-override-${period}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return (Math.abs(hash) % (limit - 1)) + 1;
};

const deterministicDiceSumInRange = (period, min, max, salt = '') => {
  const seed = `dice-sum-${period}-${salt}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h = h & h;
  }
  const range = max - min + 1;
  return (Math.abs(h) % range) + min;
};

export const normalizeResultOverride = (override, gameType, period) => {
  if (!override) return null;

  if (gameType === 'Dice' && typeof override === 'string' && override.startsWith('<')) {
    const limit = parseInt(override.substring(1), 10);
    if (!isNaN(limit)) {
      const num = deterministicDiceNumber(period, limit);
      return { label: String(num), number: num, color: ['#ff9800'] };
    }
  }

  // Support admin overrides for the two-dice Small/Large/Tie model
  if (gameType === 'Dice' && typeof override === 'string') {
    const key = override.toLowerCase();
    if (key === 'small') {
      const sum = deterministicDiceSumInRange(period, 2, 6, 'small');
      return { label: 'Small', number: sum, color: ['#6ec1ff'] };
    }
    if (key === 'large') {
      const sum = deterministicDiceSumInRange(period, 8, 12, 'large');
      return { label: 'Large', number: sum, color: ['#dc3545'] };
    }
    if (key === 'tie' || key === '7' || key === 'seven') {
      return { label: 'Tie', number: 7, color: ['#f1c40f'] };
    }
  }

  if (typeof override === 'string') {
    const key = override.toLowerCase();
    const color = OVERRIDE_COLORS[key] || '#6c757d';
    return { label: override, color: [color] };
  }
  if (typeof override === 'object') {
    return { label: override.label || override.value || String(override), color: override.color || ['#6c757d'] };
  }
  return { label: String(override), color: ['#6c757d'] };
};

export const getResultLabel = (result) => {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  if (result.label) return result.label;
  if (result.number !== undefined) return String(result.number);
  if (result.value !== undefined) return String(result.value);
  return String(result);
};

export const getOrderBadgeColor = (selection) => {
  const normalized = String(selection || '').toLowerCase();
  if (normalized.includes('green')) return '#28a745';
  if (normalized.includes('red')) return '#dc3545';
  if (normalized.includes('blue')) return '#007bff';
  if (normalized.includes('violet')) return '#6f42c1';
  // Dice mapping: Small = Sky Blue, Tie/7 = Yellow, Large = Red
  if (normalized === 'small') return '#6ec1ff';
  if (normalized === 'large') return '#dc3545';
  if (normalized === '7' || normalized === 'tie' || normalized === 'seven') return '#f1c40f';
  if (normalized.includes('tie')) return '#f1c40f';
  if (normalized.includes('even')) return '#28a745';
  if (normalized.includes('odd')) return '#dc3545';
  if (normalized.includes('<') || normalized.includes('>')) return '#007bff';
  if (normalized.includes('2x')) return '#333';
  if (normalized.includes('3x')) return '#dc3545';
  if (normalized.includes('5x')) return '#007bff';
  if (normalized.includes('andar')) return '#3b78d8';
  if (normalized.includes('bahar')) return '#e74c3c';
  return '#6c757d';
};

const deterministicOrder = (seed) => {
  const value = deterministicRandom(seed);
  return value;
};

export const generateFakeOrders = (gameType, currentPeriod, count = 20) => {
  const selections = {
    Wheelocity: (seed) => ['Two Bits', 'Three Bits', 'Five Bits'][Math.floor(deterministicOrder(seed + '-sel') * 3)],
    AndarBahar: (seed) => ['Andar', 'Bahar', 'Tie'][Math.floor(deterministicOrder(seed + '-sel') * 3)],
    FastParty:  (seed) => ['Green', 'Red', 'Violet'][Math.floor(deterministicOrder(seed + '-sel') * 3)],
    Dice: (seed) => {
      const v = deterministicOrder(seed + '-sel');
      if (v < 0.45) return 'Small';
      if (v < 0.9) return 'Large';
      return 'Tie';
    },
    PrimePick: (seed) => ['Green', 'Red', 'Violet'][Math.floor(deterministicOrder(seed + '-sel') * 3)],
    LuckyPick: (seed) => ['Green', 'Red', 'Violet'][Math.floor(deterministicOrder(seed + '-sel') * 3)]
  };

  // Realistic bet amounts — varied, ending in 0/5/1/9 etc, not always round
  const REALISTIC_AMOUNTS = [10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 75, 80, 100, 120, 150, 200, 250, 300, 350, 400, 500, 600, 700, 750, 800, 1000, 1200, 1500, 2000];

  const orders = [];
  const baseUserId = 10234;
  const maxUserOffset = 69000;
  const usedIds = new Set();

  for (let i = 0; i < count; i++) {
    // ALL orders use currentPeriod — they are the live bets for this round
    const seed = `${gameType}-${currentPeriod}-${i}`;
    const selectionFn = selections[gameType] || ((seed) => ['Odd', 'Even'][Math.floor(deterministicOrder(seed + '-sel') * 2)]);
    const selection = selectionFn(seed);

    // Pick a realistic amount deterministically
    const amtIdx = Math.floor(deterministicOrder(seed + '-amt') * REALISTIC_AMOUNTS.length);
    const point = REALISTIC_AMOUNTS[amtIdx];

    let userId = baseUserId + Math.floor(deterministicOrder(seed + '-user') * maxUserOffset);
    while (usedIds.has(userId)) {
      userId = baseUserId + Math.floor(deterministicOrder(seed + '-user' + userId) * maxUserOffset);
    }
    usedIds.add(userId);

    // Stagger timestamps within the betting window (spread over last 12 seconds)
    const msAgo = Math.floor(deterministicOrder(seed + '-ts') * 12000);

    orders.push({
      id: `${currentPeriod}-${userId}-${i}`,
      period: currentPeriod,
      user: userId.toString(),
      select: selection,
      point,
      game: gameType,
      timestamp: Date.now() - msAgo
    });
  }

  // Sort by timestamp descending (newest first) for display
  orders.sort((a, b) => b.timestamp - a.timestamp);
  return orders;
};


// Global Date.now() synchronized timer hook
export const useGameTimer = (totalDuration = 60, bettingDuration = 15) => {
  // EPOCH ensures all timers sync up perfectly globally. 
  // Using an arbitrary midnight timestamp ensures consistency.
    const calculateState = () => calculateTimerState(totalDuration, bettingDuration);

  const [state, setState] = useState(calculateState());

  useEffect(() => {
    const timer = setInterval(() => {
      setState(calculateState());
    }, 1000);

    return () => clearInterval(timer);
  }, [totalDuration, bettingDuration]);

  // Formatting for display
  const formatTime = () => {
    const min = Math.floor(state.timeLeft / 60);
    const sec = state.timeLeft % 60;
    const mStr = min.toString().padStart(2, '0');
    const sStr = sec.toString().padStart(2, '0');
    return {
      m1: mStr[0],
      m2: mStr[1],
      s1: sStr[0],
      s2: sStr[1]
    };
  };

  return { 
    timeLeft: state.timeLeft,
    isBettingOpen: state.isBettingOpen,
    period: state.period,
    previousPeriod: state.previousPeriod,
    nextPeriod: state.nextPeriod,
    secondsIntoPeriod: state.secondsIntoPeriod,
    formatTime 
  };
};

export const EPOCH = 1783617840000; // Reset to right now to force 001

export const formatPeriodIndex = (periodIndex) => {
  const periodInCycle = (periodIndex % 999) + 1;
  return `${periodInCycle.toString().padStart(3, '0')}`;
};

export const calculateTimerState = (totalDuration = 60, bettingDuration = 15, now = Date.now()) => {
  // Period calculation MUST use the game's specific totalDuration so periods align perfectly
  // with the countdown timer (e.g. FastParity gets a new period every 30s)
  
  const elapsedSeconds = Math.floor((now - EPOCH) / 1000);
  const elapsedPeriods = Math.floor(elapsedSeconds / totalDuration);
  
  // Time calculation uses the game's actual totalDuration for game-specific timing
  const secondsIntoCurrentBlock = elapsedSeconds % totalDuration;
  const timeLeft = totalDuration - secondsIntoCurrentBlock;
  
  // Betting is open in the first bettingDuration seconds of the game cycle
  const isBettingOpen = secondsIntoCurrentBlock < bettingDuration;
  
  const period = formatPeriodIndex(elapsedPeriods);
  const previousPeriod = formatPeriodIndex(Math.max(0, elapsedPeriods - 1));
  const nextPeriod = formatPeriodIndex(elapsedPeriods + 1);
  const secondsIntoPeriod = secondsIntoCurrentBlock;
  
  return { timeLeft, isBettingOpen, period, previousPeriod, nextPeriod, secondsIntoPeriod };
};
