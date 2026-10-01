import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import logo from '../../assets/logo.svg';
import {
  SignInErrorBanner,
  SignInField,
  SignInFooter,
  SignInHeading,
  SignInLogoHeader,
  SignInPasswordField,
  SignInPrimaryButton,
  SignInShell,
  signInInlineLinkClass,
  signInLinkClass,
} from '../../Components/auth/signin-ui';
import { PasswordRules } from '../../Components/portal/PasswordRules';
import { requestPasswordReset, resetPassword, verifyResetCode } from '../../services/portal/account';
import { usePasswordPolicy } from '../../hooks/portal/useAccount';
import { meetsPolicy } from '../../lib/passwordPolicy';
import { getErrorMessage } from '../../lib/apiError';
import { SUPPORT_EMAIL } from '../../lib/support';
import { PARENT_PANEL, ParentIllustration } from './SignIn';

/** The steps of the reset. */
type Step = 'email' | 'code' | 'password' | 'done';

const COPY: Record<Step, { title: string; subtitle: string }> = {
  email: { title: 'Reset your password', subtitle: 'Enter the email address on your account and we will send you a 6-digit code.' },
  code: { title: 'Enter the code', subtitle: 'Type the 6-digit code from the email we just sent you.' },
  password: { title: 'Choose a new password', subtitle: 'Your new password must meet every rule below.' },
  done: { title: 'Password reset', subtitle: 'Your password has been changed. Sign in with your new password.' },
};

const STEP_INDEX: Record<Step, number> = { email: 1, code: 2, password: 3, done: 3 };

/**
 * Password reset for a parent who cannot sign in, in the shared sign-in look:
 * email, the emailed code (checked with the server before anything else), then
 * a new password checked against the server's policy. Every call is public
 * (no session). The reset signs out every device.
 *
 * @returns The forgot-password screen.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const policy = usePasswordPolicy(step === 'password');

  /**
   * Runs one step's request, showing its error in the banner.
   *
   * @param work - The request.
   * @param next - The step to move to on success.
   * @returns Resolves when done.
   */
  const run = async (work: () => Promise<unknown>, next: Step): Promise<void> => {
    setBusy(true);
    setBanner(null);
    try {
      await work();
      setStep(next);
      setFieldError(null);
    } catch (error) {
      setBanner(getErrorMessage(error, 'Something went wrong. Please try again.'));
      fieldRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setNotice(null);
    if (step === 'email') {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setFieldError('Enter the email address on your account.');
        fieldRef.current?.focus();
        return;
      }
      void run(() => requestPasswordReset(email), 'code');
    } else if (step === 'code') {
      if (!/^\d{6}$/.test(code)) {
        setFieldError('Enter the 6-digit code from your email.');
        fieldRef.current?.focus();
        return;
      }
      void run(() => verifyResetCode(email, code), 'password');
    } else if (step === 'password') {
      if (!meetsPolicy(password, policy.data)) {
        setFieldError("Your new password doesn't meet every rule yet.");
        fieldRef.current?.focus();
        return;
      }
      if (confirm !== password) {
        setFieldError(null);
        return;
      }
      void run(() => resetPassword(email, code, password), 'done');
    }
  };

  const back = (): void => {
    setBanner(null);
    setFieldError(null);
    if (step === 'code') setStep('email');
    else if (step === 'password') setStep('code');
    else navigate('/');
  };

  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <SignInShell illustration={<ParentIllustration />} panelTitle={PARENT_PANEL.title} panelText={PARENT_PANEL.text}>
      <SignInLogoHeader appName="Parents" logo={<img src={logo} alt="" className="h-10 w-10" />} />
      {step !== 'done' ? (
        <button type="button" onClick={back} className={`${signInLinkClass} -mt-4 mb-2 gap-2`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {step === 'email' ? 'Back to sign in' : step === 'code' ? 'Change email' : 'Back to the code'}
        </button>
      ) : null}
      <SignInHeading title={COPY[step].title} subtitle={COPY[step].subtitle} />
      {step !== 'done' ? (
        <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Step {STEP_INDEX[step]} of 3</p>
      ) : null}

      {banner ? (
        <SignInErrorBanner id="reset-alert" tone="neutral" className="mt-6">
          {banner}
        </SignInErrorBanner>
      ) : null}
      {notice ? (
        <p role="status" className="mt-6 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
          {notice}
        </p>
      ) : null}

      {step === 'done' ? (
        <div className="mt-8 space-y-6">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" aria-hidden="true" />
          <SignInPrimaryButton type="button" onClick={() => navigate('/')}>
            Sign in
          </SignInPrimaryButton>
        </div>
      ) : (
        <form onSubmit={submit} noValidate aria-label={COPY[step].title} className="mt-8 space-y-5">
          {step === 'email' ? (
            <SignInField
              ref={fieldRef}
              id="email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldError}
              describedBy={banner ? ['reset-alert'] : []}
              required
            />
          ) : null}
          {step === 'code' ? (
            <>
              <SignInField
                ref={fieldRef}
                id="code"
                label="6-digit code"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                hint={`We sent it to ${email}. Check your spam folder if it has not arrived.`}
                error={fieldError}
                describedBy={banner ? ['reset-alert'] : []}
                required
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void requestPasswordReset(email).then(
                    () => setNotice('A new code is on its way.'),
                    (error: unknown) => setBanner(getErrorMessage(error, 'The code could not be sent.')),
                  )
                }
                className={`${signInInlineLinkClass} inline-flex min-h-[44px] items-center text-sm`}
              >
                Send a new code
              </button>
            </>
          ) : null}
          {step === 'password' ? (
            <>
              <SignInPasswordField
                ref={fieldRef}
                id="newPassword"
                label="New password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={fieldError}
                describedBy={['newPassword-rules']}
                after={<PasswordRules id="newPassword-rules" password={password} policy={policy.data} />}
                required
              />
              <SignInPasswordField
                id="confirmPassword"
                label="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                error={mismatch ? 'The passwords do not match.' : null}
                required
              />
            </>
          ) : null}
          <SignInPrimaryButton loading={busy} loadingText={step === 'email' ? 'Sending code…' : step === 'code' ? 'Checking code…' : 'Resetting password…'}>
            {step === 'email' ? 'Send code' : step === 'code' ? 'Continue' : 'Reset password'}
          </SignInPrimaryButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
        Remembered it?{' '}
        <Link to="/" className={signInInlineLinkClass}>
          Sign in
        </Link>
      </p>
      <SignInFooter supportEmail={SUPPORT_EMAIL} />
    </SignInShell>
  );
}
