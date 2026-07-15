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

    // 1. Subscribe to Platform Settings (Global)
    const settingsChannel = supabase.channel('public:platform_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'platform_settings' },
        (payload) => {
          console.log('🔄 [Realtime] Platform settings updated', payload.new);
          setAdminSettings(payload.new);
          // Auto-trigger maintenance mode reload if turned on
          if (payload.new.maintenance_mode === 'On') {
            window.location.reload();
          }
        }
      )
      .subscribe();

    // 2. Subscribe to User Specific Events (Wallet, Notifications, Requests)
    let userChannel;
    if (user?.id) {
      userChannel = supabase.channel(`public:user:${user.id}`)
        // Listen to wallet updates
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
          (payload) => {
            console.log('🔄 [Realtime] Wallet updated', payload);
            if (hydrateWallet) hydrateWallet(); // Re-fetch or manually update
          }
        )
        // Listen to recharge request updates
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'recharge_requests', filter: `user_id=eq.${user.id}` },
          (payload) => {
            console.log('🔄 [Realtime] Recharge updated', payload.new);
            if (payload.new.status === 'approved') {
              // Optionally trigger a notification toast here
            }
          }
        )
        // Listen to withdrawal updates
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'withdrawal_requests', filter: `user_id=eq.${user.id}` },
          (payload) => {
            console.log('🔄 [Realtime] Withdrawal updated', payload.new);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(settingsChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, [user?.id, hydrateWallet]);

  return (
    <SocketContext.Provider value={{ adminSettings }}>
      {children}
    </SocketContext.Provider>
  );
};
