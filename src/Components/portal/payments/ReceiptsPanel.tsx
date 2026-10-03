import { useState } from 'react';
import { useParentReceipts } from '../../../hooks/portal/usePortalPayments';
import { naira, shortDate } from '../../../lib/format';
import { downloadReceiptsPdf, receiptFileName } from '../../../lib/receiptPdf';
import { logger } from '../../../lib/logger';
import { ErrorCard } from '../ui/primitives';
import { ghostButton, rowButton } from '../ui/styles';
import { ReceiptModal, type ReceiptSchool } from '../../payments/ReceiptModal';
import type { Receipt } from '../../../types/payments';
import type { ParentReceipt } from '../../../types/portal/payments';

/**
 * The shape the kept `ReceiptModal` renders, from a C5 receipt.
 *
 * @param receipt - The receipt.
 * @returns The modal's receipt and school header.
 */
export function toModalReceipt(receipt: ParentReceipt): { receipt: Receipt; school: ReceiptSchool } {
  return {
    receipt: {
      _id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      studentId: receipt.child.id,
      transactionId: '',
      feeItems: receipt.items.map((item) => ({ feeName: item.label, category: item.category ?? '', description: '', amount: item.amount })),
      subtotal: receipt.total,
      lateFee: 0,
      discount: 0,
      totalPaid: receipt.total,
      currency: receipt.currency ?? 'NGN',
      paymentProvider: receipt.method,
      transactionReference: receipt.reference ?? undefined,
      paymentDate: receipt.paidAt,
      status: 'issued',
      issuedAt: receipt.paidAt,
    },
    school: { name: receipt.school.name, address: receipt.school.address ?? undefined },
  };
}

/** Props for {@link ReceiptsPanel}. */
export interface ReceiptsPanelProps {
  childId: string;
  childName: string;
  /** The term whose receipts to list (the bill's term). */
  termId?: string;
  termLabel?: string;
}

/**
 * The Receipts tab (C5): each receipt with what it covers, View (the kept
 * receipt dialog) and Download (a PDF built here with jspdf), plus one PDF of
 * the whole term. The school can turn parent downloads off.
 *
 * @param props - See {@link ReceiptsPanelProps}.
 * @returns The panel.
 */
export function ReceiptsPanel({ childId, childName, termId, termLabel }: ReceiptsPanelProps) {
  const receipts = useParentReceipts(childId, termId);
  const [viewing, setViewing] = useState<ParentReceipt | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (list: ParentReceipt[], key: string, filename: string): Promise<void> => {
    setBusy(key);
    try {
      await downloadReceiptsPdf(list, filename);
    } catch (error) {
      logger.error('payments', 'Could not build the receipt PDF', error);
    } finally {
      setBusy(null);
    }
  };

  if (receipts.isPending) return <div role="status" aria-label="Loading receipts" className="mt-5 h-40 animate-pulse rounded-2xl bg-tl-track" />;
  if (receipts.isError) return <div className="mt-5"><ErrorCard error={receipts.error} title="Receipts couldn't be loaded" onRetry={() => void receipts.refetch()} /></div>;

  const list = receipts.data.data;
  const canDownload = receipts.data.allowParentDownload !== false;
  if (list.length === 0) {
    return <p className="mt-5 rounded-2xl border border-tl-line-soft bg-tl-subtle p-5 text-sm text-tl-muted">No receipts{termLabel ? ` for ${termLabel}` : ''} yet. Each payment produces one.</p>;
  }
  const modal = viewing ? toModalReceipt(viewing) : null;

  return (
    <div className="mt-1.5">
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tl-muted">
          {list.length} receipt{list.length === 1 ? '' : 's'}
          {termLabel ? ` for ${termLabel}` : ''}
        </p>
        {canDownload ? (
          <button
            type="button"
            className={ghostButton}
            disabled={busy !== null}
            onClick={() => void download(list, 'all', receiptFileName(childName, termLabel))}
          >
            {busy === 'all' ? 'Preparing PDF…' : 'Download all as one PDF'}
          </button>
        ) : (
          <p className="text-[13px] text-tl-faint">The school issues printed receipts; downloads are turned off.</p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <caption className="sr-only">Receipts</caption>
          <thead>
            <tr className="border-b border-tl-line-soft text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">
              <th scope="col" className="px-1.5 py-3.5">Receipt no.</th>
              <th scope="col" className="px-1.5 py-3.5">Covers</th>
              <th scope="col" className="px-1.5 py-3.5">Amount</th>
              <th scope="col" className="px-1.5 py-3.5">Date</th>
              <th scope="col" className="px-1.5 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((receipt) => (
              <tr key={receipt.id} className="border-b border-tl-line-soft">
                <td className="px-1.5 py-4 font-bold text-tl-link">{receipt.receiptNumber}</td>
                <td className="px-1.5 py-4 pr-2.5 text-tl-muted">{receipt.items.map((item) => item.label).join(', ')}</td>
                <td className="px-1.5 py-4 font-extrabold text-tl-ink">{naira(receipt.total)}</td>
                <td className="px-1.5 py-4 text-tl-muted">{shortDate(receipt.paidAt)}</td>
                <td className="px-1.5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={rowButton} onClick={() => setViewing(receipt)} aria-label={`View receipt ${receipt.receiptNumber}`}>
                      View
                    </button>
                    {canDownload ? (
                      <button
                        type="button"
                        className={rowButton}
                        disabled={busy !== null}
                        aria-label={`Download receipt ${receipt.receiptNumber}`}
                        onClick={() => void download([receipt], receipt.id, `${receipt.receiptNumber}.pdf`)}
                      >
                        {busy === receipt.id ? 'Preparing…' : 'Download'}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReceiptModal receipt={modal?.receipt ?? null} school={modal?.school} onClose={() => setViewing(null)} />
    </div>
  );
}
