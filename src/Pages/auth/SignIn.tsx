import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import ModernLoader from '../../Components/ModernLoader';
import {
  SignInErrorBanner,
  SignInField,
  SignInFooter,
  SignInHeading,
  SignInLogoHeader,
  SignInOptionsRow,
  SignInPasswordField,
  SignInPrimaryButton,
  SignInShell,
  signInLinkClass,
  type SignInErrorTone,
} from '../../Components/auth/signin-ui';
import { useAuth } from '../../services/auth.services';
import { SUPPORT_EMAIL } from '../../lib/support';
import type { LoginOutcome } from '../../types/auth';

/** The banner a failed sign-in shows. */
interface Failure {
  tone: SignInErrorTone;
  title?: string;
  message: string;
}

/**
 * Turns a sign-in refusal into the banner's tone: red with a title for a
 * refused account, amber for wrong credentials, grey for anything else.
 *
 * @param outcome - What `login` returned.
 * @returns The banner, or `null` on success.
 */
export function failureOf(outcome: LoginOutcome): Failure | null {
  if (outcome.kind === 'success') return null;
  if (outcome.kind === 'access_denied') return { tone: 'danger', title: 'Access denied', message: outcome.message };
  if (outcome.kind === 'invalid_credentials') return { tone: 'warning', message: outcome.message };
  return { tone: 'neutral', message: outcome.message };
}

/** The panel and copy every signed-out page of this app shares. */
export const PARENT_PANEL = {
  title: 'Talim Parent Portal',
  text: "Stay connected with your child's school, track their progress, and manage leave requests.",
} as const;

/**
 * The illustration on the navy panel.
 *
 * @returns The image.
 */
export function ParentIllustration() {
  return <img src="/Par.svg" alt="" className="h-full w-full object-contain" />;
}

/**
 * The parent sign-in page, in the shared Talim sign-in look
 * (`Components/auth/signin-ui`, ported from Teachers): the "Parents" pill,
 * email and password, "Forgot password?", and the navy panel from `lg`.
 * A visitor who is already signed in goes straight on; an account still on
 * the school's temporary password goes to `/set-password` first.
 *
 * @returns The sign-in screen.
 */
export default function SignIn() {
  const navigate = useNavigate();
  const { login, loading, authToken, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Already signed in (a reload of `/`, or the back button): go on.
  useEffect(() => {
    if (authToken && user && !loading) navigate(user.mustChangePassword ? '/set-password' : '/dashboard', { replace: true });
  }, [authToken, user, loading, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFailure(null);
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (next.email) {
      emailRef.current?.focus();
      return;
    }
    if (next.password) {
      passwordRef.current?.focus();
      return;
    }

    const outcome = await login(email.trim(), password);
    if (outcome.kind === 'success') {
      navigate(outcome.mustChangePassword ? '/set-password' : '/dashboard');
      return;
    }
    setFailure(failureOf(outcome));
    if (outcome.kind === 'invalid_credentials') passwordRef.current?.focus();
  };

  const credentialsWrong = failure?.tone === 'warning';

  return (
    <SignInShell illustration={<ParentIllustration />} panelTitle={PARENT_PANEL.title} panelText={PARENT_PANEL.text}>
      <ModernLoader visible={loading} />
      <SignInLogoHeader appName="Parents" logo={<img src={logo} alt="" className="h-10 w-10" />} />
      <SignInHeading title="Welcome back" subtitle="Sign in to track your child's learning journey." />

      {failure ? (
        <SignInErrorBanner id="signin-alert" tone={failure.tone} title={failure.title} icon={failure.tone === 'danger' ? 'shield' : 'alert'} className="mt-6">
          {failure.message}
        </SignInErrorBanner>
      ) : null}

      <form onSubmit={(event) => void submit(event)} noValidate aria-label="Sign in" className="mt-8 space-y-5">
        <SignInField
          ref={emailRef}
          id="identifier"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email}
          invalid={credentialsWrong}
          describedBy={failure ? ['signin-alert'] : []}
          disabled={loading}
          required
        />
        <SignInPasswordField
          ref={passwordRef}
          id="password"
          name="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password}
          invalid={credentialsWrong}
          describedBy={failure ? ['signin-alert'] : []}
          disabled={loading}
          required
        />
        <SignInOptionsRow>
          <span />
          <Link to="/forgot-password" className={signInLinkClass}>
            Forgot password?
          </Link>
        </SignInOptionsRow>
        <SignInPrimaryButton loading={loading} loadingText="Signing in…">
          Sign in
        </SignInPrimaryButton>
      </form>

      <SignInFooter supportEmail={SUPPORT_EMAIL} />
    </SignInShell>
  );
}
