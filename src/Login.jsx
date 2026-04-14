import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './services/auth.services';
import logo from './assets/logo.svg';

const ShieldAlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-600 mt-0.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
  </svg>
);

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);

    if (!email || !password) {
      setLoginError({ kind: 'unknown', message: 'Please enter both your email address and password.' });
      return;
    }

    const result = await login(email, password);

    if (result?.kind === 'success') {
      navigate('/dashboard');
    } else if (result) {
      setLoginError(result);
    }
  };

  return (
    <div className="min-h-screen" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* ── Left panel — Form ── */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 4rem', backgroundColor: '#ffffff' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
            <img src={logo} alt="Talim Logo" style={{ height: '40px', width: '40px' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#030E18' }}>Talim</span>
            <span style={{ marginLeft: '2px', borderRadius: '9999px', backgroundColor: '#EAF2FB', padding: '2px 10px', fontSize: '0.75rem', fontWeight: '600', color: '#003366' }}>
              Parents
            </span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#030E18', margin: 0 }}>Welcome back</h1>
          <p style={{ marginTop: '4px', fontSize: '0.875rem', color: '#6F6F6F' }}>
            Sign in to track your child's learning journey.
          </p>

          {/* RBAC / Access denied banner */}
          {loginError?.kind === 'access_denied' && (
            <div style={{ marginTop: '1.25rem', borderRadius: '12px', border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <ShieldAlertIcon />
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#B91C1C', margin: 0 }}>Access denied</p>
                  <p style={{ marginTop: '4px', fontSize: '0.75rem', color: '#DC2626', lineHeight: '1.5', margin: '4px 0 0' }}>
                    {loginError.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Invalid credentials banner */}
          {loginError?.kind === 'invalid_credentials' && (
            <div style={{ marginTop: '1.25rem', borderRadius: '12px', border: '1px solid #FEF3C7', backgroundColor: '#FFFBEB', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertCircleIcon style={{ color: '#D97706' }} />
                <p style={{ fontSize: '0.875rem', color: '#92400E', margin: 0 }}>
                  Incorrect email or password. Please double-check your credentials and try again.
                </p>
              </div>
            </div>
          )}

          {/* Unknown error banner */}
          {loginError?.kind === 'unknown' && (
            <div style={{ marginTop: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertCircleIcon style={{ color: '#6B7280' }} />
                <p style={{ fontSize: '0.875rem', color: '#4B5563', margin: 0 }}>{loginError.message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#030E18' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  border: '1px solid #E5E7EB', borderRadius: '8px',
                  backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#111827',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#003366'; e.target.style.boxShadow = '0 0 0 3px rgba(0,51,102,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="password" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#030E18' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{
                    width: '100%', height: '40px', padding: '0 40px 0 12px',
                    border: '1px solid #E5E7EB', borderRadius: '8px',
                    backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#111827',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#003366'; e.target.style.boxShadow = '0 0 0 3px rgba(0,51,102,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#4B5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#003366' }}
                />
                Keep me signed in for easy access
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '44px',
                backgroundColor: loading ? '#6B9DC2' : '#003366',
                color: '#ffffff', border: 'none', borderRadius: '8px',
                fontSize: '0.875rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#002244'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#003366'; }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#9CA3AF' }}>
            © Talim {new Date().getFullYear()} ·{' '}
            <a href="mailto:help@talim.com" style={{ color: '#003366', textDecoration: 'none' }}>
              help@talim.com
            </a>
          </p>
        </div>
      </div>

      {/* ── Right panel — Blue brand panel ── */}
      <div style={{
        backgroundColor: '#003366',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem',
      }}
        className="hidden md:flex"
      >
        <img
          src="/Par.svg"
          alt="Parent portal illustration"
          style={{ width: '100%', maxWidth: '400px', opacity: 0.9 }}
        />
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Talim Parent Portal
          </p>
          <p style={{ marginTop: '8px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', maxWidth: '280px', lineHeight: '1.6', margin: '8px auto 0' }}>
            Stay connected with your child's school, track progress, and manage leave requests.
          </p>
        </div>
        {/* Decorative dots */}
        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '8px' }}>
          <div style={{ height: '8px', width: '32px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.6)' }} />
          <div style={{ height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <div style={{ height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </div>
      </div>
    </div>
  );
}

export default Login;
