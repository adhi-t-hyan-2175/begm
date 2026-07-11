import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseReady, getBy, insertRow, updateWhere, getAll } from '../services/supabase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// ─── VIP level helpers ────────────────────────────────────────────────────────
export const getVipLevel = (totalRecharge = 0) => {
  if (totalRecharge >= 100000) return { name: 'Master',  emoji: '👑', color: '#7c3aed', bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', min: 100000 };
  if (totalRecharge >= 50000)  return { name: 'Diamond', emoji: '💎', color: '#0ea5e9', bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', min: 50000  };
  if (totalRecharge >= 25000)  return { name: 'Gold',    emoji: '🥇', color: '#d97706', bg: 'linear-gradient(135deg,#f59e0b,#d97706)',  min: 25000  };
  if (totalRecharge >= 10000)  return { name: 'Silver',  emoji: '🥈', color: '#64748b', bg: 'linear-gradient(135deg,#94a3b8,#64748b)',  min: 10000  };
  return                              { name: 'Bronze',  emoji: '🥉', color: '#b45309', bg: 'linear-gradient(135deg,#d97706,#b45309)',  min: 0      };
};

// ─── Simple in-memory password hash (no bcrypt on frontend) ──────────────────
// We store the raw password in localStorage for offline mode and bcrypt hash in Supabase.
// In a production app you'd hash only on the backend.
const hashPassword = (pw) => btoa(encodeURIComponent(pw)); // base64 for localStorage fallback
const checkPassword = (pw, hash) => hash === btoa(encodeURIComponent(pw));

// ─── localStorage helpers (offline / fallback mode) ──────────────────────────
const LS_USERS = 'gambb_all_users';
const LS_USER  = 'gambb_current_user';

function lsGetUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS)) || []; } catch { return []; }
}
function lsSaveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}
function lsGetCurrentUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER)); } catch { return null; }
}
function lsSaveCurrentUser(user) {
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
  else localStorage.removeItem(LS_USER);
}

// ─── Seed default admin if no users exist (offline mode) ─────────────────────
function seedOfflineAdmin() {
  const users = lsGetUsers();
  if (!users.find(u => u.id === 7777)) {
    const admin = {
      id: 7777, phone: '8750743836', password_hash: hashPassword('password123'),
      nickname: 'Admin', vip_level: 'Bronze', status: 'Active',
      total_recharge: 0, created_at: new Date().toISOString()
    };
    lsSaveUsers([admin, {
      id: 7778, phone: '9876543210', password_hash: hashPassword('password123'),
      nickname: 'TestUser', vip_level: 'Bronze', status: 'Active',
      total_recharge: 500, created_at: new Date().toISOString()
    }]);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(lsGetCurrentUser);
  const [allUsers, setAllUsers] = useState(lsGetUsers);
  const [loading, setLoading] = useState(true);

  // On mount: seed offline admin + try to hydrate from Supabase
  useEffect(() => {
    seedOfflineAdmin();

    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          lsSaveCurrentUser(data.user);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (err) {
        console.warn('[Auth] Hydration failed:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  // Keep localStorage in sync whenever allUsers changes
  useEffect(() => { lsSaveUsers(allUsers); }, [allUsers]);
  useEffect(() => { lsSaveCurrentUser(user); }, [user]);

  // ── Send OTP ──────────────────────────────────────────────────────────────────
  const sendOtp = useCallback(async (phone) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      return data;
    } catch (err) {
      console.error('[SendOTP]', err);
      throw err;
    }
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────────
  const registerUser = useCallback(async (phone, password, otp, nickname = 'Player', inviteCode = '') => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, otp, nickname, inviteCode })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      lsSaveCurrentUser(data.user);
      return data.user;
    } catch (err) {
      console.error('[Register]', err);
      throw err;
    }
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────────
  const loginUser = useCallback(async (phone, password) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      lsSaveCurrentUser(data.user);
      return data.user;
    } catch (err) {
      console.error('[Login]', err);
      throw err;
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    lsSaveCurrentUser(null);
  }, []);

  // ── Update password ───────────────────────────────────────────────────────────
  const updatePassword = useCallback(async (oldPass, newPass) => {
    if (!user) throw new Error('Not logged in');
    if (!checkPassword(oldPass, user.password_hash)) throw new Error('Old password is incorrect');
    const newHash = hashPassword(newPass);
    const updated = { ...user, password_hash: newHash };

    if (isSupabaseReady()) {
      try {
        await updateWhere('users', 'id', user.id, { password_hash: newHash });
      } catch (err) {
        console.warn('[UpdatePassword] Supabase failed:', err.message);
      }
    }

    setUser(updated);
    setAllUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    return true;
  }, [user]);

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
      lsSaveUsers(dbUsers);
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
      registerUser,
      sendOtp,
      loginUser,
      logout,
      updatePassword,
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
