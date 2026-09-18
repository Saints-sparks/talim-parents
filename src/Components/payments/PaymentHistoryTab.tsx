import { Clock } from 'lucide-react';
import { formatNaira } from '../../lib/paymentTotals';
import { EmptyState, ErrorState, LoadingState } from '../StateComponents';
import { StatusBadge } from './StatusBadge';
import { providerMeta } from './providerMeta';
import type { PaginatedList, PaymentTransaction } from '../../types/payments';

/**
 * Formats a transaction date.
 *
 * @param value - An ISO timestamp.
 * @returns A short date, or an em dash.
 */
function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Every payment the parent has started, settled or not.
 *
 * @param props - Component props.
 * @param props.history - One page of transactions.
 * @param props.isPending - True while the first load is in flight.
 * @param props.isError - True when the load failed.
 * @param props.error - The thrown value.
 * @param props.onRetry - Re-runs the load.
 * @param props.page - The page currently shown, 1-based.
 * @param props.pageSize - Rows per page.
 * @param props.onPageChange - Moves to another page.
 * @returns The tab.
 */
export function PaymentHistoryTab({
  history,
  isPending,
  isError,
  error,
  onRetry,
  page,
  pageSize,
  onPageChange,
}: {
  history: PaginatedList<PaymentTransaction> | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (isPending) return <LoadingState count={3} label="Loading payment history" />;
  if (isError) return <ErrorState error={error} onRetry={onRetry} title="Couldn't load payment history" />;

  const rows = history?.data ?? [];
  const total = history?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={40} className="text-gray-300 dark:text-slate-600" aria-hidden="true" />}
        title="No payment history yet"
        message="Payments you make will appear here."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Its own scroll container, so a wide table never scrolls the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Your payment history, newest first</caption>
          <thead className="bg-gray-50 dark:bg-slate-800/60">
            <tr>
              {['Date', 'Fee item', 'Amount', 'Paid with', 'Reference', 'Status'].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
            {rows.map((txn) => (
              <tr key={txn._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3 text-gray-500 dark:text-slate-400">
                  {formatDate(txn.paidAt ?? txn.createdAt)}
                </td>
                <td className="px-5 py-3 font-medium text-gray-800 dark:text-slate-200">
                  {txn.feeAssignmentIds?.length > 1
                    ? `${txn.feeAssignmentIds.length} fee items`
                    : 'Fee payment'}
                </td>
                <td className="px-5 py-3 font-semibold text-[#003366] dark:text-blue-300">
                  {formatNaira(txn.totalAmount)}
                </td>
                <td className="px-5 py-3 text-gray-500 dark:text-slate-400">
                  {txn.providerName ? providerMeta(txn.providerName).name : '—'}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-slate-400">
                  <span className="select-all">{txn.internalReference}</span>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={txn.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <nav
          aria-label="Payment history pages"
          className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm dark:border-slate-800"
        >
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Page {page} of {lastPage} · {total} payment{total !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= lastPage}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
