import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { computePaymentTotals, formatNaira, lateFeeApplies } from '../../lib/paymentTotals';
import { messageForError } from '../StateComponents';
import { providerMeta } from './providerMeta';
import type { DueFee, PaymentProviderName } from '../../types/payments';

/**
 * Step 3 — the last screen before the parent is handed to the provider.
 *
 * The total here is computed the way the server computes the charge: late fees
 * count only once their due date has passed, and the platform fee is not added
 * on top because the server takes it out of the amount on settlement.
 *
 * @param props - Component props.
 * @param props.selectedFees - The fees being paid.
 * @param props.provider - The chosen provider.
 * @param props.studentName - Whose fees these are.
 * @param props.onConfirm - Starts the payment.
 * @param props.onBack - Returns to the provider picker.
 * @param props.submitting - True while the checkout is being created.
 * @param props.error - A failed initialisation, if the last attempt failed.
 * @returns The step.
 */
export function ReviewStep({
  selectedFees,
  provider,
  studentName,
  onConfirm,
  onBack,
  submitting,
  error,
}: {
  selectedFees: DueFee[];
  provider: PaymentProviderName;
  studentName: string;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
  error: unknown;
}) {
  const totals = computePaymentTotals(selectedFees);
  const meta = providerMeta(provider);

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
        Review your payment details before proceeding.
      </p>

      <div className="mb-4 rounded-2xl bg-[#003366]/5 p-4 dark:bg-blue-950/30">
        <p className="mb-1 text-xs text-gray-500 dark:text-slate-400">Paying for</p>
        <p className="font-semibold text-[#003366] dark:text-blue-300">{studentName}</p>
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Fee breakdown
          </h3>
        </div>
        <ul className="divide-y divide-gray-50 dark:divide-slate-800">
          {selectedFees.map((fee) => (
            <li key={fee._id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{fee.feeName}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{fee.category}</p>
                {lateFeeApplies(fee) && (
                  <p className="mt-0.5 text-xs text-orange-500 dark:text-orange-400">
                    + {formatNaira(fee.lateFeeAmount)} late fee
                  </p>
                )}
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-800 dark:text-slate-100">
                {formatNaira(fee.amount)}
              </p>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-slate-800">
          <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
            <span>Subtotal</span>
            <span>{formatNaira(totals.subtotal)}</span>
          </div>
          {totals.lateFee > 0 && (
            <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
              <span>Late fees</span>
              <span>+ {formatNaira(totals.lateFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-[#003366] dark:border-slate-800 dark:text-blue-300">
            <span>Total</span>
            <span className="text-lg">{formatNaira(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
          {meta.icon}
        </span>
        <div className="flex-1">
          <p className="text-xs text-gray-400 dark:text-slate-500">Payment via</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100">{meta.name}</p>
        </div>
        <ShieldCheck size={18} className="text-green-500 dark:text-green-400" aria-hidden="true" />
      </div>

      {error != null && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {messageForError(error, "We couldn't start this payment. Please try again.")}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#003366] py-3 text-sm font-bold text-white transition hover:bg-[#003366]/90 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Processing…
            </>
          ) : (
            <>
              <Lock size={14} aria-hidden="true" /> Confirm &amp; pay {formatNaira(totals.total)}
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-gray-400 dark:text-slate-500">
        You will be redirected to {meta.name} to complete your payment securely.
      </p>
    </div>
  );
}
