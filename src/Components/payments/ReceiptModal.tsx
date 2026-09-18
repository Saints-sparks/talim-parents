import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatNaira } from '../../lib/paymentTotals';
import { amountInWords } from '../../lib/amountInWords';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { providerMeta } from './providerMeta';
import type { Receipt } from '../../types/payments';
import type { School } from '../../services/school.services';

/**
 * Formats a payment date for the printed receipt.
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
 * A printable receipt, shown as a modal over the Payments page.
 *
 * The header uses only fields the school record actually has — no
 * placeholder address or phone number when the school hasn't set one, since a
 * fabricated detail on a financial document is worse than a blank line.
 *
 * @param props - Component props.
 * @param props.receipt - The receipt to show, or `null` to render nothing.
 * @param props.school - The parent's school, for the receipt header.
 * @param props.onClose - Closes the modal.
 * @returns The modal, or `null` when there is no receipt.
 */
export function ReceiptModal({
  receipt,
  school,
  onClose,
}: {
  receipt: Receipt | null;
  school: School | undefined;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useLockBodyScroll(Boolean(receipt));

  useEffect(() => {
    if (!receipt) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const providerName = receipt.paymentProvider ? providerMeta(receipt.paymentProvider).name : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-t-2xl bg-[#003366] p-6 text-white dark:bg-blue-900">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p id="receipt-modal-title" className="truncate text-lg font-bold uppercase tracking-wide">
                {school?.name ?? 'School fees receipt'}
              </p>
              {school?.address && <p className="mt-1 text-xs text-blue-200">{school.address}</p>}
              {(school?.phoneNumber || school?.email) && (
                <p className="text-xs text-blue-200">
                  {[school?.phoneNumber, school?.email].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">
                School fees receipt
              </p>
              <div className="mt-1 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                Payment successful
              </div>
            </div>
          </div>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close receipt"
          className="absolute right-4 top-4 rounded-full bg-black/20 p-1.5 text-white hover:bg-black/30"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2 dark:bg-slate-800/60">
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="w-32 shrink-0 text-gray-500 dark:text-slate-400">Receipt no.</span>
                <span className="font-bold text-[#003366] dark:text-blue-300">{receipt.receiptNumber}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 shrink-0 text-gray-500 dark:text-slate-400">Transaction ref.</span>
                <span className="select-all text-xs font-medium dark:text-slate-200">
                  {receipt.transactionReference ?? '—'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 shrink-0 text-gray-500 dark:text-slate-400">Payment date</span>
                <span className="font-medium dark:text-slate-200">{formatDate(receipt.paymentDate)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="w-32 shrink-0 text-gray-500 dark:text-slate-400">Payment method</span>
                <span className="font-medium dark:text-slate-200">{providerName ?? '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 shrink-0 text-gray-500 dark:text-slate-400">Payment status</span>
                <span className="font-semibold text-green-600 dark:text-green-400">Successful</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Fee breakdown
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-[#003366] text-white dark:bg-blue-900">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left">#</th>
                    <th scope="col" className="px-3 py-2 text-left">Fee item</th>
                    <th scope="col" className="px-3 py-2 text-left">Category</th>
                    <th scope="col" className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {(receipt.feeItems ?? []).map((item, index) => (
                    <tr key={`${item.feeName}-${index}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-gray-400 dark:text-slate-500">{index + 1}</td>
                      <td className="px-3 py-2 font-medium dark:text-slate-200">{item.feeName}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{item.category}</td>
                      <td className="px-3 py-2 text-right dark:text-slate-200">{formatNaira(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="rounded-xl bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
              <p className="mb-1 text-xs text-gray-500 dark:text-slate-400">Amount in words</p>
              <p className="font-semibold italic text-gray-700 dark:text-slate-200">
                {amountInWords(receipt.totalPaid)}
              </p>
            </div>
            <div className="space-y-1 text-sm sm:text-right">
              <div className="flex justify-between gap-12">
                <span className="text-gray-500 dark:text-slate-400">Subtotal</span>
                <span className="font-medium dark:text-slate-200">{formatNaira(receipt.subtotal)}</span>
              </div>
              {receipt.lateFee > 0 && (
                <div className="flex justify-between gap-12">
                  <span className="text-gray-500 dark:text-slate-400">Late fee</span>
                  <span className="font-medium dark:text-slate-200">{formatNaira(receipt.lateFee)}</span>
                </div>
              )}
              {receipt.discount > 0 && (
                <div className="flex justify-between gap-12">
                  <span className="text-gray-500 dark:text-slate-400">Discount</span>
                  <span className="font-medium dark:text-slate-200">-{formatNaira(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-12 border-t border-gray-200 pt-1 dark:border-slate-700">
                <span className="font-bold text-gray-800 dark:text-slate-100">Total paid</span>
                <span className="text-base font-bold text-green-600 dark:text-green-400">
                  {formatNaira(receipt.totalPaid)}
                </span>
              </div>
            </div>
          </div>

          {receipt.verificationCode && (
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Verification code</p>
                <p className="select-all font-mono font-bold text-[#003366] dark:text-blue-300">
                  {receipt.verificationCode}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            {receipt.receiptPdfUrl && (
              <a
                href={receipt.receiptPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#003366]/90 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Download PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
