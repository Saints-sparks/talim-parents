import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './services/auth.services';
import logo from './assets/logo.svg';
import ModernLoader from './Components/ModernLoader';
import { EyeIcon, EyeOffIcon, SpinnerIcon } from './Components/auth/AuthIcons';
import LoginErrorBanner, { type LoginFailure } from './Components/auth/LoginErrorBanner';
import { SUPPORT_EMAIL, mailtoHref } from './lib/support';

const inputClass =
  'w-full h-10 px-3 border border-[#E5E7EB] bg-[#F9FAFB] rounded-lg text-sm text-gray-900 placeholder-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366] transition-all disabled:opacity-60 ' +
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 ' +
  'dark:focus:border-blue-400 dark:focus:ring-blue-400/30';

const labelClass = 'block text-sm font-medium text-[#030E18] dark:text-slate-100';

/**
 * The parent sign-in page.
 *
 * @returns The two-panel sign-in screen.
 */
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<LoginFailure | null>(null);
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoginError(null);

    if (!email || !password) {
      setLoginError({ kind: 'unknown', message: 'Please enter both your email address and password.' });
      return;
    }

    const result = await login(email, password);

    if (result.kind === 'success') {
      navigate('/dashboard');
    } else {
      setLoginError(result);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <ModernLoader visible={loading} />

      {/* ── Left panel — Form ── */}
      <div className="flex flex-col justify-center items-center px-6 py-12 sm:px-16 bg-white dark:bg-[#0f1629]">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="Talim Logo" className="h-10 w-10" />
            <span className="text-xl font-bold text-[#030E18] dark:text-slate-100">Talim</span>
            <span className="ml-0.5 rounded-full bg-[#EAF2FB] px-2.5 py-0.5 text-xs font-semibold text-[#003366] dark:bg-[#1e2d47] dark:text-blue-300">
              Parents
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#030E18] dark:text-slate-100">Welcome back</h1>
          <p className="mt-1 text-sm text-[#6F6F6F] dark:text-slate-400">
            Sign in to track your child&apos;s learning journey.
          </p>

          {loginError && <LoginErrorBanner error={loginError} />}

          <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className={labelClass}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#003366] hover:bg-[#002244] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-500"
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

          <p className="mt-10 text-center text-xs text-gray-400 dark:text-slate-500">
            © Talim {new Date().getFullYear()} ·{' '}
            <a href={mailtoHref()} className="text-[#003366] hover:underline dark:text-blue-300">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>

      {/* ── Right panel — Blue brand panel ── */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#003366] p-12 dark:bg-[#0a2647]">
        <img src="/Par.svg" alt="Parent portal illustration" className="w-full max-w-md opacity-90" />
        <div className="mt-8 text-center">
          <p className="text-xl font-bold text-white">Talim Parent Portal</p>
          <p className="mt-2 text-sm text-white/70 max-w-xs leading-relaxed mx-auto">
            Stay connected with your child&apos;s school, track their progress, and manage leave requests.
          </p>
        </div>
        {/* Decorative dots (static indicator bar) */}
        <div className="mt-10 flex gap-2" aria-hidden="true">
          <div className="h-2 w-8 rounded-full bg-white/60" />
          <div className="h-2 w-2 rounded-full bg-white/30" />
          <div className="h-2 w-2 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}

export default Login;
