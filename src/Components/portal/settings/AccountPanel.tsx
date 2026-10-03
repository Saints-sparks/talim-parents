import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParentSettings, useSaveTheme } from '../../../hooks/useParentSettings';
import { useUpdateParentProfile } from '../../../hooks/portal/useAccount';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { useAuth } from '../../../services/auth.services';
import { sendPhoneChangeOtp, verifyPhoneChangeOtp, type ThemePreference } from '../../../services/settings.services';
import { useTheme } from '../../../contexts/ThemeContext';
import { isValidPhone, normalizePhone } from '../../../lib/accountRules';
import { ApiError, getErrorMessage } from '../../../lib/apiError';
import { queryKeys } from '../../../lib/queryKeys';
import { Sheet } from '../ui/Dialog';
import { ErrorCard, LoadingCard } from '../ui/primitives';
import { chip, fieldControl, fieldError, fieldHint, fieldLabel, ghostButton, primaryButton, rowButton, statBox } from '../ui/styles';
import { relationshipLine } from './relationships';

/**
 * The Account tab: the details the school holds for the parent (B13). Name,
 * occupation and address are edited here; the email is read-only; the phone
 * changes through an emailed code; the relationship comes from each child's
 * link. Also the theme.
 *
 * @returns The panel.
 */
export function AccountPanel() {
  const settings = useParentSettings();
  const { children } = useActiveChild();
  const save = useUpdateParentProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ fullName: '', occupation: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const ids = { name: useId(), occupation: useId(), address: useId() };
  const nameRef = useRef<HTMLInputElement>(null);
  const relationships = useMemo(() => relationshipLine(children), [children]);

  if (settings.isPending) return <LoadingCard rows={3} label="Loading your profile" />;
  if (settings.isError) return <ErrorCard error={settings.error} title="Your profile couldn't be loaded" onRetry={() => void settings.refetch()} />;
  const profile = settings.data.profile;

  const startEdit = (): void => {
    setDraft({ fullName: profile.fullName ?? '', occupation: profile.occupation ?? '', address: profile.address ?? '' });
    setEditing(true);
    setSaved(false);
    setError(null);
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!draft.fullName.trim()) {
      setError('Enter your full name.');
      nameRef.current?.focus();
      return;
    }
    const changes = {
      ...(draft.fullName.trim() !== profile.fullName ? { fullName: draft.fullName.trim() } : {}),
      ...(draft.occupation.trim() !== (profile.occupation ?? '') ? { occupation: draft.occupation.trim() } : {}),
      ...(draft.address.trim() !== (profile.address ?? '') ? { address: draft.address.trim() } : {}),
    };
    if (!Object.keys(changes).length) {
      setEditing(false);
      return;
    }
    save.mutate(changes, {
      onSuccess: () => {
        setEditing(false);
        setSaved(true);
      },
      onError: (cause) => setError(getErrorMessage(cause, 'Your changes could not be saved.')),
    });
  };

  const fields: [string, string][] = [
    ['Full name', profile.fullName || '—'],
    ['Relationship', relationships ?? 'Set by the school for each child'],
    ['Occupation', profile.occupation || 'Not set'],
    ['Email', profile.email],
    ['Phone', profile.phoneNumber || 'Not set'],
    ['Address', profile.address || 'Not set'],
  ];

  return (
    <div>
      {editing ? (
        <form onSubmit={submit} noValidate aria-label="Edit your profile" className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <div>
            <label htmlFor={ids.name} className={fieldLabel}>
              Full name
            </label>
            <input ref={nameRef} id={ids.name} className={fieldControl} value={draft.fullName} autoComplete="name" onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} />
          </div>
          <div>
            <label htmlFor={ids.occupation} className={fieldLabel}>
              Occupation
            </label>
            <input id={ids.occupation} className={fieldControl} value={draft.occupation} autoComplete="organization-title" onChange={(event) => setDraft({ ...draft, occupation: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={ids.address} className={fieldLabel}>
              Address
            </label>
            <input id={ids.address} className={fieldControl} value={draft.address} autoComplete="street-address" onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
          </div>
          <p className={`${fieldHint} sm:col-span-2`}>Your email is your sign-in and can only be changed by the school. Change your phone with a code instead.</p>
          {error ? (
            <p role="alert" className={`${fieldError} sm:col-span-2`}>
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2.5 sm:col-span-2">
            <button type="submit" className={primaryButton} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className={ghostButton} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
            {fields.map(([label, value]) => (
              <div key={label} className={statBox}>
                <dt className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{label}</dt>
                <dd className="mt-1.5 break-words text-[15px] font-bold text-tl-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" className={`${ghostButton} !border-tl-brand`} onClick={startEdit}>
              Edit profile
            </button>
            <button type="button" className={rowButton} onClick={() => setPhoneOpen(true)}>
              Change phone
            </button>
          </div>
          {saved ? (
            <p role="status" className="mt-3 text-sm font-bold text-tl-success">
              Your profile has been saved.
            </p>
          ) : null}
        </>
      )}
      <AppearanceRow />
      <ChangePhoneSheet open={phoneOpen} onClose={() => setPhoneOpen(false)} currentPhone={profile.phoneNumber} />
    </div>
  );
}

/**
 * Light, dark or the device's setting, kept on this device and on the account.
 *
 * @returns The row.
 */
function AppearanceRow() {
  const { theme, setTheme } = useTheme();
  const saveTheme = useSaveTheme();
  const choose = (next: ThemePreference): void => {
    setTheme(next);
    saveTheme.mutate(next);
  };
  return (
    <fieldset className="mt-6 border-t border-tl-line-soft pt-4">
      <legend className="sr-only">Appearance</legend>
      <div className="text-[15px] font-bold text-tl-ink" aria-hidden="true">
        Appearance
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(['light', 'dark', 'system'] as const).map((option) => (
          <button key={option} type="button" aria-pressed={theme === option} className={chip(theme === option)} onClick={() => choose(option)}>
            {option === 'system' ? 'Match this device' : option === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Changes the phone in two steps: a code goes to the account's email, then the
 * new number and the code are sent together.
 *
 * @param props - State and the current number.
 * @param props.open - Whether the sheet is open.
 * @param props.onClose - Closes it.
 * @param props.currentPhone - The number on file.
 * @returns The sheet.
 */
function ChangePhoneSheet({ open, onClose, currentPhone }: { open: boolean; onClose: () => void; currentPhone?: string }) {
  const { parentId, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ids = { phone: useId(), code: useId() };
  const phoneRef = useRef<HTMLInputElement>(null);

  const close = (): void => {
    setStep(1);
    setPhone('');
    setCode('');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (step === 1) {
      if (!isValidPhone(phone)) {
        setError('Enter a Nigerian mobile number, e.g. 08012345678 or +2348012345678.');
        return;
      }
      setBusy(true);
      try {
        await sendPhoneChangeOtp({ newPhoneNumber: normalizePhone(phone) });
        setStep(2);
      } catch (cause) {
        setError(getErrorMessage(cause, 'The code could not be sent.'));
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const next = normalizePhone(phone);
      await verifyPhoneChangeOtp({ newPhoneNumber: next, otp: code });
      updateUser({ phoneNumber: next });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.parent(parentId || 'anon') });
      close();
    } catch (cause) {
      setError(cause instanceof ApiError && cause.code === 'VALIDATION_FAILED' ? 'That code is wrong or has expired.' : getErrorMessage(cause, 'The code could not be checked.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} eyebrowText="Account" title="Change phone number" subtitle={`Current: ${currentPhone || 'not set'}`} initialFocus={phoneRef}>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor={ids.phone} className={fieldLabel}>
            New phone number
          </label>
          <input ref={phoneRef} id={ids.phone} type="tel" inputMode="tel" autoComplete="tel" className={fieldControl} value={phone} disabled={step === 2} onChange={(event) => setPhone(event.target.value)} placeholder="08012345678" />
          <p className={fieldHint}>A code will be sent to the email on your account.</p>
        </div>
        {step === 2 ? (
          <div>
            <label htmlFor={ids.code} className={fieldLabel}>
              6-digit code
            </label>
            <input id={ids.code} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={fieldControl} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className={fieldError}>
            {error}
          </p>
        ) : null}
        <div className="flex gap-2.5">
          <button type="button" className={ghostButton} onClick={close}>
            Cancel
          </button>
          <button type="submit" className={`${primaryButton} flex-1`} disabled={busy || (step === 1 ? !phone.trim() : code.length !== 6)}>
            {busy ? 'Please wait…' : step === 1 ? 'Send code' : 'Change number'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
