import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { computePaymentTotals, formatNaira, lateFeeApplies } from '../../lib/paymentTotals';
import { EmptyState, ErrorState, LoadingState } from '../StateComponents';
import { StatusBadge } from './StatusBadge';
import type { DueFee } from '../../types/payments';

/**
 * Formats a due date for the fee rows.
 *
 * @param value - An ISO date, or null.
 * @returns A short date, or an em dash.
 */
function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * The outstanding fees for the selected child, with a way to pay them.
 *
 * @param props - Component props.
 * @param props.fees - The outstanding fees, once loaded.
 * @param props.isPending - True while the first load is in flight.
 * @param props.isError - True when the load failed.
 * @param props.error - The thrown value.
 * @param props.onRetry - Re-runs the load.
 * @param props.studentId - Whose fees these are.
 * @returns The tab.
 */
export function DueFeesTab({
  fees,
  isPending,
  isError,
  error,
  onRetry,
  studentId,
}: {
  fees: DueFee[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  studentId: string | undefined;
}) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedFees = useMemo(() => fees.filter((f) => selectedIds.has(f._id)), [fees, selectedIds]);
  const selectedTotals = useMemo(() => computePaymentTotals(selectedFees), [selectedFees]);

  /**
   * Adds or removes one fee from the selection.
   *
   * @param id - The fee assignment id.
   */
  const toggle = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Hands the chosen fees to the payment flow.
   *
   * @param ids - The fee assignment ids to pay.
   */
  const pay = (ids: string[]): void => {
    navigate('/payments/pay', { state: { feeAssignmentIds: ids, studentId } });
  };

  if (isPending) return <LoadingState count={3} label="Loading outstanding fees" />;

  // A failed load must never render as "all fees are paid" — that is the one
  // wrong answer a fees screen can give.
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} title="Couldn't load outstanding fees" />;
  }

  if (fees.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle size={40} className="text-green-400 dark:text-green-500" aria-hidden="true" />}
        title="All fees are paid"
        message="There is nothing outstanding for this child."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          <span className="font-semibold text-gray-700 dark:text-slate-200">{fees.length}</span> fee
          {fees.length !== 1 ? 's' : ''} outstanding
        </p>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => pay(Array.from(selectedIds))}
              className="rounded-xl bg-[#003366] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#003366]/90 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Pay selected ({formatNaira(selectedTotals.total)})
            </button>
          )}
          <button
            type="button"
            onClick={() => pay(fees.map((f) => f._id))}
            className="rounded-xl border-2 border-[#003366] px-4 py-2 text-sm font-medium text-[#003366] transition hover:bg-[#003366]/5 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-950/40"
          >
            Pay all
          </button>
        </div>
      </div>

      <ul className="space-y-4">
        {fees.map((fee) => {
          const expanded = expandedId === fee._id;
          const overdue = fee.isOverdue || lateFeeApplies(fee);
          return (
            <li
              key={fee._id}
              className={`rounded-2xl border-2 bg-white p-5 transition-all dark:bg-slate-900 ${
                selectedIds.has(fee._id)
                  ? 'border-[#003366] dark:border-blue-400'
                  : 'border-gray-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id={`fee-${fee._id}`}
                  checked={selectedIds.has(fee._id)}
                  onChange={() => toggle(fee._id)}
                  className="mt-1 h-4 w-4 accent-[#003366]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <label
                        htmlFor={`fee-${fee._id}`}
                        className="cursor-pointer font-semibold text-gray-800 dark:text-slate-100"
                      >
                        {fee.feeName}
                      </label>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={fee.status} />
                        <span className="text-xs text-gray-400 dark:text-slate-500">{fee.category}</span>
                        {overdue && (
                          <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                            <AlertCircle size={11} aria-hidden="true" /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-bold text-[#003366] dark:text-blue-300">
                      {formatNaira(fee.amount)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500">Due date</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {formatDate(fee.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : fee._id)}
                        aria-expanded={expanded}
                        className="flex items-center gap-1 text-xs text-[#003366] hover:underline dark:text-blue-300"
                      >
                        {expanded ? 'Hide breakdown' : 'View breakdown'}
                        <ChevronDown size={12} className={expanded ? 'rotate-180' : ''} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => pay([fee._id])}
                        className="rounded-xl bg-[#003366] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#003366]/90 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        Pay now
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 space-y-1 rounded-xl bg-gray-50 p-3 text-sm dark:bg-slate-800/60">
                      <div className="flex justify-between text-gray-600 dark:text-slate-300">
                        <span>Fee amount</span>
                        <span className="font-medium">{formatNaira(fee.amount)}</span>
                      </div>
                      {fee.lateFeeAmount > 0 && (
                        <div
                          className={`flex justify-between ${
                            lateFeeApplies(fee)
                              ? 'text-red-500 dark:text-red-400'
                              : 'text-gray-500 dark:text-slate-400'
                          }`}
                        >
                          <span>
                            {/* The server only charges this once the due date
                                has passed, so say which it is. */}
                            {lateFeeApplies(fee) ? 'Late fee' : 'Late fee if paid after the due date'}
                          </span>
                          <span className="font-medium">{formatNaira(fee.lateFeeAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-800 dark:border-slate-700 dark:text-slate-100">
                        <span>Payable now</span>
                        <span>{formatNaira(computePaymentTotals([fee]).total)}</span>
                      </div>
                      {fee.description && (
                        <p className="mt-1 border-t border-gray-200 pt-1 text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">
                          {fee.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
