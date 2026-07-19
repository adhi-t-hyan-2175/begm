import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

const Login = () => {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      // Supabase will redirect back — onAuthStateChange handles setting the user
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  // Redirect to home when user is authenticated
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="auth-page" style={styles.page}>
      {/* Background glow orbs */}
      <div style={styles.orbTopLeft} />
      <div style={styles.orbBottomRight} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>⚡</div>
          <div style={styles.logoText}>
            BET<span style={styles.logoAccent}>X</span>
          </div>
          <p style={styles.tagline}>Play. Win. Repeat.</p>
        </div>

        <div style={styles.divider} />

        <h2 style={styles.heading}>Welcome Back</h2>
        <p style={styles.subheading}>Sign in to access your account and start playing</p>

        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            ...styles.googleBtn,
            ...(loading ? styles.googleBtnDisabled : {}),
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={e => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {loading ? (
            <>
              <div style={styles.spinner} />
              <span>Redirecting to Google…</span>
            </>
          ) : (
            <>
              {/* Google "G" logo SVG */}
              <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>



        <p style={styles.terms}>
          By continuing, you agree to our <span style={styles.termsLink}>Terms of Service</span> and <span style={styles.termsLink}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
  };



const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080808',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
  },
  orbTopLeft: {
    position: 'absolute',
    top: '-120px',
    left: '-120px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(200,169,110,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: '-100px',
    right: '-100px',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,191,255,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(17,17,17,0.98) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '40px 36px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,169,110,0.05)',
    position: 'relative',
    zIndex: 1,
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  logoIcon: {
    fontSize: '40px',
    lineHeight: '1',
    marginBottom: '8px',
    filter: 'drop-shadow(0 0 16px rgba(200,169,110,0.5))',
  },
  logoText: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#F5F5F5',
    letterSpacing: '-0.5px',
    fontFamily: "'DM Sans', sans-serif",
  },
  logoAccent: {
    color: '#C8A96E',
    backgroundImage: 'linear-gradient(135deg, #C8A96E, #f0c97a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  tagline: {
    color: '#666',
    fontSize: '0.8rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    margin: '4px 0 0',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(200,169,110,0.3), transparent)',
    margin: '24px 0',
  },
  heading: {
    color: '#F5F5F5',
    fontSize: '1.4rem',
    fontWeight: '700',
    textAlign: 'center',
    margin: '0 0 6px',
  },
  subheading: {
    color: '#888',
    fontSize: '0.85rem',
    textAlign: 'center',
    margin: '0 0 28px',
    lineHeight: '1.5',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,77,79,0.1)',
    border: '1px solid rgba(255,77,79,0.3)',
    color: '#ff6b6b',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.83rem',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '14px 20px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '12px',
    color: '#F5F5F5',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
    letterSpacing: '0.01em',
    fontFamily: "'DM Sans', sans-serif",
  },
  googleBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none !important',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#C8A96E',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
  terms: {
    color: '#555',
    fontSize: '0.75rem',
    textAlign: 'center',
    marginTop: '20px',
    lineHeight: '1.6',
  },
  termsLink: {
    color: '#C8A96E',
    textDecoration: 'none',
  },
};

// Inject keyframes for spinner
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  if (!document.head.querySelector('[data-login-spin]')) {
    styleEl.setAttribute('data-login-spin', '');
    document.head.appendChild(styleEl);
  }
}

export default Login;
