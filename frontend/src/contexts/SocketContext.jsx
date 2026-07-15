import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseReady } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, fetchAdminSettings } = useAuth();
  const { hydrateWallet } = useWallet(); // We'll need to add this to WalletContext
  const [adminSettings, setAdminSettings] = useState(null);
  
  useEffect(() => {
    if (!isSupabaseReady()) return;

    // Fetch initial platform settings
    const initSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
      if (data) setAdminSettings(data);
    };
    initSettings();

    // Polling fallback to test if realtime causes white screen
    const intervalId = setInterval(() => {
      initSettings();
      if (user?.id && hydrateWallet) {
        hydrateWallet();
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id, hydrateWallet]);

  return (
    <SocketContext.Provider value={{ adminSettings }}>
      {children}
    </SocketContext.Provider>
  );
};
