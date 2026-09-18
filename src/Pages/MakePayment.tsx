import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { useInitializePayment, useVerifyPayment } from '../hooks/usePayments';
import { SelectFeesStep } from '../Components/payments/SelectFeesStep';
import { ChooseProviderStep } from '../Components/payments/ChooseProviderStep';
import { ReviewStep } from '../Components/payments/ReviewStep';
import { PaymentResult, type VerifyOutcome } from '../Components/payments/PaymentResult';
import { STEP_LABELS, StepIndicator, TOTAL_STEPS } from '../Components/payments/StepIndicator';
import { logger } from '../lib/logger';
import { childFullName, childRecordId } from '../types/parent';
import type { DueFee, PaymentProviderName, Receipt } from '../types/payments';

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
 * The payment flow: select fees, choose a provider, review, then hand off to
 * the provider's hosted checkout. The provider redirects back to
 * `/payments/verify?reference=…`, which this same page picks up and verifies.
 */
export default function MakePayment() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: MakePaymentRouteState | null };
  const [searchParams] = useSearchParams();
  const { selectedStudent } = useSelectedStudent();

  const [step, setStep] = useState(1);
  const [selectedFees, setSelectedFees] = useState<DueFee[]>([]);
  const [provider, setProvider] = useState<PaymentProviderName | null>(null);
  const [verify, setVerify] = useState<VerifyState | null>(null);
  // Anything that stopped the hand-off, whether the request failed or it
  // came back without somewhere to send the parent.
  const [confirmError, setConfirmError] = useState<unknown>(null);

  const initialize = useInitializePayment();
  const verifyPayment = useVerifyPayment();

  // Set the instant a checkout redirect is committed to. `mutation.isPending`
  // alone is not enough: it flips back to false the moment the request
  // resolves, leaving a window before the browser actually navigates in which
  // a second click would start a second transaction — and a parent who then
  // paid both would be charged twice.
  const redirecting = useRef(false);

  const studentId = state?.studentId ?? childRecordId(selectedStudent);
  const studentName = childFullName(selectedStudent) || 'your child';

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

  /**
   * Creates the checkout and hands the parent to the provider.
   */
  const handleConfirm = useCallback(async () => {
    if (redirecting.current || !studentId || !provider || selectedFees.length === 0) return;
    redirecting.current = true;
    setConfirmError(null);

    try {
      const result = await initialize.mutateAsync({
        studentId,
        feeAssignmentIds: selectedFees.map((fee) => fee._id),
        providerName: provider,
      });

      if (!result?.checkoutUrl) {
        // The transaction exists server-side but there is nowhere to send the
        // parent. Saying so beats a dead button that looks like nothing
        // happened — and the pending transaction will expire on its own.
        throw new Error(
          "The payment provider didn't return a checkout page. Nothing has been charged — please try again.",
        );
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      // The flow stays on this screen with the error shown inline, so the
      // parent can correct it — and the guard reopens so they can retry.
      logger.error('payments', 'Could not start payment', error);
      setConfirmError(error);
      redirecting.current = false;
    }
  }, [studentId, provider, selectedFees, initialize]);

  /** Returns to fee selection with a clean slate. */
  const startOver = useCallback(() => {
    verifiedRef.current = null;
    redirecting.current = false;
    initialize.reset();
    setConfirmError(null);
    setVerify(null);
    setSelectedFees([]);
    setProvider(null);
    setStep(1);
    navigate('/payments/pay', { replace: true });
  }, [initialize, navigate]);

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
            preSelected={state?.feeAssignmentIds ?? []}
            onNext={(fees) => {
              setSelectedFees(fees);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <ChooseProviderStep
            onNext={(chosen) => {
              setProvider(chosen);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && provider && (
          <ReviewStep
            selectedFees={selectedFees}
            provider={provider}
            studentName={studentName}
            onConfirm={() => void handleConfirm()}
            onBack={() => setStep(2)}
            submitting={initialize.isPending || redirecting.current}
            error={confirmError ?? initialize.error}
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
