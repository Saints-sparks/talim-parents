import { useId, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { checkPayment, formatNaira } from '../../lib/paymentTotals';
import { EmptyState, ErrorState, LoadingState } from '../StateComponents';
import type { FeeItem } from '../../types/portal/payments';

/** What step 1 hands on. */
export interface FeeSelection {
  items: FeeItem[];
  /** Set only for a part payment (less than the balance). */
  amount?: number;
}

/**
 * Formats a due date for the fee rows.
 *
 * @param value - An ISO date, or null.
 * @returns A short date, or an em dash.
 */
function formatDueDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Props of {@link SelectFeesStep}. */
export interface SelectFeesStepProps {
  studentId: string | undefined;
  /** The child's items with a balance (C2), or undefined while loading. */
  fees: FeeItem[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  /** Fee ids carried in from the Payments page. */
  preSelected: string[];
  /** The school's minimum part payment, when known. */
  minimumPartPayment?: number | null;
  onNext: (selection: FeeSelection) => void;
}

/**
 * Step 1: the parent picks which outstanding fees to pay, and whether to pay
 * them in full or in part (the C3 rules, checked as they type).
 *
 * @param props - See {@link SelectFeesStepProps}.
 * @returns The step.
 */
export function SelectFeesStep({ studentId, fees, isPending, isError, error, onRetry, preSelected, minimumPartPayment, onNext }: SelectFeesStepProps) {
  const [touched, setTouched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preSelected));
  const [mode, setMode] = useState<'full' | 'part'>('full');
  const [amount, setAmount] = useState('');
  const amountId = useId();

  // Until the parent touches anything, the selection is whatever they carried
  // in, narrowed to fees still owed, so a fee paid elsewhere is never re-sent.
  const selected = useMemo(() => {
    if (touched || !fees) return selectedIds;
    const owed = new Set(fees.map((fee) => fee.id));
    return new Set([...selectedIds].filter((id) => owed.has(id)));
  }, [touched, fees, selectedIds]);

  const selectedFees = useMemo(() => (fees ?? []).filter((fee) => selected.has(fee.id)), [fees, selected]);
  const check = useMemo(() => checkPayment(selectedFees, mode, amount, minimumPartPayment), [selectedFees, mode, amount, minimumPartPayment]);

  const toggle = (id: string): void => {
    setTouched(true);
    setSelectedIds(() => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (): void => {
    setTouched(true);
    setSelectedIds(selected.size === (fees?.length ?? 0) ? new Set() : new Set((fees ?? []).map((f) => f.id)));
  };

  if (!studentId) {
    return <EmptyState title="Choose a child first" message="Pick which child you're paying for from the switcher at the top of the page." />;
  }
  if (isPending) return <LoadingState count={3} label="Loading outstanding fees" />;
  if (isError || !fees) return <ErrorState error={error} onRetry={onRetry} title="Couldn't load the fees" />;
  if (fees.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle size={40} className="text-green-600 dark:text-green-500" aria-hidden="true" />}
        title="No outstanding fees"
        message="Everything for this child is paid up."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          <span className="font-semibold text-gray-700 dark:text-slate-200">{fees.length}</span> fee{fees.length !== 1 ? 's' : ''} outstanding
        </p>
        <button type="button" onClick={toggleAll} className="min-h-[44px] text-xs font-medium text-[#003366] hover:underline dark:text-blue-300">
          {selected.size === fees.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <ul className="space-y-3">
        {fees.map((fee) => {
          const isSelected = selected.has(fee.id);
          return (
            <li key={fee.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-4 transition-all dark:bg-slate-900 ${
                  isSelected ? 'border-[#003366] shadow-sm dark:border-blue-400' : 'border-gray-100 hover:border-gray-200 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <input type="checkbox" checked={isSelected} onChange={() => toggle(fee.id)} className="mt-1 h-4 w-4 accent-[#003366]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{fee.label}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-slate-400">{fee.category}</span>
                        {fee.status === 'overdue' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                            <AlertCircle size={10} aria-hidden="true" /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-[#003366] dark:text-blue-300">{formatNaira(fee.balance)}</p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-400">Due {formatDueDate(fee.dueDate)}</p>
                    </div>
                  </div>
                  {fee.paid > 0 && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                      {formatNaira(fee.paid)} of {formatNaira(fee.amount)} already paid
                    </p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {selected.size > 0 && (
        <div className="mt-6 space-y-4 rounded-2xl bg-[#003366]/5 p-4 dark:bg-blue-950/30">
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-2 text-xs font-semibold text-gray-700 dark:text-slate-300">How much would you like to pay?</legend>
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-gray-800 dark:text-slate-100">
              <input type="radio" name="pay-mode" checked={mode === 'full'} onChange={() => setMode('full')} className="accent-[#003366]" />
              Pay in full ({formatNaira(check.total)})
            </label>
            <label className={`flex min-h-[44px] items-center gap-2 text-sm ${check.partAllowed ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-500'}`}>
              <input type="radio" name="pay-mode" checked={mode === 'part'} disabled={!check.partAllowed} onChange={() => setMode('part')} className="accent-[#003366]" />
              Part payment{check.partAllowed ? '' : ' (not allowed on these fees)'}
            </label>
          </fieldset>
          {mode === 'part' && (
            <div>
              <label htmlFor={amountId} className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                Amount to pay now
              </label>
              <input
                id={amountId}
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount in naira"
                aria-invalid={Boolean(amount && check.error) || undefined}
                aria-describedby={`${amountId}-hint`}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <p id={`${amountId}-hint`} className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                {amount && check.error ? check.error : check.minimum !== null ? `Minimum ${formatNaira(check.minimum)}` : 'The school sets the minimum'}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-slate-400">
                {selected.size} fee{selected.size !== 1 ? 's' : ''} selected
              </p>
              <p className="text-lg font-bold text-[#003366] dark:text-blue-300">{formatNaira(check.amount)}</p>
              {check.ok && check.partial && <p className="text-xs text-gray-600 dark:text-slate-400">{formatNaira(check.remaining)} will stay outstanding after this payment.</p>}
            </div>
            <button
              type="button"
              disabled={!check.ok}
              onClick={() => onNext({ items: selectedFees, ...(check.partial ? { amount: check.amount } : {}) })}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[#003366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003366]/90 focus:outline-none focus:ring-2 focus:ring-[#003366]/40 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Continue <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
