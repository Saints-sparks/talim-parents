import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useChildProviders, useCheckout } from '../../../hooks/portal/usePortalPayments';
import { checkPayment, formatWholeNaira } from '../../../lib/paymentTotals';
import { getErrorMessage } from '../../../lib/apiError';
import { Sheet } from '../ui/Dialog';
import { fieldControl, fieldError, fieldHint, optionCard, primaryButton } from '../ui/styles';
import { BankTransferStep } from './BankTransferStep';
import { payMethods } from './methods';
import type { FeeItem, PreferredMethod } from '../../../types/portal/payments';

/** Props for {@link CheckoutDialog}. */
export interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  child: { id: string; name: string; schoolName: string };
  /** The fee items being paid (one, the selected ones, or all due). */
  items: FeeItem[];
  /** The school's minimum part payment, when the API gives it. */
  minimumPartPayment?: number | null;
  /** The parent's preferred method (C7), offered first. */
  preferred?: PreferredMethod | null;
}

/**
 * The design's checkout: the lines and the balance due; pay in full or part
 * (with the school's minimum and "₦X will stay outstanding"); the ways to pay
 * at the child's school. A provider is a hosted checkout (no card form here),
 * started through {@link useCheckout} with its double-submit guard and one
 * idempotency key per attempt; bank transfer moves to {@link BankTransferStep}.
 *
 * @param props - See {@link CheckoutDialogProps}.
 * @returns The dialog.
 */
export function CheckoutDialog({ open, onClose, child, items, minimumPartPayment, preferred }: CheckoutDialogProps) {
  const providers = useChildProviders(open ? child.id : undefined);
  const checkout = useCheckout();
  const { reset } = checkout;
  const [mode, setMode] = useState<'full' | 'part'>('full');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PreferredMethod | null>(null);
  const [step, setStep] = useState<'form' | 'bank'>('form');
  const [touched, setTouched] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const amountId = useId();

  const methods = useMemo(() => payMethods(providers.data ?? [], preferred), [providers.data, preferred]);
  const check = useMemo(() => checkPayment(items, mode, amount, minimumPartPayment), [items, mode, amount, minimumPartPayment]);
  const chosen = method ?? methods[0]?.id ?? null;
  const itemsKey = items.map((item) => item.id).join(',');

  // Each opening (or a new set of fees) is a new attempt: a new idempotency key.
  useEffect(() => {
    if (!open) return;
    reset();
    setMode('full');
    setAmount('');
    setMethod(null);
    setStep('form');
    setTouched(false);
  }, [open, itemsKey, reset]);

  const title = items.length > 1 ? `${items.length} fees` : (items[0]?.label ?? 'Fees');
  const showAmountError = mode === 'part' && touched && check.error !== null;

  const pay = (): void => {
    setTouched(true);
    if (!check.ok || !chosen) {
      if (mode === 'part') amountRef.current?.focus();
      return;
    }
    if (chosen === 'bank_transfer') {
      setStep('bank');
      return;
    }
    void checkout.start({
      childId: child.id,
      feeAssignmentIds: items.map((item) => item.id),
      ...(check.partial ? { amount: check.amount } : {}),
      provider: chosen,
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="checkout"
      eyebrowText={step === 'bank' ? 'Bank transfer' : 'Checkout'}
      title={title}
      subtitle={`${child.name} · ${child.schoolName}`}
    >
      {step === 'bank' ? (
        <BankTransferStep
          childId={child.id}
          feeAssignmentIds={items.map((item) => item.id)}
          amount={check.amount}
          onBack={() => setStep('form')}
          onDone={onClose}
        />
      ) : (
        <>
          <div className="rounded-2xl border border-tl-line-soft px-4 py-1.5">
            <ul>
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 border-b border-tl-line-soft py-3 text-sm">
                  <span className="flex-1 text-tl-muted">{item.label}</span>
                  <span className="font-bold text-tl-ink">{formatWholeNaira(item.balance)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 py-3.5 text-[15px] font-extrabold text-tl-ink">
              <span className="flex-1">Balance due</span>
              <span>{formatWholeNaira(check.total)}</span>
            </div>
          </div>

          <fieldset>
            <legend className="text-[13px] font-extrabold text-tl-muted">How much would you like to pay?</legend>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              <button type="button" aria-pressed={mode === 'full'} onClick={() => setMode('full')} className={`${optionCard(mode === 'full')} min-w-[140px] flex-1`}>
                <span className="block text-sm font-extrabold text-tl-ink">Pay in full</span>
                <span className="mt-[3px] block text-[13px] text-tl-muted">{formatWholeNaira(check.total)}</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === 'part'}
                disabled={!check.partAllowed}
                onClick={() => {
                  setMode('part');
                  setTimeout(() => amountRef.current?.focus(), 0);
                }}
                className={`${optionCard(mode === 'part')} min-w-[140px] flex-1 disabled:cursor-not-allowed disabled:opacity-55`}
              >
                <span className="block text-sm font-extrabold text-tl-ink">Part payment</span>
                <span className="mt-[3px] block text-[13px] text-tl-muted">
                  {check.partAllowed ? 'Pay what you can now' : 'Not allowed on these fees'}
                </span>
              </button>
            </div>
            {!check.partAllowed && items.length > 0 ? (
              <p className={fieldHint}>The school asks for {items.filter((item) => !item.allowPartial).map((item) => item.label).join(', ')} to be paid in full.</p>
            ) : null}
          </fieldset>

          {mode === 'part' ? (
            <div>
              <label htmlFor={amountId} className="sr-only">
                Amount to pay now, in naira
              </label>
              <input
                ref={amountRef}
                id={amountId}
                inputMode="numeric"
                className={fieldControl}
                placeholder="Enter amount in naira"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={showAmountError || undefined}
                aria-describedby={`${amountId}-hint${showAmountError ? ` ${amountId}-error` : ''}`}
              />
              <p id={`${amountId}-hint`} className={fieldHint}>
                {check.minimum !== null ? `Part payment · minimum ${formatWholeNaira(check.minimum)}` : 'Part payment · the school sets the minimum'}
              </p>
              {showAmountError ? (
                <p id={`${amountId}-error`} className={fieldError}>
                  {check.error}
                </p>
              ) : null}
            </div>
          ) : null}

          <fieldset>
            <legend className="text-[13px] font-extrabold text-tl-muted">Pay with</legend>
            {providers.isPending ? (
              <div role="status" aria-label="Loading payment methods" className="mt-2.5 h-24 animate-pulse rounded-2xl bg-tl-track" />
            ) : (
              <div className="mt-2.5 flex flex-col gap-2" role="radiogroup" aria-label="Pay with">
                {methods.map((entry) => {
                  const on = chosen === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMethod(entry.id)}
                      className={`${optionCard(on)} flex min-h-[44px] items-center gap-3`}
                    >
                      <span aria-hidden="true" className={`h-[18px] w-[18px] shrink-0 rounded-full ${on ? 'border-[6px] border-tl-brand' : 'border-2 border-tl-faint'}`} />
                      <span className="min-w-0">
                        <span className="block text-[15px] font-bold text-tl-ink">
                          {entry.name}
                          {entry.testMode ? <span className="ml-2 text-xs font-bold text-tl-warning">Test mode</span> : null}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-tl-muted">{entry.desc}</span>
                      </span>
                    </button>
                  );
                })}
                {providers.isError ? (
                  <p className={fieldHint}>Online payment options couldn&apos;t be loaded; bank transfer still works.</p>
                ) : null}
              </div>
            )}
          </fieldset>

          <p className="text-[13px] leading-relaxed text-tl-muted" aria-live="polite">
            {check.ok && check.partial
              ? `${formatWholeNaira(check.remaining)} will stay outstanding after this payment.`
              : 'This clears the selected fees in full.'}
          </p>

          {checkout.error ? (
            <p role="alert" className="rounded-xl bg-tl-danger-bg px-4 py-3 text-sm font-semibold text-tl-danger">
              {getErrorMessage(checkout.error, "We couldn't start this payment. Nothing has been charged — please try again.")}
            </p>
          ) : null}

          <button type="button" onClick={pay} disabled={checkout.submitting || !chosen} className={`${primaryButton} min-h-[50px] w-full text-[15px]`}>
            {checkout.submitting
              ? 'Opening the payment page…'
              : chosen === 'bank_transfer'
                ? `Pay ${formatWholeNaira(check.amount)} by bank transfer`
                : `Pay ${formatWholeNaira(check.amount)}`}
          </button>
          {chosen && chosen !== 'bank_transfer' ? (
            <p className="text-center text-xs text-tl-faint">You will finish on the payment provider&apos;s secure page. Talim never sees your card.</p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
