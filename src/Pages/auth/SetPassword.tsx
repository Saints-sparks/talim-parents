import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import {
  SignInErrorBanner,
  SignInFooter,
  SignInHeading,
  SignInLogoHeader,
  SignInPasswordField,
  SignInPrimaryButton,
  SignInShell,
} from '../../Components/auth/signin-ui';
import { PasswordRules } from '../../Components/portal/PasswordRules';
import { usePasswordPolicy } from '../../hooks/portal/useAccount';
import { useAuth } from '../../services/auth.services';
import { meetsPolicy } from '../../lib/passwordPolicy';
import { getErrorMessage } from '../../lib/apiError';
import { SUPPORT_EMAIL } from '../../lib/support';
import { PARENT_PANEL, ParentIllustration } from './SignIn';

/**
 * The first sign-in of an account the school created with a temporary
 * password: the parent replaces it before anything else, in the shared
 * sign-in look. The server rotates the session on the change, and the new
 * token is adopted (see `useAuth().changePassword`).
 *
 * @returns The set-password screen, or a redirect when there is nothing to set.
 */
export default function SetPassword() {
  const navigate = useNavigate();
  const { authToken, user, changePassword } = useAuth();
  const policy = usePasswordPolicy();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const currentRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);

  if (!authToken) return <Navigate to="/" replace />;
  if (user && !user.mustChangePassword) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = 'Enter the temporary password the school gave you.';
    if (!meetsPolicy(next, policy.data)) found.next = "Your new password doesn't meet every rule yet.";
    else if (next === current) found.next = 'Choose a password different from the temporary one.';
    setErrors(found);
    if (found.current) return currentRef.current?.focus();
    if (found.next) return nextRef.current?.focus();
    if (confirm !== next) return;

    setBusy(true);
    setBanner(null);
    try {
      await changePassword({ currentPassword: current, newPassword: next, confirmPassword: confirm });
      navigate('/onboarding', { replace: true });
    } catch (error) {
      setBanner(getErrorMessage(error, 'Your password could not be changed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const mismatch = confirm.length > 0 && confirm !== next;

  return (
    <SignInShell illustration={<ParentIllustration />} panelTitle={PARENT_PANEL.title} panelText={PARENT_PANEL.text}>
      <SignInLogoHeader appName="Parents" logo={<img src={logo} alt="" className="h-10 w-10" />} />
      <SignInHeading title="Set your password" subtitle="Replace the temporary password the school gave you with one only you know." />
      {banner ? (
        <SignInErrorBanner id="set-alert" tone="danger" className="mt-6">
          {banner}
        </SignInErrorBanner>
      ) : null}
      <form onSubmit={(event) => void submit(event)} noValidate aria-label="Set your password" className="mt-8 space-y-5">
        <SignInPasswordField
          ref={currentRef}
          id="currentPassword"
          label="Temporary password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          error={errors.current}
          required
        />
        <SignInPasswordField
          ref={nextRef}
          id="newPassword"
          label="New password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          error={errors.next}
          describedBy={['newPassword-rules']}
          after={<PasswordRules id="newPassword-rules" password={next} policy={policy.data} />}
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
        <SignInPrimaryButton loading={busy} loadingText="Saving…">
          Save and continue
        </SignInPrimaryButton>
      </form>
      <SignInFooter supportEmail={SUPPORT_EMAIL} />
    </SignInShell>
  );
}
