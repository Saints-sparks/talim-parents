import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { useDueFees } from '../../hooks/usePayments';
import { computePaymentTotals, formatNaira, lateFeeApplies } from '../../lib/paymentTotals';
import { EmptyState, ErrorState, LoadingState } from '../StateComponents';
import type { DueFee } from '../../types/payments';

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

/**
 * Step 1 — the parent picks which outstanding fees to pay.
 *
 * @param props - Component props.
 * @param props.studentId - Student record id whose fees are shown.
 * @param props.preSelected - Fee ids carried in from the Payments page.
 * @param props.onNext - Called with the chosen fees.
 * @returns The step.
 */
export function SelectFeesStep({
  studentId,
  preSelected,
  onNext,
}: {
  studentId: string | undefined;
  preSelected: string[];
  onNext: (fees: DueFee[]) => void;
}) {
  const { data: fees, isPending, isError, error, refetch } = useDueFees(studentId);
  const [touched, setTouched] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preSelected));

  // Until the parent touches anything, the selection is whatever they carried
  // in from the Payments page — narrowed to fees that are actually still due,
  // so a fee paid in another tab cannot be re-submitted from a stale list.
  const selected = useMemo(() => {
    if (touched || !fees) return selectedIds;
    return new Set(fees.filter((fee) => selectedIds.has(fee._id)).map((fee) => fee._id));
  }, [touched, fees, selectedIds]);

  const selectedFees = useMemo(
    () => (fees ?? []).filter((fee) => selected.has(fee._id)),
    [fees, selected],
  );
  const totals = useMemo(() => computePaymentTotals(selectedFees), [selectedFees]);

  /**
   * Adds or removes one fee from the selection.
   *
   * @param id - The fee assignment id.
   */
  const toggle = (id: string): void => {
    setTouched(true);
    setSelectedIds(() => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Selects every fee, or clears the selection when all are already chosen. */
  const toggleAll = (): void => {
    setTouched(true);
    setSelectedIds(
      selected.size === (fees?.length ?? 0) ? new Set() : new Set((fees ?? []).map((f) => f._id)),
    );
  };

  if (!studentId) {
    return (
      <EmptyState
        title="Choose a child first"
        message="Pick which child you're paying for from the switcher at the top of the page."
      />
    );
  }

  if (isPending) return <LoadingState count={3} label="Loading outstanding fees" />;
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load the fees" />;
  }

  if (fees.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle size={40} className="text-green-400 dark:text-green-500" aria-hidden="true" />}
        title="No outstanding fees"
        message="Everything for this child is paid up."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          <span className="font-semibold text-gray-700 dark:text-slate-200">{fees.length}</span> fee
          {fees.length !== 1 ? 's' : ''} outstanding
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-medium text-[#003366] hover:underline dark:text-blue-300"
        >
          {selected.size === fees.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <ul className="space-y-3">
        {fees.map((fee) => {
          const isSelected = selected.has(fee._id);
          const overdue = fee.isOverdue || lateFeeApplies(fee);
          return (
            <li key={fee._id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-4 transition-all dark:bg-slate-900 ${
                  isSelected
                    ? 'border-[#003366] shadow-sm dark:border-blue-400'
                    : 'border-gray-100 hover:border-gray-200 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(fee._id)}
                  className="mt-1 h-4 w-4 accent-[#003366]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{fee.feeName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-slate-500">{fee.category}</span>
                        {overdue && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                            <AlertCircle size={10} aria-hidden="true" /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-[#003366] dark:text-blue-300">{formatNaira(fee.amount)}</p>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                        Due {formatDueDate(fee.dueDate)}
                      </p>
                    </div>
                  </div>
                  {fee.lateFeeAmount > 0 && (
                    <p className="mt-1 text-xs text-orange-500 dark:text-orange-400">
                      {lateFeeApplies(fee)
                        ? `+ ${formatNaira(fee.lateFeeAmount)} late fee applies`
                        : `${formatNaira(fee.lateFeeAmount)} late fee if paid after the due date`}
                    </p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {selected.size > 0 && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#003366]/5 p-4 dark:bg-blue-950/30">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {selected.size} fee{selected.size !== 1 ? 's' : ''} selected
            </p>
            <p className="text-lg font-bold text-[#003366] dark:text-blue-300">
              {formatNaira(totals.total)}
            </p>
            {totals.lateFee > 0 && (
              <p className="text-xs text-orange-500 dark:text-orange-400">
                includes {formatNaira(totals.lateFee)} in late fees
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNext(selectedFees)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#003366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003366]/90 focus:outline-none focus:ring-2 focus:ring-[#003366]/40 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Continue <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
