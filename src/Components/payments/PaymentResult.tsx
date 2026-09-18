import { AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { formatNaira } from '../../lib/paymentTotals';
import { messageForError } from '../StateComponents';
import type { Receipt } from '../../types/payments';

/**
 * What the verify step concluded.
 *
 * `failed` and `unverified` are deliberately different: `failed` is the
 * provider saying the money did not move, while `unverified` is us being
 * unable to ask. Collapsing the two would tell a parent whose card was
 * charged that their payment failed.
 */
export type VerifyOutcome =
  | 'verifying'
  | 'successful'
  | 'pending'
  | 'failed'
  | 'unverified'
  | 'cancelled'
  | 'no-reference';

/** Everything the result screen needs to explain what happened. */
export interface PaymentResultProps {
  outcome: VerifyOutcome;
  /** The provider reference, shown so a parent can quote it to the school. */
  reference: string;
  /** Amount confirmed by the server, when it got that far. */
  amount?: number;
  /** Issued receipt, when the payment settled. */
  receipt?: Receipt | null;
  /** Why the provider declined, when it said. */
  failureReason?: string;
  /** The thrown value behind an `unverified` outcome. */
  error?: unknown;
  /** Re-runs verification. */
  onRetryVerify: () => void;
  /** Starts the flow again from fee selection. */
  onStartOver: () => void;
  /** Returns to the Payments page. */
  onDone: () => void;
}

/** One presentation shell, so every outcome gets the same layout and focus order. */
function ResultShell({
  tone,
  icon,
  title,
  children,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-12 text-center" role="status" aria-live="polite">
      <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${tone}`}>
        {icon}
      </div>
      <h2 className="mb-1 text-xl font-bold text-gray-800 dark:text-slate-100">{title}</h2>
      {children}
    </div>
  );
}

/** The reference line, so a parent always has something to quote to the school. */
function ReferenceLine({ reference }: { reference: string }) {
  if (!reference) return null;
  return (
    <p className="mb-4 font-mono text-xs text-gray-400 dark:text-slate-500">
      Ref: <span className="select-all">{reference}</span>
    </p>
  );
}

/** A primary action button. */
function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-[#003366] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003366]/90 focus:outline-none focus:ring-2 focus:ring-[#003366]/40 dark:bg-blue-600 dark:hover:bg-blue-500"
    >
      {children}
    </button>
  );
}

/** A secondary action button. */
function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

/**
 * Step 4 — what the provider and the server between them concluded.
 *
 * @param props - See {@link PaymentResultProps}.
 * @returns The result screen.
 */
export function PaymentResult({
  outcome,
  reference,
  amount,
  receipt,
  failureReason,
  error,
  onRetryVerify,
  onStartOver,
  onDone,
}: PaymentResultProps) {
  if (outcome === 'verifying') {
    return (
      <div className="py-16 text-center" role="status" aria-live="polite" aria-busy="true">
        <Loader2 size={48} className="mx-auto mb-4 animate-spin text-[#003366] dark:text-blue-400" aria-hidden="true" />
        <p className="font-semibold text-gray-700 dark:text-slate-200">Confirming your payment…</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
          Please don&apos;t close this page.
        </p>
      </div>
    );
  }

  if (outcome === 'successful') {
    return (
      <ResultShell
        tone="bg-green-100 dark:bg-green-950/50"
        icon={<CheckCircle size={40} className="text-green-500 dark:text-green-400" aria-hidden="true" />}
        title="Payment successful"
      >
        <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
          {amount ? `${formatNaira(amount)} has been paid.` : 'Your payment has been confirmed.'}
        </p>
        {receipt?.receiptNumber && (
          <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
            Receipt <span className="font-semibold text-gray-700 dark:text-slate-200">{receipt.receiptNumber}</span>{' '}
            is in your Payments page.
          </p>
        )}
        <ReferenceLine reference={reference} />
        <PrimaryButton onClick={onDone}>Back to payments</PrimaryButton>
      </ResultShell>
    );
  }

  if (outcome === 'pending') {
    return (
      <ResultShell
        tone="bg-yellow-100 dark:bg-yellow-950/50"
        icon={<Clock size={40} className="text-yellow-500 dark:text-yellow-400" aria-hidden="true" />}
        title="Payment pending"
      >
        <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
          Your bank hasn&apos;t confirmed this yet. It usually takes a few minutes.
        </p>
        <ReferenceLine reference={reference} />
        <p className="mb-6 text-xs text-gray-400 dark:text-slate-500">
          Don&apos;t pay again — your receipt will appear once it clears.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <SecondaryButton onClick={onDone}>Back to payments</SecondaryButton>
          <PrimaryButton onClick={onRetryVerify}>
            <RefreshCw size={14} aria-hidden="true" /> Check again
          </PrimaryButton>
        </div>
      </ResultShell>
    );
  }

  if (outcome === 'unverified') {
    // We could not reach the server to ask. The parent's card may well have
    // been charged, so this must never read as "your payment failed".
    return (
      <ResultShell
        tone="bg-amber-100 dark:bg-amber-950/50"
        icon={<AlertTriangle size={40} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />}
        title="We couldn't confirm this payment"
      >
        <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
          {messageForError(error, 'We could not reach the school system to check.')}
        </p>
        <ReferenceLine reference={reference} />
        <p className="mb-6 text-xs text-gray-400 dark:text-slate-500">
          If money left your account, it is safe — don&apos;t pay again. Check again in a moment, or
          give the school this reference.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <SecondaryButton onClick={onDone}>Back to payments</SecondaryButton>
          <PrimaryButton onClick={onRetryVerify}>
            <RefreshCw size={14} aria-hidden="true" /> Check again
          </PrimaryButton>
        </div>
      </ResultShell>
    );
  }

  if (outcome === 'cancelled') {
    return (
      <ResultShell
        tone="bg-gray-100 dark:bg-slate-800"
        icon={<XCircle size={40} className="text-gray-400 dark:text-slate-400" aria-hidden="true" />}
        title="Payment cancelled"
      >
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
          You cancelled the payment. Nothing was charged.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <SecondaryButton onClick={onDone}>Back to payments</SecondaryButton>
          <PrimaryButton onClick={onStartOver}>Try again</PrimaryButton>
        </div>
      </ResultShell>
    );
  }

  if (outcome === 'no-reference') {
    return (
      <ResultShell
        tone="bg-gray-100 dark:bg-slate-800"
        icon={<AlertTriangle size={40} className="text-gray-400 dark:text-slate-400" aria-hidden="true" />}
        title="Nothing to confirm"
      >
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
          This page came back without a payment reference, so there is nothing to check. If you
          completed a payment, it will show up on your Payments page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <SecondaryButton onClick={onDone}>Back to payments</SecondaryButton>
          <PrimaryButton onClick={onStartOver}>Start a payment</PrimaryButton>
        </div>
      </ResultShell>
    );
  }

  // The provider told us, definitively, that the payment did not go through.
  return (
    <ResultShell
      tone="bg-red-100 dark:bg-red-950/50"
      icon={<XCircle size={40} className="text-red-500 dark:text-red-400" aria-hidden="true" />}
      title="Payment failed"
    >
      <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
        {failureReason || 'Your bank declined this payment. Nothing was charged.'}
      </p>
      <ReferenceLine reference={reference} />
      <div className="flex flex-wrap justify-center gap-3">
        <SecondaryButton onClick={onDone}>Back to payments</SecondaryButton>
        <PrimaryButton onClick={onStartOver}>
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </PrimaryButton>
      </div>
    </ResultShell>
  );
}
