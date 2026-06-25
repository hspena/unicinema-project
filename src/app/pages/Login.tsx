import React, { useState } from 'react';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Toggle }   from '../components/ui';
import { registerMoviegoer, isUsernameAvailable } from '../services/userService';
import { Film, AlertTriangle, X, Check, Hourglass, CheckCircle2, ArrowRight } from '../utils/icons';

type AuthMode = 'login' | 'register';

// ─── Google "G" brand mark ────────────────────────────────────────────────────
const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

// ─── Divider with "or" label ──────────────────────────────────────────────────
const OrDivider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    OR
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
  </div>
);

const FEATURES = [
  'Book tickets for any cinema room instantly',
  'Real-time seat availability and schedules',
  'Manage your cinema with powerful tools',
  'Dark mode, accessibility, and student-friendly',
];

// ─── Username validator ───────────────────────────────────────────────────────
const validateUsername = (u: string): string | null => {
  if (!u) return 'Username is required.';
  if (u.length < 3) return 'Username must be at least 3 characters.';
  if (u.length > 20) return 'Username must be 20 characters or less.';
  if (!/^[a-z0-9_]+$/.test(u)) return 'Only lowercase letters, numbers, and underscores.';
  return null;
};

// ─── User display component (shown in sidebar/profile) ───────────────────────
export const UserDisplay = ({
  displayName, username, size = 'md',
}: {
  displayName: string;
  username:    string;
  size?:       'sm' | 'md';
}) => {
  const same = displayName.toLowerCase() === username.toLowerCase();
  const fs1  = size === 'sm' ? '0.82rem' : '0.9rem';
  const fs2  = size === 'sm' ? '0.68rem' : '0.74rem';

  return (
    <div>
      <div style={{ fontSize: fs1, fontWeight: 600, color: 'var(--text-primary)' }}>
        {displayName}
      </div>
      {!same && (
        <div style={{ fontSize: fs2, color: 'var(--text-muted)', marginTop: 1 }}>
          @{username}
        </div>
      )}
    </div>
  );
};

// ─── Main Login Page ──────────────────────────────────────────────────────────
const Login = () => {
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const { darkMode, setDarkMode }               = useTheme();

  const [mode, setMode] = useState<AuthMode>('login');

  // Login fields
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regUsername,    setRegUsername]    = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail,       setRegEmail]       = useState('');
  const [regPass,        setRegPass]        = useState('');
  const [regConfirm,     setRegConfirm]     = useState('');
  const [regError,       setRegError]       = useState('');
  const [regLoading,     setRegLoading]     = useState(false);
  const [regSuccess,     setRegSuccess]     = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameStatus,   setUsernameStatus]   = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');

  // ── Login ──────────────────────────────────────────────────────────────────
  const [loginHint, setLoginHint] = useState('');
  const handleLogin = async () => {
    if (!email && !password) { setLoginHint('Please enter your email and password.'); return; }
    if (!email)              { setLoginHint('Please enter your email address.'); return; }
    if (!password)           { setLoginHint('Please enter your password.'); return; }
    setLoginHint('');
    await login(email, password);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  // ── Username check (debounced) ─────────────────────────────────────────────
  const handleUsernameChange = async (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setRegUsername(clean);

    // Auto-fill displayName if it's still the same as the old username
    if (!regDisplayName || regDisplayName === regUsername) {
      setRegDisplayName(clean);
    }

    if (!clean || clean.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const validErr = validateUsername(clean);
    if (validErr) { setUsernameStatus('invalid'); return; }

    setUsernameChecking(true);
    setUsernameStatus('idle');
    try {
      const available = await isUsernameAvailable(clean);
      setUsernameStatus(available ? 'available' : 'taken');
    } finally {
      setUsernameChecking(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setRegError('');

    const uErr = validateUsername(regUsername);
    if (uErr) { setRegError(uErr); return; }
    if (!regDisplayName.trim()) { setRegError('Display name is required.'); return; }
    if (!regEmail)               { setRegError('Email is required.'); return; }
    if (regPass.length < 6)      { setRegError('Password must be at least 6 characters.'); return; }
    if (regPass !== regConfirm)  { setRegError('Passwords do not match.'); return; }
    if (usernameStatus === 'taken') { setRegError('That username is already taken.'); return; }

    setRegLoading(true);
    try {
      await registerMoviegoer({
        name:        regDisplayName,
        displayName: regDisplayName,
        username:    regUsername,
        email:       regEmail,
        password:    regPass,
      });
      setRegSuccess(true);
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
        err.code === 'auth/invalid-email'         ? 'Please enter a valid email address.' :
        err.message ?? 'Registration failed.';
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  const switchMode = (m: AuthMode) => {
    setMode(m); clearError(); setRegError(''); setRegSuccess(false); setLoginHint('');
  };

  const usernameIndicator = () => {
    if (usernameChecking) return { color: 'var(--text-muted)', icon: Hourglass, text: 'Checking…' };
    if (usernameStatus === 'available') return { color: 'var(--success)', icon: Check, text: 'Available' };
    if (usernameStatus === 'taken')     return { color: 'var(--danger)',  icon: X, text: 'Taken' };
    if (usernameStatus === 'invalid')   return { color: 'var(--warning)', icon: AlertTriangle, text: 'Invalid format' };
    return null;
  };
  const indicator = usernameIndicator();

  // ── Google sign-in button (shared by both tabs) ────────────────────────────
  const googleButton = (label: string) => (
    <button
      className="btn btn-secondary"
      style={{ width: '100%', justifyContent: 'center', gap: 8, opacity: isLoading ? 0.7 : 1 }}
      onClick={loginWithGoogle}
      disabled={isLoading}
      type="button"
    >
      <GoogleIcon /> {label}
    </button>
  );

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo"><Film size={28} /></div>
          <h2>The ultimate cinema experience starts here.</h2>
          <p>A universal ticketing platform built for students, cinemas, and staff.</p>
          {FEATURES.map((f, i) => (
            <div key={i} className="login-feature">
              <div className="login-feature-dot" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form">

          {/* Tabs */}
          <div className="login-tabs">
            <button className={`login-tab ${mode === 'login'    ? 'active' : ''}`} onClick={() => switchMode('login')}>Sign In</button>
            <button className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>Register</button>
          </div>

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <h3>Welcome back</h3>
              <p>Sign in to continue to CineHub</p>

              {error && (
                <div className="auth-error">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</span>
                  <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={clearError}><X size={14} /></span>
                </div>
              )}

              {loginHint && !error && (
                <div className="auth-error">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {loginHint}</span>
                  <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setLoginHint('')}><X size={14} /></span>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input className="input-field" type="email" placeholder="you@email.com"
                  value={email} onChange={e => { setEmail(e.target.value); if (loginHint) setLoginHint(''); }}
                  onKeyDown={handleKeyDown} disabled={isLoading} />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input-field" type="password" placeholder="••••••••"
                  value={password} onChange={e => { setPassword(e.target.value); if (loginHint) setLoginHint(''); }}
                  onKeyDown={handleKeyDown} disabled={isLoading} />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: isLoading ? 0.7 : 1, marginTop: 8 }}
                onClick={handleLogin} disabled={isLoading}
              >
                {isLoading ? <><Hourglass size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Signing in…</> : 'Sign In'}
              </button>

              <OrDivider />
              {googleButton('Sign in with Google')}

              <div style={{ marginTop: 14, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                New moviegoer?{' '}
                <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => switchMode('register')}>
                  Create a free account
                </span>
              </div>
            </>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <>
              <h3>Create Account</h3>
              <p>Register as a Moviegoer to start booking tickets.</p>

              {regSuccess ? (
                <div style={{
                  padding: 20, textAlign: 'center',
                  background: 'rgba(76,175,130,0.1)',
                  border: '1px solid rgba(76,175,130,0.3)',
                  borderRadius: 'var(--radius)',
                }}>
                  <div style={{ marginBottom: 12, color: 'var(--success)', display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={40} /></div>
                  <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>Account Created!</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    Welcome, <strong>{regDisplayName}</strong> (@{regUsername})!
                    Sign in with your new credentials.
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { setEmail(regEmail); setPassword(regPass); switchMode('login'); }}>
                    Go to Sign In <ArrowRight size={14} style={{ verticalAlign: -2, marginLeft: 4 }} />
                  </button>
                </div>
              ) : (
                <>
                  {regError && (
                    <div className="auth-error">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {regError}</span>
                      <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setRegError('')}><X size={14} /></span>
                    </div>
                  )}

                  {/* Username */}
                  <div className="input-group">
                    <label className="input-label">
                      Username *
                      {indicator && (
                        <span style={{ marginLeft: 8, fontSize: '0.72rem', color: indicator.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <indicator.icon size={12} /> {indicator.text}
                        </span>
                      )}
                    </label>
                    <input
                      className="input-field"
                      placeholder="e.g. moviefan99"
                      value={regUsername}
                      onChange={e => handleUsernameChange(e.target.value)}
                      style={{ borderColor: usernameStatus === 'taken' ? 'var(--danger)' : usernameStatus === 'available' ? 'var(--success)' : undefined }}
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      Lowercase letters, numbers, underscores only. Used to @mention you.
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="input-group">
                    <label className="input-label">Display Name *</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Movie Fan 99"
                      value={regDisplayName}
                      onChange={e => setRegDisplayName(e.target.value)}
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      This is your public name. You can make it different from your username.
                    </div>
                  </div>

                  {/* Email */}
                  <div className="input-group">
                    <label className="input-label">Email Address *</label>
                    <input className="input-field" type="email" placeholder="you@email.com"
                      value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                  </div>

                  {/* Password */}
                  <div className="input-row">
                    <div className="input-group">
                      <label className="input-label">Password *</label>
                      <input className="input-field" type="password" placeholder="Min. 6 chars"
                        value={regPass} onChange={e => setRegPass(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Confirm Password *</label>
                      <input className="input-field" type="password" placeholder="Repeat"
                        value={regConfirm} onChange={e => setRegConfirm(e.target.value)} />
                    </div>
                  </div>

                  {/* Info note */}
                  <div style={{
                    padding: '9px 12px', marginBottom: 14,
                    background: 'var(--gold-dim)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)',
                  }}>
                    <Film size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> You'll be registered as a <strong style={{ color: 'var(--gold)' }}>Moviegoer</strong>.
                    For other roles, contact your admin.
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', opacity: regLoading ? 0.7 : 1 }}
                    onClick={handleRegister} disabled={regLoading}
                  >
                    {regLoading ? '⏳ Creating account…' : 'Create Account'}
                  </button>

                  <OrDivider />
                  {googleButton('Sign up with Google')}

                  <div style={{ marginTop: 14, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Already have an account?{' '}
                    <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => switchMode('login')}>Sign in</span>
                  </div>
                </>
              )}
            </>
          )}

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <Toggle checked={!darkMode} onChange={e => setDarkMode(!e.target.checked)} label="Light" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;