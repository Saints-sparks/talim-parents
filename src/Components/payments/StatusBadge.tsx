/** Tailwind classes per status the payments API can send. */
const TONES: Record<string, string> = {
  // Due-fee display statuses.
  overdue: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  due: 'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',
  // PaymentStatus.
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  successful: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  failed: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
  refunded: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300',
  partial: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
  // ReceiptStatus.
  issued: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  voided: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
};

/**
 * A coloured pill for any payment, fee or receipt status.
 *
 * @param props - Component props.
 * @param props.status - The status as the API spells it.
 * @returns The badge.
 */
export function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;
  const tone = TONES[status.toLowerCase()] ?? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tone}`}>{status}</span>
  );
}
