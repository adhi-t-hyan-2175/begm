import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Wallet = React.lazy(() => import('./pages/Wallet'));
const Profile = React.lazy(() => import('./pages/Profile'));
const FastParity = React.lazy(() => import('./pages/FastParity'));
const AndarBahar = React.lazy(() => import('./pages/AndarBahar'));
const Wheelocity = React.lazy(() => import('./pages/Wheelocity'));
const Dice = React.lazy(() => import('./pages/Dice'));
const CheckIn = React.lazy(() => import('./pages/CheckIn'));
const Task = React.lazy(() => import('./pages/Task'));
const Parity = React.lazy(() => import('./pages/Parity'));
const Sapre = React.lazy(() => import('./pages/Sapre'));
const OrderRecord = React.lazy(() => import('./pages/OrderRecord'));
const FinancialDetails = React.lazy(() => import('./pages/FinancialDetails'));
const Invite = React.lazy(() => import('./pages/Invite'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Withdraw = React.lazy(() => import('./pages/Withdraw'));
const About = React.lazy(() => import('./pages/About'));
const Support = React.lazy(() => import('./pages/Support'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
import { WalletProvider } from './contexts/WalletContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';

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
        <SocketProvider>
          <Router>
            <MainApp />
          </Router>
        </SocketProvider>
      </WalletProvider>
    </AuthProvider>
  );
};

const MainApp = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { adminSettings } = useSocket();
  const hideBottomNav = ['/login', '/treesadhi', '/leaderboard'].includes(location.pathname);
  const [showSplash, setShowSplash] = React.useState(true);

  if (adminSettings?.maintenance_mode === 'On' && location.pathname !== '/treesadhi') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080808', color: '#fff', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ color: '#0ea5e9', fontSize: '2.5rem', marginBottom: '16px' }}>🛠️ Under Maintenance</h1>
        <p style={{ color: '#aaa', fontSize: '1.1rem', maxWidth: '400px', lineHeight: '1.6' }}>We are currently upgrading our servers to provide you with a better experience. Please check back shortly.</p>
      </div>
    );
  }

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
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <React.Suspense fallback={<LoadingScreen />}><Login /></React.Suspense>} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/treesadhi" element={<React.Suspense fallback={<LoadingScreen />}><Admin /></React.Suspense>} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Home /></React.Suspense></ProtectedRoute>} />
          <Route path="/recharge" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Wallet /></React.Suspense></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Profile /></React.Suspense></ProtectedRoute>} />
          <Route path="/checkin" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><CheckIn /></React.Suspense></ProtectedRoute>} />
          <Route path="/task" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Task /></React.Suspense></ProtectedRoute>} />
          <Route path="/invite" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Invite /></React.Suspense></ProtectedRoute>} />
          <Route path="/order-record" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><OrderRecord /></React.Suspense></ProtectedRoute>} />
          <Route path="/financial-details" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><FinancialDetails /></React.Suspense></ProtectedRoute>} />
          <Route path="/withdraw" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Withdraw /></React.Suspense></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><About /></React.Suspense></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Support /></React.Suspense></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Leaderboard /></React.Suspense></ProtectedRoute>} />
          <Route path="/game/fast-parity" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><FastParity /></React.Suspense></ProtectedRoute>} />
          <Route path="/game/parity" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Parity /></React.Suspense></ProtectedRoute>} />
          <Route path="/game/sapre" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Sapre /></React.Suspense></ProtectedRoute>} />
          <Route path="/game/andar-bahar" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><AndarBahar /></React.Suspense></ProtectedRoute>} />
          <Route path="/game/wheelocity" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Wheelocity /></React.Suspense></ProtectedRoute>} />
          <Route path="/game/dice" element={<ProtectedRoute><React.Suspense fallback={<LoadingScreen />}><Dice /></React.Suspense></ProtectedRoute>} />

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
