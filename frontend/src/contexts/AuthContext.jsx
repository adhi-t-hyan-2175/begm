import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseReady, getBy, updateWhere, getAll } from '../services/supabase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── VIP level helpers ────────────────────────────────────────────────────────
export const getVipLevel = (totalRecharge = 0) => {
  if (totalRecharge >= 100000) return { name: 'Master',  emoji: '👑', color: '#7c3aed', bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', min: 100000 };
  if (totalRecharge >= 50000)  return { name: 'Diamond', emoji: '💎', color: '#0ea5e9', bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', min: 50000  };
  if (totalRecharge >= 25000)  return { name: 'Gold',    emoji: '🥇', color: '#d97706', bg: 'linear-gradient(135deg,#f59e0b,#d97706)',  min: 25000  };
  if (totalRecharge >= 10000)  return { name: 'Silver',  emoji: '🥈', color: '#64748b', bg: 'linear-gradient(135deg,#94a3b8,#64748b)',  min: 10000  };
  return                              { name: 'Bronze',  emoji: '🥉', color: '#b45309', bg: 'linear-gradient(135deg,#d97706,#b45309)',  min: 0      };
};

// ─── Ensure a user profile + wallet row exists after OAuth login ──────────────
async function upsertProfile(session) {
  const { user: authUser } = session;
  if (!authUser) return null;

  try {
    // Call backend to upsert profile (creates row if not exists, returns it)
    const res = await fetch(`${API_URL}/api/auth/upsert-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await res.json();
    if (data.success) return data.user;
  } catch (err) {
    console.warn('[upsertProfile] Backend unavailable, using Supabase directly:', err.message);
  }

  // Fallback: directly upsert in Supabase if backend is down
  const email = authUser.email;
  const nickname = authUser.user_metadata?.full_name || email?.split('@')[0] || 'Player';

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    // Fetch wallet too
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', existing.id)
      .maybeSingle();
    return { ...existing, main_balance: wallet?.main_balance || 0, bonus_balance: wallet?.bonus_balance || 0 };
  }

  // Insert new profile
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      email,
      google_id: authUser.id,
      nickname,
      vip_level: 'Bronze',
      status: 'Active',
      role: 'user',
      total_recharge: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[upsertProfile] Failed to create user profile:', error.message);
    return null;
  }

  // Create wallet for the new user
  await supabase.from('wallets').insert({
    user_id: newUser.id,
    main_balance: 0,
    bonus_balance: 0,
  });

  return { ...newUser, main_balance: 0, bonus_balance: 0 };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // On mount: subscribe to Supabase auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const profile = await upsertProfile(session);
        setUser(profile);
        // Store access_token so backend API calls can use it
        localStorage.setItem('token', session.access_token);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profile = await upsertProfile(session);
        setUser(profile);
        localStorage.setItem('token', session.access_token);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update token in localStorage silently
        localStorage.setItem('token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Sign in with Google ───────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://begm.vercel.app',
      },
    });
    if (error) {
      console.error('[signInWithGoogle]', error.message);
      throw new Error(error.message || 'Google sign-in failed');
    }
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  // ── updateUserRecharge — called when a recharge is approved ──────────────────
  const updateUserRecharge = useCallback(async (userId, amount) => {
    const targetUser = allUsers.find(u => String(u.id) === String(userId));
    if (!targetUser) return;

    const newTotal = (targetUser.total_recharge || 0) + amount;
    const newVip = getVipLevel(newTotal).name;
    const updates = { total_recharge: newTotal, vip_level: newVip };

    if (isSupabaseReady()) {
      try {
        await updateWhere('users', 'id', userId, updates);
      } catch (err) {
        console.warn('[updateUserRecharge] Supabase failed:', err.message);
      }
    }

    setAllUsers(prev => prev.map(u =>
      String(u.id) === String(userId) ? { ...u, ...updates } : u
    ));
    if (user && String(user.id) === String(userId)) {
      setUser(prev => ({ ...prev, ...updates }));
    }
  }, [allUsers, user]);

  // ── Refresh all users from Supabase (called by Admin) ────────────────────────
  const refreshAllUsers = useCallback(async () => {
    if (!isSupabaseReady()) return;
    try {
      const dbUsers = await getAll('users', null, 'created_at');
      setAllUsers(dbUsers);
    } catch (err) {
      console.warn('[refreshAllUsers] Supabase failed:', err.message);
    }
  }, []);

  // ── Freeze / unfreeze user (admin action) ─────────────────────────────────────
  const setUserStatus = useCallback(async (userId, status) => {
    if (isSupabaseReady()) {
      try { await updateWhere('users', 'id', userId, { status }); } catch {}
    }
    setAllUsers(prev => prev.map(u => String(u.id) === String(userId) ? { ...u, status } : u));
  }, []);

  return (
    <AuthContext.Provider value={{
      user, setUser,
      allUsers, setAllUsers,
      loading,
      signInWithGoogle,
      logout,
      updateUserRecharge,
      refreshAllUsers,
      setUserStatus,
      getVipLevel,
      isSupabaseReady,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
