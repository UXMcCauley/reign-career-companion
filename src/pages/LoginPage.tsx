import React, { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const rLogo = new URL('../assets/REIGN LogoColor No Title@1x.png', import.meta.url).href;

type AuthView  = 'login' | 'signup' | 'forgot';
type AuthPhase = 'idle' | 'loading' | 'success' | 'error';

const viewOrder: Record<AuthView, number> = { login: 0, signup: 1, forgot: 2 };

const LoginPage: React.FC = () => {
  const [view,  setView]  = useState<AuthView>('login');
  const [phase, setPhase] = useState<AuthPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [shake,    setShake]    = useState(false);

  // Login form
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass,  setShowPass]  = useState(false);

  // Signup form
  const [signName,    setSignName]    = useState('');
  const [signEmail,   setSignEmail]   = useState('');
  const [signPass,    setSignPass]    = useState('');
  const [signConfirm, setSignConfirm] = useState('');

  // Forgot form
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent,  setForgotSent]  = useState(false);

  const { login, signup } = useAuth();

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const setError = (msg: string) => {
    setPhase('error');
    setErrorMsg(msg);
    triggerShake();
    setTimeout(() => setPhase('idle'), 4000);
  };

  const getViewClass = (v: AuthView) => {
    const diff = viewOrder[v] - viewOrder[view];
    return diff === 0 ? 'active' : '';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase('loading');
    setErrorMsg('');
    const result = await login(loginUser, loginPass);
    if (result.success) {
      setPhase('success');
    } else {
      setError(result.error ?? 'Login failed. Please try again.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signPass !== signConfirm) {
      setError("Passwords don't match. Please try again.");
      return;
    }
    if (signPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setPhase('loading');
    setErrorMsg('');
    const result = await signup(signName, signEmail, signPass);
    if (result.success) {
      setPhase('success');
    } else {
      setError(result.error ?? 'Signup failed. Please try again.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase('loading');
    await new Promise(r => setTimeout(r, 1100));
    setPhase('idle');
    setForgotSent(true);
  };

  const fillDemo = () => {
    setLoginUser(import.meta.env.VITE_DEMO_USERNAME ?? '');
    setLoginPass(import.meta.env.VITE_DEMO_PASSWORD ?? '');
  };

  const switchView = (v: AuthView) => {
    setErrorMsg('');
    setPhase('idle');
    setView(v);
  };

  const isLoading = phase === 'loading';
  const isSuccess = phase === 'success';

  return (
    <IonPage className="login-page">
      <IonContent>
        <div className="login-scene">

          {/* ── Hero ── */}
          <div className="login-hero">
            <div className="login-logo-glow" />
            <img src={rLogo} alt="REIGN" className="login-r-logo" />
            <span className="login-brand-reign">REIGN</span>
            <span className="login-brand-product">Fate</span>
            <span className="login-brand-tagline">career companion</span>
          </div>

          {/* ── Form card ── */}
          <div className="login-card-wrap">
            <div className="login-card">

              {/* Tabs (hidden on forgot view) */}
              {view !== 'forgot' && (
                <div className="auth-tabs">
                  <div
                    className="auth-tab-slider"
                    style={{
                      left:  view === 'login' ? '4px' : 'calc(50%)',
                      width: 'calc(50% - 4px)',
                    }}
                  />
                  <button
                    className={`auth-tab-btn ${view === 'login' ? 'active' : ''}`}
                    onClick={() => switchView('login')}
                  >
                    Log In
                  </button>
                  <button
                    className={`auth-tab-btn ${view === 'signup' ? 'active' : ''}`}
                    onClick={() => switchView('signup')}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* ── Views ── */}
              <div className="auth-views">

                {/* Login */}
                <div className={`auth-view ${getViewClass('login')}`}>
                  <form
                    className={`auth-form ${shake && view === 'login' ? 'shake' : ''}`}
                    onSubmit={handleLogin}
                  >
                    {phase === 'error' && view === 'login' && (
                      <div className="auth-error">{errorMsg}</div>
                    )}

                    <div className="auth-field">
                      <input
                        type="text"
                        className="auth-input"
                        placeholder=" "
                        value={loginUser}
                        onChange={e => setLoginUser(e.target.value)}
                        autoComplete="username"
                        required
                      />
                      <label className="auth-label">Username or Email</label>
                    </div>

                    <div className="auth-field" style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        className="auth-input"
                        placeholder=" "
                        value={loginPass}
                        onChange={e => setLoginPass(e.target.value)}
                        autoComplete="current-password"
                        required
                        style={{ paddingRight: '58px' }}
                      />
                      <label className="auth-label">Password</label>
                      <button
                        type="button"
                        className="auth-pass-toggle"
                        onClick={() => setShowPass(p => !p)}
                      >
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    <div className="auth-forgot">
                      <button type="button" className="auth-link" onClick={() => switchView('forgot')}>
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      className={`auth-btn${isSuccess ? ' success-state' : ''}`}
                      disabled={isLoading || isSuccess}
                    >
                      {isLoading
                        ? <span className="auth-spinner" />
                        : isSuccess
                          ? '✓  Welcome back'
                          : 'Sign In'
                      }
                    </button>

                    <div className="auth-demo">
                      <button type="button" className="auth-demo-btn" onClick={fillDemo}>
                        Use demo credentials
                      </button>
                    </div>
                  </form>
                </div>

                {/* Sign Up */}
                <div className={`auth-view ${getViewClass('signup')}`}>
                  <form
                    className={`auth-form ${shake && view === 'signup' ? 'shake' : ''}`}
                    onSubmit={handleSignup}
                  >
                    {phase === 'error' && view === 'signup' && (
                      <div className="auth-error">{errorMsg}</div>
                    )}

                    <div className="auth-field">
                      <input
                        type="text"
                        className="auth-input"
                        placeholder=" "
                        value={signName}
                        onChange={e => setSignName(e.target.value)}
                        autoComplete="name"
                        required
                      />
                      <label className="auth-label">Full Name</label>
                    </div>

                    <div className="auth-field">
                      <input
                        type="email"
                        className="auth-input"
                        placeholder=" "
                        value={signEmail}
                        onChange={e => setSignEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                      <label className="auth-label">Email</label>
                    </div>

                    <div className="auth-field">
                      <input
                        type="password"
                        className="auth-input"
                        placeholder=" "
                        value={signPass}
                        onChange={e => setSignPass(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <label className="auth-label">Password</label>
                    </div>

                    <div className="auth-field">
                      <input
                        type="password"
                        className="auth-input"
                        placeholder=" "
                        value={signConfirm}
                        onChange={e => setSignConfirm(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <label className="auth-label">Confirm Password</label>
                    </div>

                    <button
                      type="submit"
                      className={`auth-btn${isSuccess ? ' success-state' : ''}`}
                      disabled={isLoading || isSuccess}
                    >
                      {isLoading
                        ? <span className="auth-spinner" />
                        : isSuccess
                          ? '✓  Account Created'
                          : 'Create Account'
                      }
                    </button>
                  </form>
                </div>

                {/* Forgot Password */}
                <div className={`auth-view ${getViewClass('forgot')}`}>
                  {forgotSent ? (
                    <div className="auth-sent-wrap">
                      <span className="auth-sent-icon">✉️</span>
                      <p className="auth-sent-text">
                        If that address is in our system, a reset link is on its way.
                        Check your inbox.
                      </p>
                      <button
                        type="button"
                        className="auth-btn"
                        onClick={() => { switchView('login'); setForgotSent(false); }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  ) : (
                    <form className="auth-form" onSubmit={handleForgot}>
                      <p className="auth-subtext">
                        Enter your email and we'll send a password reset link.
                      </p>

                      <div className="auth-field">
                        <input
                          type="email"
                          className="auth-input"
                          placeholder=" "
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                        <label className="auth-label">Email Address</label>
                      </div>

                      <button
                        type="submit"
                        className="auth-btn"
                        disabled={isLoading}
                      >
                        {isLoading ? <span className="auth-spinner" /> : 'Send Reset Link'}
                      </button>

                      <div className="auth-back">
                        <button type="button" className="auth-link" onClick={() => switchView('login')}>
                          ← Back to Sign In
                        </button>
                      </div>
                    </form>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
