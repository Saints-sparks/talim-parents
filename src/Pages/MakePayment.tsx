import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useActiveChild } from '../hooks/useActiveChild';
import { useVerifyPayment } from '../hooks/usePayments';
import { useCheckout, useFamilyFees } from '../hooks/portal/usePortalPayments';
import { SelectFeesStep, type FeeSelection } from '../Components/payments/SelectFeesStep';
import { ChooseProviderStep } from '../Components/payments/ChooseProviderStep';
import { ReviewStep } from '../Components/payments/ReviewStep';
import { PaymentResult, type VerifyOutcome } from '../Components/payments/PaymentResult';
import { STEP_LABELS, StepIndicator, TOTAL_STEPS } from '../Components/payments/StepIndicator';
import { logger } from '../lib/logger';
import type { PaymentProviderName, Receipt } from '../types/payments';

/** Router state the Payments page can hand this one. */
interface MakePaymentRouteState {
  studentId?: string;
  feeAssignmentIds?: string[];
}

/** What the verify step concluded, plus what it learned. */
interface VerifyState {
  outcome: VerifyOutcome;
  reference: string;
  amount?: number;
  receipt?: Receipt | null;
  failureReason?: string;
  error?: unknown;
}

/**
 * The payment flow: select fees (in full or in part), choose a provider,
 * review, then hand off to the provider's hosted checkout. The provider
 * redirects back to `/payments/verify?reference=…` (or `trxref`), which this
 * same page picks up and verifies once. The Payments page's checkout dialog
 * starts the same guarded checkout ({@link useCheckout}).
 *
 * @returns The page.
 */
export default function MakePayment() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: MakePaymentRouteState | null };
  const [searchParams] = useSearchParams();
  const { child: activeChild } = useActiveChild();

  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<FeeSelection>({ items: [] });
  const [provider, setProvider] = useState<PaymentProviderName | null>(null);
  const [verify, setVerify] = useState<VerifyState | null>(null);

  const verifyPayment = useVerifyPayment();
  const family = useFamilyFees();

  // The double-submit guard and the per-attempt idempotency key live in
  // useCheckout: a ref set the instant a checkout redirect is committed to
  // (`mutation.isPending` alone flips back before the browser navigates),
  // and one key reused by every retry of the same attempt.
  const checkout = useCheckout();

  const studentId = state?.studentId ?? activeChild?.id;
  const studentName = activeChild?.name || 'your child';
  const bill = useMemo(() => family.data?.children.find((entry) => entry.child.id === studentId), [family.data, studentId]);
  const owed = useMemo(() => bill?.items.filter((item) => item.balance > 0), [bill]);

  const runVerification = useCallback(
    async (reference: string) => {
      setVerify({ outcome: 'verifying', reference });
      try {
        const result = await verifyPayment.mutateAsync(reference);
        setVerify({
          outcome: result.status,
          reference,
          amount: result.transaction?.totalAmount,
          receipt: result.receipt ?? null,
          failureReason: result.transaction?.failureReason,
        });
      } catch (error) {
        // The request itself failed, so we do not know what happened to the
        // money. Reported as `unverified`, never as a failed payment.
        logger.error('payments', `Could not verify payment ${reference}`, error);
        setVerify({ outcome: 'unverified', reference, error });
      }
    },
    [verifyPayment],
  );

  // The provider redirect lands here. Runs once per reference, even under
  // StrictMode's double-mount in development.
  const verifiedRef = useRef<string | null>(null);
  useEffect(() => {
    const isCallback = window.location.pathname.endsWith('/payments/verify');
    const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? '';
    const status = searchParams.get('status');

    if (!isCallback && !reference && !status) return;
    if (verifiedRef.current === (reference || status || 'callback')) return;
    verifiedRef.current = reference || status || 'callback';

    if (status === 'cancelled' || status === 'cancel') {
      setVerify({ outcome: 'cancelled', reference });
      return;
    }
    if (!reference) {
      setVerify({ outcome: 'no-reference', reference: '' });
      return;
    }
    void runVerification(reference);
  }, [searchParams, runVerification]);

  /** Creates the checkout and hands the parent to the provider (guarded in useCheckout). */
  const handleConfirm = useCallback(() => {
    if (!studentId || !provider || selection.items.length === 0) return;
    void checkout.start({
      childId: studentId,
      feeAssignmentIds: selection.items.map((fee) => fee.id),
      ...(selection.amount !== undefined ? { amount: selection.amount } : {}),
      provider,
    });
  }, [studentId, provider, selection, checkout]);

  /** Returns to fee selection with a clean slate (and a new attempt). */
  const startOver = useCallback(() => {
    verifiedRef.current = null;
    checkout.reset();
    setVerify(null);
    setSelection({ items: [] });
    setProvider(null);
    setStep(1);
    navigate('/payments/pay', { replace: true });
  }, [checkout, navigate]);

  /** Leaves for the Payments page. */
  const done = useCallback(() => navigate('/payments', { replace: true }), [navigate]);

  if (verify) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PaymentResult
            outcome={verify.outcome}
            reference={verify.reference}
            amount={verify.amount}
            receipt={verify.receipt}
            failureReason={verify.failureReason}
            error={verify.error}
            onRetryVerify={() => void runVerification(verify.reference)}
            onStartOver={startOver}
            onDone={done}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={step > 1 ? 'Go to the previous step' : 'Back to payments'}
            onClick={() => (step > 1 ? setStep(step - 1) : navigate('/payments'))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100">Make payment</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full bg-[#003366]/10 px-3 py-1 text-xs font-semibold text-[#003366] sm:inline-flex dark:bg-blue-950/50 dark:text-blue-300">
          {STEP_LABELS[step - 1]}
        </span>
      </header>

      <StepIndicator step={step} />

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-base font-bold text-gray-800 dark:text-slate-100">
          {STEP_LABELS[step - 1]}
        </h2>

        {step === 1 && (
          <SelectFeesStep
            studentId={studentId}
            fees={owed ?? (family.isSuccess ? [] : undefined)}
            isPending={family.isPending}
            isError={family.isError}
            error={family.error}
            onRetry={() => void family.refetch()}
            preSelected={state?.feeAssignmentIds ?? []}
            minimumPartPayment={bill?.minimumPartPayment}
            onNext={(next) => {
              setSelection(next);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <ChooseProviderStep
            childId={studentId}
            onNext={(chosen) => {
              setProvider(chosen);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && provider && (
          <ReviewStep
            selectedFees={selection.items}
            amount={selection.amount}
            provider={provider}
            studentName={studentName}
            onConfirm={handleConfirm}
            onBack={() => setStep(2)}
            submitting={checkout.submitting}
            error={checkout.error}
          />
        )}
      </section>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500">
        <ShieldCheck size={13} className="text-green-500 dark:text-green-400" aria-hidden="true" />
        <span>256-bit SSL encryption · PCI DSS compliant</span>
      </p>
    </div>
  );
}
