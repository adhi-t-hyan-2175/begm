import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useWallet } from './WalletContext';
import { useGameTimer, generateHistory } from '../hooks/useGameTimer';

const GAME_CONFIGS = {
  FastParty: { duration: 60, bettingDuration: 30 },
  Parity: { duration: 120, bettingDuration: 60 },
  Sapre: { duration: 180, bettingDuration: 120 },
  Dice: { duration: 60, bettingDuration: 30 },
  Wheelocity: { duration: 60, bettingDuration: 30 },
  AndarBahar: { duration: 60, bettingDuration: 30 }
};

export const GlobalGameContext = createContext({});

export const GlobalGameProvider = ({ children }) => {
  const [gameStates, setGameStates] = useState({});
  const [gameHistories, setGameHistories] = useState({
    FastParty: [], Parity: [], Sapre: [], Dice: [], Wheelocity: [], AndarBahar: []
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
        .order('period', { ascending: false })
        .limit(300);
      
      if (data && !error) {
        const hists = { FastParty: [], Parity: [], Sapre: [], Dice: [], Wheelocity: [], AndarBahar: [] };
        data.forEach(row => {
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
            // If transitioned from resolving to betting, or period changed
            if (oldState && oldState.period !== row.period) {
              // Trigger a global event so components can hydrate
              window.dispatchEvent(new CustomEvent('global_period_changed', { detail: { game: row.game, period: row.period } }));
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
          setGameHistories(prev => {
            const currentList = prev[row.game] || [];
            // If it's an UPDATE, replace the existing row
            if (payload.eventType === 'UPDATE') {
              return {
                ...prev,
                [row.game]: currentList.map(item => (item.game === row.game && item.period === row.period) ? row : item)
              };
            }
            // If it's an INSERT, only add if it doesn't exist
            if (!currentList.some(item => item.game === row.game && item.period === row.period)) {
              return {
                ...prev,
                [row.game]: [row, ...currentList]
              };
            }
            return prev;
          });
          window.dispatchEvent(new CustomEvent('global_result_received', { detail: { game: row.game, period: row.period } }));
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

// Hook to be used inside components
export const useGlobalGame = (gameType) => {
  const { gameHistories } = useContext(GlobalGameContext);
  const realHistory = gameHistories[gameType] || [];
  
  const config = GAME_CONFIGS[gameType] || { duration: 60, bettingDuration: 30 };
  const localTimer = useGameTimer(config.duration, config.bettingDuration);
  
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
    status: localTimer.isBettingOpen ? 'betting' : 'resolving',
    formatTime,
    realHistory: realHistory.length > 0 ? realHistory : generateHistory(gameType, localTimer.period, 50).map(h => ({
      period: h.period,
      result: { label: h.label, number: h.number, color: h.color }
    }))
  };
};
