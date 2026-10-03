import { useId, useRef, useState, type FormEvent } from 'react';
import { usePasswordPolicy, useRevokeSessions, useSessions } from '../../../hooks/portal/useAccount';
import { useAuth } from '../../../services/auth.services';
import { meetsPolicy } from '../../../lib/passwordPolicy';
import { ApiError, getErrorMessage } from '../../../lib/apiError';
import { relativeDay } from '../../../lib/format';
import { PasswordRules } from '../PasswordRules';
import { Sheet } from '../ui/Dialog';
import { ErrorCard, Pill } from '../ui/primitives';
import { dangerGhostButton, fieldControl, fieldError, fieldLabel, ghostButton, primaryButton } from '../ui/styles';
import { LinkRow } from './rows';

/**
 * The Security tab: change password (checked against the server's policy)
 * and the devices signed in, with sign out per device and for every other
 * device (§34). There is no two-step sign-in switch.
 *
 * @returns The panel.
 */
export function SecurityPanel() {
  const sessions = useSessions();
  const revoke = useRevokeSessions();
  const { logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const others = sessions.data?.filter((session) => !session.current).length ?? 0;

  return (
    <div className="mt-[18px]">
      <LinkRow label="Change password" description="Update your account password." onOpen={() => setPasswordOpen(true)} />
      <section className="border-t border-tl-line-soft py-4" aria-labelledby="sessions-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="sessions-title" className="text-[15px] font-bold text-tl-ink">
              Where you are signed in
            </h3>
            <p className="mt-[3px] text-sm text-tl-muted">Sign out a device you do not recognise.</p>
          </div>
          {others > 0 ? (
            <button type="button" className={dangerGhostButton} disabled={revoke.others.isPending} onClick={() => revoke.others.mutate()}>
              {revoke.others.isPending ? 'Signing out…' : 'Sign out other devices'}
            </button>
          ) : null}
        </div>
        {sessions.isPending ? <div role="status" aria-label="Loading sessions" className="mt-3 h-16 animate-pulse rounded-2xl bg-tl-track" /> : null}
        {sessions.isError ? <div className="mt-3"><ErrorCard error={sessions.error} title="Sessions couldn't be loaded" onRetry={() => void sessions.refetch()} /></div> : null}
        <ul className="mt-3 flex flex-col gap-2">
          {(sessions.data ?? []).map((session) => (
            <li key={session.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-tl-line-soft px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-tl-ink">
                  {[session.device, session.browser].filter(Boolean).join(' · ') || 'Unknown device'}
                  {session.current ? <Pill tone="success" className="ml-2 !py-0.5 !text-xs">This device</Pill> : null}
                </div>
                <div className="mt-0.5 text-xs text-tl-muted">
                  {[session.os, session.ip, `last active ${relativeDay(session.lastUsedAt).toLowerCase()}`].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button
                type="button"
                className={dangerGhostButton}
                disabled={revoke.one.isPending}
                onClick={() =>
                  revoke.one.mutate(session.id, {
                    onSuccess: (result) => {
                      if (result.current) void logout();
                    },
                  })
                }
                aria-label={session.current ? 'Sign out of this device' : `Sign out ${session.device ?? 'this device'}`}
              >
                Sign out
              </button>
            </li>
          ))}
        </ul>
        {revoke.one.isError || revoke.others.isError ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-tl-danger">
            {getErrorMessage(revoke.one.error ?? revoke.others.error, 'That device could not be signed out.')}
          </p>
        ) : null}
      </section>
      <ChangePasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

/**
 * Changes the password: the current one, a new one that meets the server's
 * policy (§34), and its confirmation. The session is rotated and kept.
 *
 * @param props - State.
 * @param props.open - Whether the sheet is open.
 * @param props.onClose - Closes it.
 * @returns The sheet.
 */
function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword } = useAuth();
  const policy = usePasswordPolicy(open);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ids = { current: useId(), next: useId(), confirm: useId(), rules: useId() };
  const currentRef = useRef<HTMLInputElement>(null);

  const close = (): void => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setErrors({});
    setDone(false);
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = 'Enter your current password.';
    if (!meetsPolicy(next, policy.data)) found.next = "Your new password doesn't meet every rule yet.";
    else if (next === current) found.next = 'Choose a password you have not used just now.';
    if (confirm !== next) found.confirm = 'The passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next, confirmPassword: confirm });
      setDone(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setErrors({ current: 'Your current password is not right.' });
      else setErrors({ form: getErrorMessage(cause, 'Your password could not be changed.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} eyebrowText="Security" title={done ? 'Password changed' : 'Change password'} initialFocus={currentRef}>
      {done ? (
        <div role="status" className="flex flex-col gap-4">
          <p className="text-sm text-tl-muted">Your password has been changed and you are still signed in on this device.</p>
          <button type="button" className={primaryButton} onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
          {(
            [
              ['current', 'Current password', current, setCurrent, 'current-password'],
              ['next', 'New password', next, setNext, 'new-password'],
              ['confirm', 'Confirm new password', confirm, setConfirm, 'new-password'],
            ] as const
          ).map(([key, label, value, setValue, autoComplete]) => (
            <div key={key}>
              <label htmlFor={ids[key]} className={fieldLabel}>
                {label}
              </label>
              <input
                ref={key === 'current' ? currentRef : undefined}
                id={ids[key]}
                type="password"
                className={fieldControl}
                autoComplete={autoComplete}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={Boolean(errors[key]) || undefined}
                aria-describedby={[errors[key] ? `${ids[key]}-error` : null, key === 'next' ? ids.rules : null].filter(Boolean).join(' ') || undefined}
              />
              {errors[key] ? (
                <p id={`${ids[key]}-error`} className={fieldError}>
                  {errors[key]}
                </p>
              ) : null}
              {key === 'next' ? <PasswordRules id={ids.rules} password={next} policy={policy.data} /> : null}
            </div>
          ))}
          {errors.form ? (
            <p role="alert" className={fieldError}>
              {errors.form}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <button type="button" className={ghostButton} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={`${primaryButton} flex-1`} disabled={busy}>
              {busy ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
