import { useState } from 'react';
import { usePaymentHistory } from '../../../hooks/portal/usePortalPayments';
import { naira, shortDate } from '../../../lib/format';
import { methodName } from '../../../lib/receiptPdf';
import { ErrorCard, Pill } from '../ui/primitives';
import { rowButton, type Tone } from '../ui/styles';
import type { HistoryStatus } from '../../../types/portal/payments';

/** How each payment status reads. A bank transfer stays Pending until the bursary confirms it. */
const HISTORY_STATUS: Record<HistoryStatus, { label: string; tone: Tone }> = {
  successful: { label: 'Successful', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  refunded: { label: 'Refunded', tone: 'muted' },
  rejected: { label: 'Not confirmed', tone: 'danger' },
};

/**
 * The Payment history tab (C6): date, items, amount, method, reference and
 * status, ten rows a page. A pending bank transfer says it is waiting for the
 * bursary.
 *
 * @param props - The child.
 * @param props.childId - The active child.
 * @returns The panel.
 */
export function HistoryPanel({ childId }: { childId: string }) {
  const [page, setPage] = useState(1);
  const history = usePaymentHistory(childId, page);

  if (history.isPending) return <div role="status" aria-label="Loading payment history" className="mt-5 h-40 animate-pulse rounded-2xl bg-tl-track" />;
  if (history.isError) return <div className="mt-5"><ErrorCard error={history.error} title="Payment history couldn't be loaded" onRetry={() => void history.refetch()} /></div>;

  const { data: rows, meta } = history.data;
  if (rows.length === 0) {
    return <p className="mt-5 rounded-2xl border border-tl-line-soft bg-tl-subtle p-5 text-sm text-tl-muted">No payments yet for this child.</p>;
  }

  return (
    <div className="mt-1.5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Payment history</caption>
          <thead>
            <tr className="border-b border-tl-line-soft text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">
              <th scope="col" className="px-1.5 py-3.5">Date</th>
              <th scope="col" className="px-1.5 py-3.5">Item</th>
              <th scope="col" className="px-1.5 py-3.5">Amount</th>
              <th scope="col" className="px-1.5 py-3.5">Method</th>
              <th scope="col" className="px-1.5 py-3.5">Reference</th>
              <th scope="col" className="px-1.5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = HISTORY_STATUS[row.status] ?? HISTORY_STATUS.pending;
              return (
                <tr key={row.id} className="border-b border-tl-line-soft align-middle">
                  <td className="px-1.5 py-4 text-tl-muted">{shortDate(row.date)}</td>
                  <td className="px-1.5 py-4 pr-2.5 font-bold text-tl-ink">{row.items.map((item) => item.label).join(', ') || '—'}</td>
                  <td className="px-1.5 py-4 font-extrabold text-tl-ink">{naira(row.amount)}</td>
                  <td className="px-1.5 py-4 text-tl-muted">{methodName(row.method)}</td>
                  <td className="px-1.5 py-4 text-[13px] text-tl-muted">{row.reference}</td>
                  <td className="px-1.5 py-4">
                    <Pill tone={status.tone}>{status.label}</Pill>
                    {row.status === 'pending' && row.method === 'bank_transfer' ? (
                      <span className="mt-1 block text-xs text-tl-faint">Waiting for the bursary</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {meta.lastPage > 1 ? (
        <nav aria-label="Payment history pages" className="mt-4 flex items-center justify-between gap-3 text-sm text-tl-muted">
          <button type="button" className={rowButton} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.lastPage}
          </span>
          <button type="button" className={rowButton} disabled={page >= meta.lastPage} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
