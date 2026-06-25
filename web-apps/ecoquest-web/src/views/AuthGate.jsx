import React, { useState } from 'react';
import { Leaf, Eye, EyeOff, Mail, Lock, User, Hash, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authForgotPassword, authResetPassword, verifyEmail } from '../api/ecoquestApi.js';

/* ─── Shared logo header ─────────────────────────────────────── */
function AuthLogo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 'var(--radius-xl)',
        background: 'var(--color-primary)',
        marginBottom: 'var(--space-4)',
        boxShadow: '0 4px 20px rgba(28,124,84,0.35)',
      }}>
        <img
          src="/logo.png"
          alt="EcoQuest Logo"
          style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
        />
        <span style={{ display: 'none', color: 'white' }}><Leaf size={32} /></span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>EcoQuest Campus</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Gamified Campus Sustainability</div>
    </div>
  );
}

/* ─── Input field with icon ─────────────────────────────────── */
function IconInput({ id, label, icon: Icon, type = 'text', value, onChange, placeholder, autoFocus, required }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-muted)', pointerEvents: 'none',
          display: 'flex', alignItems: 'center',
        }}>
          <Icon size={16} />
        </span>
        <input
          id={id}
          className="form-input"
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          style={{ paddingLeft: 38, paddingRight: isPassword ? 38 : undefined }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
            }}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Auth page shell ────────────────────────────────────────── */
function AuthCard({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background)',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: 'var(--space-8)',
        width: '100%',
        maxWidth: 420,
      }}>
        <AuthLogo />
        {children}
      </div>
    </div>
  );
}

/* ─── Error banner ───────────────────────────────────────────── */
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="async-banner warning" style={{ marginBottom: 'var(--space-4)' }}>
      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN FORM
═══════════════════════════════════════════════════════════════ */
function LoginForm({ onSwitch, onForgot }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('student@ecoquest.local');
  const [password, setPassword] = useState('EcoQuest@123');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setLoading(true); setError('');
    try {
      await login(email.trim(), password);
      // AuthProvider will update user state → App re-renders → Dashboard shown
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setError('Invalid email or password.');
      else setError('Login failed. Make sure the backend is running.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ErrorBanner message={error} />
      <IconInput
        id="login-email" label="Email" icon={Mail} type="email"
        value={email} onChange={e => setEmail(e.target.value)}
        placeholder="student@ecoquest.local" autoFocus required
      />
      <IconInput
        id="login-password" label="Password" icon={Lock} type="password"
        value={password} onChange={e => setPassword(e.target.value)}
        placeholder="EcoQuest@123" required
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8, marginBottom: 'var(--space-4)' }}>
        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 4px', fontSize: 12 }} onClick={onForgot}>
          Forgot password?
        </button>
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginBottom: 'var(--space-4)' }}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
        Don't have an account?{' '}
        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 2px', fontWeight: 600, color: 'var(--color-primary)' }} onClick={onSwitch}>
          Register
        </button>
      </p>
      <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-3)', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
        <strong>Demo accounts</strong> (password: EcoQuest@123)<br/>
        student@ecoquest.local · moderator@ecoquest.local · admin@ecoquest.local
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REGISTER FORM
═══════════════════════════════════════════════════════════════ */
function RegisterForm({ onSwitch }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', studentId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [verifiedMessage, setVerifiedMessage] = useState('');

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.displayName || !form.studentId) {
      setError('All fields are required.'); return;
    }
    setLoading(true); setError('');
    try {
      const resp = await register(form);
      setVerificationToken(resp?.verificationToken || '');
      setVerifiedMessage(resp?.message || 'Verification email generated. Verify before login.');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setError('Email or Student ID already registered.');
      else setError('Registration failed. Check your details and try again.');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!verificationToken) return;
    setLoading(true); setError('');
    try {
      await verifyEmail(verificationToken);
      setVerifiedMessage('Email verified. You can sign in now.');
    } catch {
      setError('Verification failed. Token may be invalid or expired.');
    } finally { setLoading(false); }
  };

  if (verifiedMessage) return (
    <div>
      <div className="async-banner success" style={{ marginBottom: 'var(--space-4)' }}>
        {verifiedMessage}
      </div>
      {verificationToken && (
        <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', fontSize: 12 }}>
          <strong>Local verification token:</strong> <code style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{verificationToken}</code>
        </div>
      )}
      <ErrorBanner message={error} />
      {verificationToken && <button type="button" className="btn btn-primary w-full" disabled={loading} onClick={handleVerify} style={{ marginBottom: 'var(--space-3)' }}>Verify Email</button>}
      <button type="button" className="btn btn-ghost w-full" onClick={onSwitch}>Back to Sign In</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <ErrorBanner message={error} />
      <IconInput id="reg-name" label="Display Name" icon={User} value={form.displayName} onChange={set('displayName')} placeholder="Nguyen Van A" autoFocus required />
      <IconInput id="reg-sid" label="Student ID" icon={Hash} value={form.studentId} onChange={set('studentId')} placeholder="SV002" required />
      <IconInput id="reg-email" label="Email" icon={Mail} type="email" value={form.email} onChange={set('email')} placeholder="student@ecoquest.local" required />
      <IconInput id="reg-password" label="Password" icon={Lock} type="password" value={form.password} onChange={set('password')} placeholder="EcoQuest@123" required />
      <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginBottom: 'var(--space-4)' }}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
        Already have an account?{' '}
        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 2px', fontWeight: 600, color: 'var(--color-primary)' }} onClick={onSwitch}>
          Sign In
        </button>
      </p>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORGOT PASSWORD FORM
═══════════════════════════════════════════════════════════════ */
function ForgotForm({ onBack, initialToken = '' }) {
  const [step, setStep]         = useState(initialToken ? 'reset' : 'request'); // request | reset
  const [email, setEmail]       = useState('');
  const [resetToken, setResetToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [demoToken, setDemoToken] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      const resp = await authForgotPassword(email.trim());
      if (resp.emailKnown) {
        setDemoToken(resp.resetToken || '');
        setResetToken(resp.resetToken || '');
        setStep('reset');
      } else {
        setError('Email not found in our system.');
      }
    } catch { setError('Could not reach server. Make sure backend is running.'); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) { setError('Both fields are required.'); return; }
    setLoading(true); setError('');
    try {
      const resp = await authResetPassword(resetToken.trim(), newPassword);
      setSuccess(resp.message || 'Password reset successfully. You can now log in.');
    } catch (err) {
      const status = err?.response?.status;
      setError(status === 400 ? 'Invalid or expired reset token.' : 'Reset failed. Try again.');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div>
      <div className="async-banner success" style={{ marginBottom: 'var(--space-4)' }}>
        ✓ {success}
      </div>
      <button className="btn btn-primary w-full" onClick={onBack}>Back to Sign In</button>
    </div>
  );

  if (step === 'reset') return (
    <form onSubmit={handleReset}>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Enter the reset token (shown for demo) and your new password.
      </p>
      {demoToken && (
        <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', fontSize: 12 }}>
          <strong>Demo token:</strong> <code style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{demoToken}</code>
        </div>
      )}
      <ErrorBanner message={error} />
      <div className="form-group">
        <label className="form-label" htmlFor="rst-token">Reset Token</label>
        <input id="rst-token" className="form-input" value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste token here" />
      </div>
      <IconInput id="rst-pw" label="New Password" icon={Lock} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="EcoQuest@456" required />
      <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginBottom: 'var(--space-3)' }}>
        {loading ? 'Resetting…' : 'Reset Password'}
      </button>
      <button type="button" className="btn btn-ghost w-full" onClick={() => setStep('request')}>← Back</button>
    </form>
  );

  return (
    <form onSubmit={handleRequest}>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Enter your registered email address to receive a password reset token.
      </p>
      <ErrorBanner message={error} />
      <IconInput id="forgot-email" label="Email" icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@ecoquest.local" autoFocus required />
      <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginBottom: 'var(--space-3)' }}>
        {loading ? 'Sending…' : 'Send Reset Token'}
      </button>
      <button type="button" className="btn btn-ghost w-full" onClick={onBack}>← Back to Sign In</button>
    </form>
  );
}

function VerifyEmailLink({ token, onBack }) {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Verifying your EcoQuest email...');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }
    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verified successfully. You can sign in now.');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Verification failed. The link may be invalid or expired.');
      });
  }, [token]);

  return (
    <div>
      <div className={`async-banner ${status === 'success' ? 'success' : status === 'error' ? 'warning' : 'info'}`} style={{ marginBottom: 'var(--space-4)' }}>
        {message}
      </div>
      <button className="btn btn-primary w-full" onClick={onBack}>Back to Sign In</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Auth Gate — manages which form to show
═══════════════════════════════════════════════════════════════ */
export default function AuthGate() {
  const route = new URL(window.location.href);
  const token = route.searchParams.get('token') || '';
  const initialView = route.pathname.includes('verify-email')
    ? 'verify'
    : route.pathname.includes('reset-password')
      ? 'forgot'
      : 'login';
  const [view, setView] = useState(initialView); // login | register | forgot | verify

  const backToLogin = () => {
    window.history.replaceState(null, '', window.location.origin + '/');
    setView('login');
  };

  return (
    <AuthCard>
      {view === 'login' && (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--space-5)', textAlign: 'center' }}>Sign In</h1>
          <LoginForm onSwitch={() => setView('register')} onForgot={() => setView('forgot')} />
        </>
      )}
      {view === 'register' && (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--space-5)', textAlign: 'center' }}>Create Account</h1>
          <RegisterForm onSwitch={() => setView('login')} />
        </>
      )}
      {view === 'forgot' && (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--space-5)', textAlign: 'center' }}>Reset Password</h1>
          <ForgotForm onBack={backToLogin} initialToken={route.pathname.includes('reset-password') ? token : ''} />
        </>
      )}
      {view === 'verify' && (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--space-5)', textAlign: 'center' }}>Verify Email</h1>
          <VerifyEmailLink token={token} onBack={backToLogin} />
        </>
      )}
    </AuthCard>
  );
}
