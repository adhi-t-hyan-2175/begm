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
    if (gameType === 'FastParty' || gameType === 'PrimePick' || gameType === 'LuckyPick' || gameType === 'Parity' || gameType === 'Sapre') {
      // Color-only result for Parity / Fast Parity / Sapre
      const choices = ['Red', 'Green', 'Violet'];
      const selected = choices[Math.floor(rnd * choices.length)];
      result.label = selected;
      result.number = undefined;
      if (selected === 'Red') result.color = ['#dc3545'];
      if (selected === 'Green') result.color = ['#28a745'];
      if (selected === 'Violet') result.color = ['#6f42c1'];
    } else if (gameType === 'Wheelocity') {
      const choices = ['2 Hits', '3 Hits', '5 Hits'];
      const selected = choices[Math.floor(rnd * choices.length)];
      result.label = selected;
      result.number = undefined;
      if (selected === '2 Hits') result.color = ['#0ea5e9'];
      if (selected === '3 Hits') result.color = ['#ff8cec'];
      if (selected === '5 Hits') result.color = ['#88f29f'];
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
        result.color = ['#0ea5e9']; // sky blue
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

// Removed: getRiggedResult, resolvePlayerDisplayResult, getHistoricalResult.
// The frontend should strictly wait for the backend to settle periods.

const OVERRIDE_COLORS = {
  red: '#dc3545',
  green: '#28a745',
  violet: '#6f42c1',
  andar: '#3b78d8',
  bahar: '#e74c3c',
  '2 hits': '#0ea5e9',
  '3 hits': '#ff8cec',
  '5 hits': '#88f29f',
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
      return { label: 'Small', number: sum, color: ['#0ea5e9'] };
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
  if (normalized === 'small') return '#0ea5e9';
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
