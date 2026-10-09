import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRequestAccountDeletion } from '../../../hooks/portal/useAccount';
import { DELETION_REASON_MAX, deletionErrorMessage } from '../../../lib/accountDeletion';
import { DELETE_ACCOUNT_INFO_URL } from '../../../lib/support';
import { Sheet } from '../ui/Dialog';
import { dangerButton, dangerGhostButton, fieldControl, fieldError, fieldLabel, ghostButton, textLink } from '../ui/styles';

/** What deleting does, in the danger zone and in the sheet. */
const DELETION_SUMMARY =
  'Your account will be deleted in 30 days, and signing in before then cancels it. After that your name, email, phone number and photo are erased. Your children’s school keeps their grades, attendance and your payments, with your details removed.';

/**
 * Settings → Security → Danger zone: what deleting the account does, a link
 * to the full explanation on www.mytalim.com, and "Delete account", which
 * opens {@link DeleteAccountSheet}.
 *
 * @param props - The zone.
 * @param props.onDelete - Opens the delete sheet.
 * @returns The section.
 */
export function DangerZone({ onDelete }: { onDelete: () => void }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-4 rounded-[18px] border border-tl-danger/30 p-5">
      <h3 id={headingId} className="text-xs font-extrabold uppercase tracking-[0.07em] text-tl-danger">
        Danger zone
      </h3>
      <p className="mt-2 text-[15px] font-bold text-tl-ink">Delete account</p>
      <p className="mt-1 text-sm leading-[1.6] text-tl-muted">{DELETION_SUMMARY}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <a href={DELETE_ACCOUNT_INFO_URL} target="_blank" rel="noopener noreferrer" className={`${textLink} whitespace-normal`}>
          What happens when you delete your account
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button type="button" className={dangerGhostButton} onClick={onDelete}>
          Delete account
        </button>
      </div>
    </section>
  );
}

/**
 * The Delete account confirmation: the password (no show button, like
 * Change password here), an optional reason and an "I understand" box.
 * Delete stays disabled until the box is ticked and a password is typed. A
 * wrong password shows on the field; any other refusal shows in a banner.
 * On success `useRequestAccountDeletion` signs out and goes to sign-in with
 * the date. The portal's `Sheet` supplies the labelled heading, focus trap
 * and Escape.
 *
 * @param props - State.
 * @param props.open - Whether the sheet is open.
 * @param props.onClose - Closes it.
 * @returns The sheet.
 */
export function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const request = useRequestAccountDeletion();
  const { reset } = request;
  const ids = { password: useId(), reason: useId(), form: useId() };
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [fieldMessage, setFieldMessage] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setReason('');
    setUnderstood(false);
    setFieldMessage(null);
    setBannerMessage(null);
    reset();
  }, [open, reset]);

  const busy = request.isPending;
  const ready = understood && password.length > 0 && !busy;

  /**
   * Sends the request, or shows why it was refused.
   *
   * @param event - The form submit.
   */
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!ready) return;
    setFieldMessage(null);
    setBannerMessage(null);
    const trimmed = reason.trim();
    request.mutate(
      { password, ...(trimmed ? { reason: trimmed } : {}) },
      {
        onError: (error) => {
          const { field, banner } = deletionErrorMessage(error);
          setFieldMessage(field);
          setBannerMessage(banner);
          if (field) passwordRef.current?.focus();
        },
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      eyebrowText="Danger zone"
      title="Delete your account?"
      initialFocus={passwordRef}
      footer={
        <>
          <button type="button" className={ghostButton} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form={ids.form} className={`${dangerButton} flex-1`} disabled={!ready}>
            {busy ? 'Deleting…' : 'Delete account'}
          </button>
        </>
      }
    >
      <form id={ids.form} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-sm leading-[1.7] text-tl-body">You’ll be signed out on every device now. {DELETION_SUMMARY}</p>
        {bannerMessage ? (
          <p role="alert" className="rounded-[14px] bg-tl-danger-bg px-4 py-3 text-sm font-semibold text-tl-danger">
            {bannerMessage}
          </p>
        ) : null}
        <div>
          <label htmlFor={ids.password} className={fieldLabel}>
            Password
          </label>
          <input
            ref={passwordRef}
            id={ids.password}
            type="password"
            className={fieldControl}
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldMessage(null);
            }}
            aria-invalid={Boolean(fieldMessage) || undefined}
            aria-describedby={fieldMessage ? `${ids.password}-error` : undefined}
          />
          {fieldMessage ? (
            <p id={`${ids.password}-error`} role="alert" className={fieldError}>
              {fieldMessage}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={ids.reason} className={fieldLabel}>
            Why are you leaving? (optional)
          </label>
          <textarea
            id={ids.reason}
            value={reason}
            maxLength={DELETION_REASON_MAX}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
            className={`${fieldControl} min-h-[88px] resize-y py-3 text-sm leading-[1.6]`}
          />
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm leading-[1.6] text-tl-body">
          <input
            type="checkbox"
            checked={understood}
            disabled={busy}
            onChange={(event) => setUnderstood(event.target.checked)}
            className="mt-[3px] h-5 w-5 shrink-0 accent-tl-danger"
          />
          <span>I understand my account will be deleted in 30 days unless I sign in before then.</span>
        </label>
      </form>
    </Sheet>
  );
}
