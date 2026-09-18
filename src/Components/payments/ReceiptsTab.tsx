import { Eye, FileText } from 'lucide-react';
import { formatNaira } from '../../lib/paymentTotals';
import { EmptyState, ErrorState, LoadingState } from '../StateComponents';
import { StatusBadge } from './StatusBadge';
import { providerMeta } from './providerMeta';
import type { PaginatedList, Receipt } from '../../types/payments';

/**
 * Formats a payment date.
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
 * The receipts issued for the parent's settled payments.
 *
 * @param props - Component props.
 * @param props.receipts - One page of receipts.
 * @param props.isPending - True while the first load is in flight.
 * @param props.isError - True when the load failed.
 * @param props.error - The thrown value.
 * @param props.onRetry - Re-runs the load.
 * @param props.onView - Opens one receipt.
 * @param props.page - The page currently shown, 1-based.
 * @param props.pageSize - Rows per page.
 * @param props.onPageChange - Moves to another page.
 * @returns The tab.
 */
export function ReceiptsTab({
  receipts,
  isPending,
  isError,
  error,
  onRetry,
  onView,
  page,
  pageSize,
  onPageChange,
}: {
  receipts: PaginatedList<Receipt> | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onView: (receipt: Receipt) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (isPending) return <LoadingState count={3} label="Loading receipts" />;
  if (isError) return <ErrorState error={error} onRetry={onRetry} title="Couldn't load receipts" />;

  const rows = receipts?.data ?? [];
  const total = receipts?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={40} className="text-gray-300 dark:text-slate-600" aria-hidden="true" />}
        title="No receipts yet"
        message="A receipt appears here once a payment has cleared."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <caption className="sr-only">Your receipts, newest first</caption>
          <thead className="bg-gray-50 dark:bg-slate-800/60">
            <tr>
              {['Receipt no.', 'Amount paid', 'Payment date', 'Paid with', 'Status', ''].map((heading, index) => (
                <th
                  key={heading || `actions-${index}`}
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400"
                >
                  {heading || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
            {rows.map((receipt) => (
              <tr key={receipt._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-[#003366] dark:text-blue-300">
                  {receipt.receiptNumber}
                </td>
                <td className="px-5 py-3 font-semibold text-gray-800 dark:text-slate-200">
                  {formatNaira(receipt.totalPaid)}
                </td>
                <td className="px-5 py-3 text-gray-500 dark:text-slate-400">
                  {formatDate(receipt.paymentDate)}
                </td>
                <td className="px-5 py-3 text-gray-500 dark:text-slate-400">
                  {receipt.paymentProvider
                    ? providerMeta(receipt.paymentProvider).name
                    : (receipt.paymentMethod ?? '—')}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={receipt.status} />
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => onView(receipt)}
                    className="flex items-center gap-1 text-xs text-[#003366] hover:underline dark:text-blue-300"
                  >
                    <Eye size={12} aria-hidden="true" /> View receipt {receipt.receiptNumber}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <nav
          aria-label="Receipt pages"
          className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-slate-800"
        >
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Page {page} of {lastPage} · {total} receipt{total !== 1 ? 's' : ''}
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
