import type { DueFee } from '../types/payments';

/** What the parent will actually be charged for a set of selected fees. */
export interface PaymentTotals {
  /** Sum of the fees themselves. */
  subtotal: number;
  /** Sum of the late-fee surcharges that have actually fallen due. */
  lateFee: number;
  /** `subtotal + lateFee` — the figure the card is charged. */
  total: number;
}

/**
 * True when a fee's late-fee surcharge applies right now.
 *
 * This mirrors `initializePayment` in `talimBE-V2/src/modules/payments`:
 *
 *     a.lateFeeAmount > 0 && a.dueDate && new Date(a.dueDate) < now
 *
 * The date is re-evaluated here rather than trusting the `isOverdue` flag the
 * list was fetched with, because that flag goes stale while the parent is
 * still choosing fees. `isOverdue` is only the fallback for a fee the server
 * sent without a due date.
 *
 * @param fee - The outstanding fee.
 * @param now - The moment to judge against. Defaults to the current time.
 * @returns Whether `fee.lateFeeAmount` is payable.
 */
export function lateFeeApplies(fee: DueFee, now: Date = new Date()): boolean {
  if (!fee.lateFeeAmount || fee.lateFeeAmount <= 0) return false;
  if (!fee.dueDate) return Boolean(fee.isOverdue);
  const due = new Date(fee.dueDate);
  if (Number.isNaN(due.getTime())) return Boolean(fee.isOverdue);
  return due < now;
}

/**
 * Totals a set of selected fees the way the server will.
 *
 * The server recomputes the charge from the fee assignments and adds a late
 * fee **only** for a fee whose due date has passed. Adding every
 * `lateFeeAmount` unconditionally quotes the parent a total that is never
 * charged; leaving them all out quotes one that is too low. Both are wrong on
 * a screen whose whole job is to say what the card is about to be charged.
 *
 * `platformFee` is deliberately absent: the server takes it out of the amount
 * on settlement, so the parent never pays it on top.
 *
 * @param fees - The fees the parent selected.
 * @param now - The moment to judge late fees against. Defaults to now.
 * @returns The subtotal, the late fees that apply, and their sum.
 */
export function computePaymentTotals(fees: readonly DueFee[], now: Date = new Date()): PaymentTotals {
  let subtotal = 0;
  let lateFee = 0;

  for (const fee of fees) {
    subtotal += fee.amount || 0;
    if (lateFeeApplies(fee, now)) lateFee += fee.lateFeeAmount;
  }

  // Money is summed in naira with decimal parts, so round the pair back onto
  // a kobo boundary rather than letting float drift reach the screen.
  const round = (value: number): number => Math.round(value * 100) / 100;
  subtotal = round(subtotal);
  lateFee = round(lateFee);

  return { subtotal, lateFee, total: round(subtotal + lateFee) };
}

/**
 * Formats an amount as naira for display.
 *
 * @param amount - The amount in naira.
 * @returns A string like `₦12,500.00`.
 */
export function formatNaira(amount: number | null | undefined): string {
  return `₦${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
