import { useId, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { useBankDetails, useBankTransfer } from '../../../hooks/portal/usePortalPayments';
import { getCloudinaryConfig, uploadImage } from '../../../lib/cloudinary';
import { getErrorMessage } from '../../../lib/apiError';
import { formatWholeNaira } from '../../../lib/paymentTotals';
import { todayIso } from '../../../lib/format';
import { ErrorCard } from '../ui/primitives';
import { fieldControl, fieldError, fieldHint, fieldLabel, ghostButton, primaryButton, rowButton, statBox } from '../ui/styles';

/** Props for {@link BankTransferStep}. */
export interface BankTransferStepProps {
  childId: string;
  feeAssignmentIds: string[];
  amount: number;
  /** Goes back to the method choice. */
  onBack: () => void;
  /** Closes the checkout. */
  onDone: () => void;
}

/**
 * Bank transfer (C4): the school's account, then the parent records the
 * transfer they made: the bank's reference, the date and (optionally) a photo
 * of the receipt. It is then pending until the bursary confirms it; nothing is
 * marked paid here, and the balance does not move until then.
 *
 * @param props - See {@link BankTransferStepProps}.
 * @returns The step.
 */
export function BankTransferStep({ childId, feeAssignmentIds, amount, onBack, onDone }: BankTransferStepProps) {
  const details = useBankDetails(childId);
  const transfer = useBankTransfer();
  const submitting = useRef(false);
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(todayIso());
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ reference?: string; paidOn?: string; proof?: string }>({});
  const [copied, setCopied] = useState(false);
  const referenceRef = useRef<HTMLInputElement>(null);
  const ids = { reference: useId(), date: useId(), proof: useId() };
  const canUpload = Boolean(getCloudinaryConfig());

  if (transfer.isSuccess) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-tl-success-bg text-tl-success">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <h3 className="text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink">Transfer recorded · Pending</h3>
        <p className="text-sm leading-relaxed text-tl-muted">
          The bursary confirms bank transfers by hand, usually within one working day. Until then the payment shows as
          <strong className="text-tl-ink"> Pending</strong> in Payment history and the balance does not change. You will get a
          notification and a receipt once it is confirmed.
        </p>
        <div className={statBox}>
          <div className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">Your reference</div>
          <div className="mt-1 text-base font-extrabold text-tl-ink">{transfer.data.reference}</div>
        </div>
        <button type="button" className={primaryButton} onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!reference.trim()) found.reference = 'Enter the reference your bank gave the transfer.';
    if (!paidOn) found.paidOn = 'Enter the date you made the transfer.';
    else if (paidOn > todayIso()) found.paidOn = 'The date cannot be in the future.';
    setErrors(found);
    if (found.reference) {
      referenceRef.current?.focus();
      return;
    }
    if (found.paidOn || submitting.current || uploading) return;
    submitting.current = true;
    transfer.mutate(
      { childId, feeAssignmentIds, amount, transferReference: reference.trim(), paidOn, ...(proofUrl ? { proofUrl } : {}) },
      { onSettled: () => (submitting.current = false) },
    );
  };

  const attachProof = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setUploading(true);
    setErrors((current) => ({ ...current, proof: undefined }));
    try {
      setProofUrl(await uploadImage(file));
    } catch (error) {
      setErrors((current) => ({ ...current, proof: getErrorMessage(error, 'The photo could not be uploaded.') }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Record a bank transfer" className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-tl-muted">
        Transfer <strong className="text-tl-ink">{formatWholeNaira(amount)}</strong> to the school&apos;s account, then tell us the
        reference so the bursary can match it.
      </p>

      {details.isPending ? (
        <div role="status" aria-label="Loading the school's account" className="h-24 animate-pulse rounded-2xl bg-tl-track" />
      ) : details.isError ? (
        <ErrorCard error={details.error} title="The school's account couldn't be loaded" onRetry={() => void details.refetch()} />
      ) : (
        <dl className={`${statBox} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm`}>
          <dt className="font-bold text-tl-muted">Bank</dt>
          <dd className="font-extrabold text-tl-ink">{details.data.bank}</dd>
          <dt className="font-bold text-tl-muted">Account name</dt>
          <dd className="font-extrabold text-tl-ink">{details.data.name}</dd>
          <dt className="font-bold text-tl-muted">Account number</dt>
          <dd className="flex flex-wrap items-center gap-2 font-extrabold tracking-wide text-tl-ink">
            {details.data.number}
            <button
              type="button"
              className={`${rowButton} !min-h-[36px] gap-1.5`}
              onClick={() => {
                void navigator.clipboard?.writeText(details.data.number).then(() => setCopied(true), () => undefined);
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </dd>
        </dl>
      )}

      <div>
        <label htmlFor={ids.reference} className={fieldLabel}>
          Transfer reference
        </label>
        <input
          ref={referenceRef}
          id={ids.reference}
          className={fieldControl}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="e.g. FT26261XYZ01"
          aria-invalid={Boolean(errors.reference) || undefined}
          aria-describedby={errors.reference ? `${ids.reference}-error` : undefined}
          autoComplete="off"
        />
        {errors.reference ? (
          <p id={`${ids.reference}-error`} className={fieldError}>
            {errors.reference}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor={ids.date} className={fieldLabel}>
          Date you paid
        </label>
        <input
          id={ids.date}
          type="date"
          className={fieldControl}
          value={paidOn}
          max={todayIso()}
          onChange={(event) => setPaidOn(event.target.value)}
          aria-invalid={Boolean(errors.paidOn) || undefined}
          aria-describedby={errors.paidOn ? `${ids.date}-error` : undefined}
        />
        {errors.paidOn ? (
          <p id={`${ids.date}-error`} className={fieldError}>
            {errors.paidOn}
          </p>
        ) : null}
      </div>
      {canUpload ? (
        <div>
          <label htmlFor={ids.proof} className={fieldLabel}>
            Proof of payment (optional)
          </label>
          <input
            id={ids.proof}
            type="file"
            accept="image/*"
            className={`${fieldControl} py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-tl-select file:px-3 file:py-1.5 file:font-bold file:text-tl-brand`}
            onChange={(event) => void attachProof(event.target.files?.[0])}
            aria-describedby={`${ids.proof}-hint`}
          />
          <p id={`${ids.proof}-hint`} className={fieldHint}>
            {uploading ? 'Uploading…' : proofUrl ? 'Photo attached.' : 'A photo or screenshot of the bank receipt helps the bursary.'}
          </p>
          {errors.proof ? <p className={fieldError}>{errors.proof}</p> : null}
        </div>
      ) : null}

      {transfer.isError ? (
        <p role="alert" className="rounded-xl bg-tl-danger-bg px-4 py-3 text-sm font-semibold text-tl-danger">
          {getErrorMessage(transfer.error, 'The transfer could not be recorded. Please try again.')}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <button type="button" className={ghostButton} onClick={onBack} disabled={transfer.isPending}>
          Back
        </button>
        <button type="submit" className={`${primaryButton} flex-1`} disabled={transfer.isPending || uploading || details.isError}>
          {transfer.isPending ? 'Recording…' : 'I have made the transfer'}
        </button>
      </div>
    </form>
  );
}
