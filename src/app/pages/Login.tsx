import React, { useState } from 'react';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Toggle }   from '../components/ui';
import { registerMoviegoer } from '../services/userService';

type AuthMode = 'login' | 'register';

const FEATURES = [
  'Book tickets for any cinema room instantly',
  'Real-time seat availability and schedules',
  'Manage your cinema with powerful tools',
  'Dark mode, accessibility, and student-friendly',
];

const Login = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const { darkMode, setDarkMode }               = useTheme();

  const [mode,     setMode]     = useState<AuthMode>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName,    setRegName]    = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPass,    setRegPass]    = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError,   setRegError]   = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) return;
    await login(email, password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setRegError('');
    if (!regName || !regEmail || !regPass || !regConfirm) {
      setRegError('All fields are required.');
      return;
    }
    if (regPass.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regPass !== regConfirm) {
      setRegError('Passwords do not match.');
      return;
    }

    setRegLoading(true);
    try {
      await registerMoviegoer({ name: regName, email: regEmail, password: regPass });
      setRegSuccess(true);
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : err.message ?? 'Registration failed. Please try again.';
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setRegError('');
    setRegSuccess(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo">🎬</div>
          <h2>The ultimate cinema experience starts here.</h2>
          <p>A universal ticketing platform built for students, cinemas, and staff — seamlessly connected.</p>
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

          {/* ── Tab switcher ── */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              className={`login-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>

          {/* ─── LOGIN FORM ───────────────────────────────────────────── */}
          {mode === 'login' && (
            <>
              <h3>Welcome back</h3>
              <p>Sign in to continue to CineHub</p>

              {error && (
                <div className="auth-error">
                  <span>⚠️ {error}</span>
                  <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={clearError}>✕</span>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--gold)', cursor: 'pointer' }}>
                  Forgot password?
                </span>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Signing in…' : 'Sign In'}
              </button>

              <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                New moviegoer?{' '}
                <span
                  style={{ color: 'var(--gold)', cursor: 'pointer' }}
                  onClick={() => switchMode('register')}
                >
                  Create a free account
                </span>
              </div>
            </>
          )}

          {/* ─── REGISTER FORM ────────────────────────────────────────── */}
          {mode === 'register' && (
            <>
              <h3>Create Account</h3>
              <p>Register as a Moviegoer to start booking tickets.</p>

              {/* Success state */}
              {regSuccess ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  background: 'rgba(76,175,130,0.1)',
                  border: '1px solid rgba(76,175,130,0.3)',
                  borderRadius: 'var(--radius)',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>
                    Account Created!
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    Your Moviegoer account is ready. Sign in with your new credentials.
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setEmail(regEmail);
                      setPassword(regPass);
                      switchMode('login');
                    }}
                  >
                    Go to Sign In →
                  </button>
                </div>
              ) : (
                <>
                  {regError && (
                    <div className="auth-error">
                      <span>⚠️ {regError}</span>
                      <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setRegError('')}>✕</span>
                    </div>
                  )}

                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="e.g. Alex Taylor"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      disabled={regLoading}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="you@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={regLoading}
                    />
                  </div>

                  <div className="input-row">
                    <div className="input-group">
                      <label className="input-label">Password</label>
                      <input
                        className="input-field"
                        type="password"
                        placeholder="Min. 6 characters"
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                        disabled={regLoading}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Confirm Password</label>
                      <input
                        className="input-field"
                        type="password"
                        placeholder="Repeat password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        disabled={regLoading}
                      />
                    </div>
                  </div>

                  <div style={{
                    padding: '10px 12px',
                    marginBottom: 16,
                    background: 'var(--gold-dim)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}>
                    🎬 You'll be registered as a <strong style={{ color: 'var(--gold)' }}>Moviegoer</strong>.
                    For other roles, contact your system admin.
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', opacity: regLoading ? 0.7 : 1 }}
                    onClick={handleRegister}
                    disabled={regLoading}
                  >
                    {regLoading ? '⏳ Creating account…' : 'Create Account'}
                  </button>

                  <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Already have an account?{' '}
                    <span
                      style={{ color: 'var(--gold)', cursor: 'pointer' }}
                      onClick={() => switchMode('login')}
                    >
                      Sign in
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {/* Theme toggle */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <Toggle
              checked={!darkMode}
              onChange={(e) => setDarkMode(!e.target.checked)}
              label="Light"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;