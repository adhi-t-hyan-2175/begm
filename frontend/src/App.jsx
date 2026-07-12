import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import Home from './pages/Home';
import Login from './pages/Login';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import FastParity from './pages/FastParity';
import AndarBahar from './pages/AndarBahar';
import Wheelocity from './pages/Wheelocity';
import Dice from './pages/Dice';
import CheckIn from './pages/CheckIn';
import Task from './pages/Task';
import Parity from './pages/Parity';
import Sapre from './pages/Sapre';
import OrderRecord from './pages/OrderRecord';
import FinancialDetails from './pages/FinancialDetails';
import Invite from './pages/Invite';
import Admin from './pages/Admin';
import Withdraw from './pages/Withdraw';
import About from './pages/About';
import Support from './pages/Support';
import Leaderboard from './pages/Leaderboard';
import { WalletProvider } from './contexts/WalletContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const PUBLIC_PATHS = ['/login'];

// Protect routes — if not logged in, go to /login
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user && !PUBLIC_PATHS.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <WalletProvider>
        <Router>
          <MainApp />
        </Router>
      </WalletProvider>
    </AuthProvider>
  );
};

const MainApp = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const hideBottomNav = ['/login', '/treesadhi', '/leaderboard'].includes(location.pathname);
  const [showSplash, setShowSplash] = React.useState(true);

  // Keep the splash screen alive for 3 seconds to let the animation play out
  React.useEffect(() => {
    // Capture referral code if present
    const searchParams = new URLSearchParams(location.search);
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('ref_code', ref);
    }
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // If auth finishes before 3 seconds, showSplash keeps the animation playing.
  // We render LoadingScreen at the top level so it never unmounts/remounts.
  return (
    <>
      {(loading || showSplash) && <LoadingScreen />}
      
      {/* Only render the actual app once auth is finished loading */}
      {!loading && (
        <div className="app-wrapper">
          <div className="page-content">
            <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/treesadhi" element={<Admin />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/recharge" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
          <Route path="/task" element={<ProtectedRoute><Task /></ProtectedRoute>} />
          <Route path="/invite" element={<ProtectedRoute><Invite /></ProtectedRoute>} />
          <Route path="/order-record" element={<ProtectedRoute><OrderRecord /></ProtectedRoute>} />
          <Route path="/financial-details" element={<ProtectedRoute><FinancialDetails /></ProtectedRoute>} />
          <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/game/fast-parity" element={<ProtectedRoute><FastParity /></ProtectedRoute>} />
          <Route path="/game/parity" element={<ProtectedRoute><Parity /></ProtectedRoute>} />
          <Route path="/game/sapre" element={<ProtectedRoute><Sapre /></ProtectedRoute>} />
          <Route path="/game/andar-bahar" element={<ProtectedRoute><AndarBahar /></ProtectedRoute>} />
          <Route path="/game/wheelocity" element={<ProtectedRoute><Wheelocity /></ProtectedRoute>} />
          <Route path="/game/dice" element={<ProtectedRoute><Dice /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!hideBottomNav && user && <BottomNav />}
    </div>
    )}
    </>
  );
};

export default App;
