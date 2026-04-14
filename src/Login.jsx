import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './services/auth.services';
import logo from './assets/logo.svg';

// ── Inline SVG icons (no lucide-react dependency needed) ──────────────────────
const ShieldAlertIcon = () => (
  <svg className="h-5 w-5 shrink-0 text-red-600 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
);

const AlertCircleIcon = ({ className = "h-5 w-5 shrink-0 mt-0.5 text-amber-600" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left panel — Form ── */}
      <div className="flex flex-col justify-center items-center px-8 py-12 sm:px-16 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="Talim Logo" className="h-10 w-10" />
            <span className="text-xl font-bold text-[#030E18]">Talim</span>
            <span className="ml-0.5 rounded-full bg-[#EAF2FB] px-2.5 py-0.5 text-xs font-semibold text-[#003366]">
              Parents
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#030E18]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#6F6F6F]">
            Sign in to track your child's learning journey.
          </p>

          {/* RBAC / Access denied banner */}
          {loginError?.kind === 'access_denied' && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlertIcon />
                <div>
                  <p className="text-sm font-semibold text-red-700">Access denied</p>
                  <p className="mt-1 text-xs text-red-600 leading-relaxed">
                    {loginError.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Invalid credentials banner */}
          {loginError?.kind === 'invalid_credentials' && (
            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircleIcon />
                <p className="text-sm text-amber-700">
                  Incorrect email or password. Please double-check your credentials and try again.
                </p>
              </div>
            </div>
          )}

          {/* Unknown error banner */}
          {loginError?.kind === 'unknown' && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircleIcon className="h-5 w-5 shrink-0 mt-0.5 text-gray-500" />
                <p className="text-sm text-gray-600">{loginError.message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-[#030E18]">
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
                className="w-full h-10 px-3 border border-[#E5E7EB] bg-[#F9FAFB] rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366] transition-all disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-[#030E18]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-10 px-3 pr-10 border border-[#E5E7EB] bg-[#F9FAFB] rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366] transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#003366]"
                />
                Keep me signed in for easy access
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#003366] hover:bg-[#002244] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-gray-400">
            © Talim {new Date().getFullYear()} ·{' '}
            <a href="mailto:help@talim.com" className="hover:underline text-[#003366]">
              help@talim.com
            </a>
          </p>
        </div>
      </div>

      {/* ── Right panel — Blue brand panel ── */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#003366] p-12">
        <img
          src="/Par.svg"
          alt="Parent portal illustration"
          className="w-full max-w-md opacity-90"
        />
        <div className="mt-8 text-center">
          <p className="text-xl font-bold text-white">Talim Parent Portal</p>
          <p className="mt-2 text-sm text-white/70 max-w-xs leading-relaxed mx-auto">
            Stay connected with your child's school, track their progress, and manage leave requests.
          </p>
        </div>
        {/* Decorative dots (static indicator bar) */}
        <div className="mt-10 flex gap-2">
          <div className="h-2 w-8 rounded-full bg-white/60" />
          <div className="h-2 w-2 rounded-full bg-white/30" />
          <div className="h-2 w-2 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}

export default Login;
