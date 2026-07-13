import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useWallet } from './WalletContext';

const GlobalGameContext = createContext({});

export const GlobalGameProvider = ({ children }) => {
  const [gameStates, setGameStates] = useState({});

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

    const subscription = supabase
      .channel('public:global_game_state')
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

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <GlobalGameContext.Provider value={gameStates}>
      {children}
    </GlobalGameContext.Provider>
  );
};

// Hook to be used inside components
export const useGlobalGame = (gameType) => {
  const gameStates = useContext(GlobalGameContext);
  const state = gameStates[gameType];
  
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!state || !state.end_time) return;
    
    const updateTime = () => {
      const end = new Date(state.end_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
    };
    
    updateTime(); // Initial update
    const interval = setInterval(updateTime, 500);
    return () => clearInterval(interval);
  }, [state]);

  if (!state) {
    return {
      period: '000000',
      previousPeriod: '000000',
      timeLeft: 0,
      isBettingOpen: false,
      status: 'loading',
      formatTime: () => ({ m1: '0', m2: '0', s1: '0', s2: '0' }),
      secondsIntoPeriod: 0
    };
  }

  // Calculate previous period for UI display
  const numPeriod = parseInt(state.period);
  const prevNum = numPeriod > 1 ? numPeriod - 1 : 999;
  const previousPeriod = state.period.slice(0, -3) + prevNum.toString().padStart(3, '0');

  const formatTime = () => {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
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
    period: state.period,
    previousPeriod: previousPeriod,
    timeLeft,
    isBettingOpen: state.status === 'betting',
    status: state.status,
    formatTime,
    secondsIntoPeriod: Math.max(0, Math.floor((Date.now() - new Date(state.start_time).getTime()) / 1000))
  };
};
