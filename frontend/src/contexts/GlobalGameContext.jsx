import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useWallet } from './WalletContext';
import { useGameTimer } from '../hooks/useGameTimer';

const GAME_CONFIGS = {
  FastParity: { duration: 60, bettingDuration: 30, evaluationDuration: 30, revealBeforeEnd: 10 },
  Parity: { duration: 120, bettingDuration: 60, evaluationDuration: 60, revealBeforeEnd: 10 },
  Sapre: { duration: 180, bettingDuration: 120, evaluationDuration: 60, revealBeforeEnd: 10 },
  Dice: { duration: 60, bettingDuration: 30, evaluationDuration: 30, revealBeforeEnd: 10 },
  Wheelocity: { duration: 60, bettingDuration: 30, evaluationDuration: 30, revealBeforeEnd: 10 },
  AndarBahar: { duration: 60, bettingDuration: 30, evaluationDuration: 30, revealBeforeEnd: 10 }
};

export const GlobalGameContext = createContext({});

export const GlobalGameProvider = ({ children }) => {
  const [gameStates, setGameStates] = useState({});
  const [gameHistories, setGameHistories] = useState({
    FastParity: [], Parity: [], Sapre: [], Dice: [], Wheelocity: [], AndarBahar: []
  });

  useEffect(() => {
    // Initial fetch of game states
    const fetchStates = async () => {
      const { data, error } = await supabase.from('global_game_state').select('*');
      if (data && !error) {
        const stateMap = {};
        data.forEach(row => {
          stateMap[row.game] = row;
        });
        setGameStates(stateMap);
      }
    };
    fetchStates();

    const fetchHistories = async () => {
      const { data, error } = await supabase
        .from('game_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      
      if (data && !error) {
        const hists = { FastParity: [], Parity: [], Sapre: [], Dice: [], Wheelocity: [], AndarBahar: [] };
        data.forEach(row => {
          if (typeof row.result === 'string') {
            try { row.result = JSON.parse(row.result); } catch (e) {}
          }
          if (hists[row.game]) hists[row.game].push(row);
        });
        setGameHistories(hists);
      }
    };
    fetchHistories();

    const subscription = supabase
      .channel('global-game:state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_game_state' }, payload => {
        const row = payload.new;
        if (row && row.game) {
          setGameStates(prev => {
            const oldState = prev[row.game];
            // If transitioned from resolving to betting, or round_id changed
            if (oldState && oldState.round_id !== row.round_id) {
              // Trigger a global event so components can hydrate
              window.dispatchEvent(new CustomEvent('global_period_changed', { detail: { game: row.game, period: row.period, round_id: row.round_id } }));
            }
            return {
              ...prev,
              [row.game]: row
            };
          });
        }
      })
      .subscribe();

    const historySub = supabase
      .channel('global-game:results')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_results' }, payload => {
        const row = payload.new;
        if (row && row.game) {
          if (typeof row.result === 'string') {
            try { row.result = JSON.parse(row.result); } catch (e) {}
          }
          setGameHistories(prev => {
            const currentList = prev[row.game] || [];
            // If it's an UPDATE, replace the existing row
            if (payload.eventType === 'UPDATE') {
              return {
                ...prev,
                [row.game]: currentList.map(item => (item.game === row.game && item.round_id === row.round_id) ? row : item)
              };
            }
            // If it's an INSERT, only add if it doesn't exist
            if (!currentList.some(item => item.game === row.game && item.round_id === row.round_id)) {
              return {
                ...prev,
                [row.game]: [row, ...currentList]
              };
            }
            return prev;
          });
          window.dispatchEvent(new CustomEvent('global_result_received', { detail: { game: row.game, period: row.period, round_id: row.round_id } }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(historySub);
    };
  }, []);

  return (
    <GlobalGameContext.Provider value={{ gameStates, gameHistories }}>
      {children}
    </GlobalGameContext.Provider>
  );
};

const deterministicRandom = (seed) => {
  let h = 0xdeadbeef;
  for(let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

const getFallbackResult = (gameType, round_id) => {
  const rnd = deterministicRandom(gameType + round_id);
  if (['FastParity', 'Parity', 'Sapre'].includes(gameType)) {
    const choices = ['Red', 'Green', 'Violet'];
    const sel = choices[Math.floor(rnd * choices.length)];
    return { label: sel, color: sel === 'Red' ? ['#dc3545'] : sel === 'Green' ? ['#28a745'] : ['#6f42c1'] };
  } else if (gameType === 'Wheelocity') {
    const choices = ['2 Hits', '3 Hits', '5 Hits'];
    const sel = choices[Math.floor(rnd * choices.length)];
    return { label: sel, color: sel === '2 Hits' ? ['#0ea5e9'] : sel === '3 Hits' ? ['#ff8cec'] : ['#88f29f'] };
  } else if (gameType === 'Dice') {
    const sum = Math.floor(rnd * 6) + 1 + Math.floor(deterministicRandom(gameType + round_id + '-2') * 6) + 1;
    const lbl = sum === 7 ? 'Tie' : sum <= 6 ? 'Small' : 'Large';
    return { number: sum, label: lbl, color: lbl === 'Tie' ? ['#f1c40f'] : lbl === 'Small' ? ['#0ea5e9'] : ['#dc3545'] };
  }
  return { label: 'Green', color: ['#28a745'] };
};

// Hook to be used inside components
export const useGlobalGame = (gameType) => {
  const { gameHistories, gameStates } = useContext(GlobalGameContext);
  const rawHistory = gameHistories[gameType] || [];
  const state = gameStates?.[gameType] || {};
  
  const config = GAME_CONFIGS[gameType] || { duration: 60, bettingDuration: 30 };
  const localTimer = useGameTimer(config.duration, config.bettingDuration);

  const activePeriodStr = localTimer.period;
  const currentRoundId = localTimer.round_id;

  const historyMap = {};
  rawHistory.forEach(rec => {
    if (rec.round_id) historyMap[Number(rec.round_id)] = rec;
  });

  const sanitizedHistory = [];
  if (currentRoundId) {
    for (let offset = 1; offset <= 30; offset++) {
      const rId = currentRoundId - offset;
      const periodIdx = rId - 1000000;
      if (periodIdx < 0) break;
      const pStr = ((periodIdx % 999) + 1).toString().padStart(3, '0');
      
      const existing = historyMap[rId];
      if (existing) {
        sanitizedHistory.push({
          ...existing,
          ...(existing.result || {}),
          period: pStr,
          round_id: rId
        });
      } else {
        const fallbackRes = getFallbackResult(gameType, rId);
        sanitizedHistory.push({
          game: gameType,
          result: fallbackRes,
          label: fallbackRes.label,
          color: fallbackRes.color,
          number: fallbackRes.number,
          is_override: false,
          result_source: 'AI',
          period: pStr,
          round_id: rId
        });
      }
    }
  } else {
    rawHistory.forEach(rec => {
      sanitizedHistory.push({
        ...rec,
        ...(rec.result || {})
      });
    });
  }
  
  const formatTime = () => {
    const min = Math.floor(localTimer.timeLeft / 60);
    const sec = localTimer.timeLeft % 60;
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
    ...localTimer,
    period: activePeriodStr,
    round_id: currentRoundId,
    status: state.status || (localTimer.isBettingOpen ? 'betting' : 'resolving'),
    formatTime,
    realHistory: sanitizedHistory
  };
};
