import { useState, type FormEvent } from 'react';
import { Phone } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../services/auth.services';
import { sendPhoneChangeOtp, verifyPhoneChangeOtp } from '../../services/settings.services';
import { ApiError, getErrorMessage } from '../../lib/apiError';
import { isValidPhone, normalizePhone } from '../../lib/accountRules';
import { queryKeys } from '../../lib/queryKeys';
import { toast } from '../CustomToast';
import { ModalShell } from './ModalShell';
import { Field, INPUT_CLASS, PRIMARY_BUTTON, SECONDARY_BUTTON } from './formControls';

/**
 * Changes the parent's phone number in two steps: a code is emailed to the
 * address on the account, then entered here with the new number.
 *
 * @param props - Component props.
 * @param props.currentPhone - The number on file, shown for reference.
 * @param props.onClose - Called after success or when dismissed.
 * @returns The dialog.
 */
export function ChangePhoneModal({ currentPhone, onClose }: { currentPhone?: string; onClose: () => void }) {
  const { parentId, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [otpError, setOtpError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const handleSend = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!isValidPhone(newPhone)) {
      setPhoneError('Enter a Nigerian mobile number, e.g. 08012345678 or +2348012345678.');
      return;
    }
    setPhoneError(undefined);
    setBusy(true);
    try {
      await sendPhoneChangeOtp({ newPhoneNumber: normalizePhone(newPhone) });
      toast.success('A code was sent to your registered email');
      setStep(2);
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'CONFLICT' || error.code === 'VALIDATION_FAILED')) {
        setPhoneError(error.message);
      } else {
        toast.error(getErrorMessage(error, 'Could not send the code.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      const phone = normalizePhone(newPhone);
      await verifyPhoneChangeOtp({ newPhoneNumber: phone, otp });
      updateUser({ phoneNumber: phone });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.parent(parentId || 'anon') });
      toast.success('Phone number updated successfully');
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        setOtpError('That code is wrong or has expired.');
      } else {
        toast.error(getErrorMessage(error, 'Could not verify the code.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Change Phone Number" onClose={onClose}>
      <div className="px-6 py-5">
        <div className="mb-4 flex gap-2" aria-hidden="true">
          {[1, 2].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step >= n ? 'bg-[#0A4EA3]' : 'bg-[#E5EAF2] dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {step === 1 ? (
          <form onSubmit={handleSend} noValidate className="space-y-4">
            <p className="text-sm text-[#667085] dark:text-slate-400">
              Current: <span className="font-semibold text-[#101828] dark:text-slate-100">{currentPhone || 'Not set'}</span>
            </p>
            <Field
              label="New Phone Number"
              htmlFor="new-phone"
              error={phoneError}
              hint="A code will be sent to your registered email."
            >
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" aria-hidden="true" />
                <input
                  id="new-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                  placeholder="08012345678"
                  className={`${INPUT_CLASS} pl-9`}
                />
              </div>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
                Cancel
              </button>
              <button type="submit" disabled={busy || !newPhone.trim()} className={PRIMARY_BUTTON}>
                {busy ? 'Sending...' : 'Send code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="rounded-lg bg-[#EEF6FF] p-3 text-sm text-[#0A4EA3] dark:bg-blue-950/40 dark:text-blue-300">
              We emailed you a 6-digit code. Enter it below to confirm {normalizePhone(newPhone)}.
            </div>
            <Field label="6-Digit Code" htmlFor="otp-input" error={otpError}>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtpError(undefined);
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                placeholder="Enter code"
                className={`${INPUT_CLASS} text-center text-lg font-bold tracking-widest`}
              />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setOtpError(undefined);
                }}
                className={SECONDARY_BUTTON}
              >
                Back
              </button>
              <button type="submit" disabled={busy || otp.length !== 6} className={PRIMARY_BUTTON}>
                {busy ? 'Verifying...' : 'Verify & Update'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}
