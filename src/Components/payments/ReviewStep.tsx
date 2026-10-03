import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { formatNaira } from '../../lib/paymentTotals';
import { messageForError } from '../StateComponents';
import { providerMeta } from './providerMeta';
import type { PaymentProviderName } from '../../types/payments';
import type { FeeItem } from '../../types/portal/payments';

/** Props of {@link ReviewStep}. */
export interface ReviewStepProps {
  selectedFees: FeeItem[];
  /** The part amount, when paying less than the balance. */
  amount?: number;
  provider: PaymentProviderName;
  studentName: string;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
  error: unknown;
}

/**
 * Step 3 — the last screen before the parent is handed to the provider: what
 * is being paid, how much, what stays outstanding, and through whom. The
 * server allocates the amount by due date and is the authority on the charge.
 *
 * @param props - See {@link ReviewStepProps}.
 * @returns The step.
 */
export function ReviewStep({ selectedFees, amount, provider, studentName, onConfirm, onBack, submitting, error }: ReviewStepProps) {
  const balance = selectedFees.reduce((sum, fee) => sum + fee.balance, 0);
  const paying = amount ?? balance;
  const meta = providerMeta(provider);

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600 dark:text-slate-400">Review your payment details before proceeding.</p>

      <div className="mb-4 rounded-2xl bg-[#003366]/5 p-4 dark:bg-blue-950/30">
        <p className="mb-1 text-xs text-gray-600 dark:text-slate-400">Paying for</p>
        <p className="font-semibold text-[#003366] dark:text-blue-300">{studentName}</p>
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">Fee breakdown</h3>
        </div>
        <ul className="divide-y divide-gray-50 dark:divide-slate-800">
          {selectedFees.map((fee) => (
            <li key={fee.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{fee.label}</p>
                <p className="text-xs text-gray-600 dark:text-slate-400">{fee.category}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-800 dark:text-slate-100">{formatNaira(fee.balance)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-slate-800">
          <div className="flex justify-between text-sm text-gray-700 dark:text-slate-300">
            <span>Balance due</span>
            <span>{formatNaira(balance)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-[#003366] dark:border-slate-800 dark:text-blue-300">
            <span>{amount !== undefined ? 'Paying now' : 'Total'}</span>
            <span className="text-lg">{formatNaira(paying)}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-400">
            {amount !== undefined ? `${formatNaira(balance - paying)} will stay outstanding after this payment.` : 'This clears the selected fees in full.'}
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>{meta.icon}</span>
        <div className="flex-1">
          <p className="text-xs text-gray-600 dark:text-slate-400">Payment via</p>
          <p className="font-semibold text-gray-800 dark:text-slate-100">{meta.name}</p>
        </div>
        <ShieldCheck size={18} className="text-green-600 dark:text-green-400" aria-hidden="true" />
      </div>

      {error != null && (
        <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {messageForError(error, "We couldn't start this payment. Please try again.")}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="min-h-[44px] flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          aria-disabled={submitting}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#003366] py-3 text-sm font-bold text-white transition hover:bg-[#003366]/90 aria-disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Processing…
            </>
          ) : (
            <>
              <Lock size={14} aria-hidden="true" /> Confirm &amp; pay {formatNaira(paying)}
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-gray-600 dark:text-slate-400">You will be redirected to {meta.name} to complete your payment securely.</p>
    </div>
  );
}
