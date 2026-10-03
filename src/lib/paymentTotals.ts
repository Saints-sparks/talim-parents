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

/** What the checkout needs to know about one selected fee item (C2). */
export interface PayableItem {
  label: string;
  balance: number;
  allowPartial: boolean;
}

/** The outcome of {@link checkPayment}. */
export interface PaymentCheck {
  /** Whether the payment may be started. */
  ok: boolean;
  /** The balance of the selected items. */
  total: number;
  /** What the parent is about to pay. */
  amount: number;
  /** True when it is less than the total (send `amount` to C3 only then). */
  partial: boolean;
  /** The smallest part payment the school accepts here, or null when unknown. */
  minimum: number | null;
  /** What stays outstanding after this payment. */
  remaining: number;
  /** Whether every selected item allows part payment. */
  partAllowed: boolean;
  /** Why it may not be started, in words for the parent. */
  error: string | null;
}

/**
 * Reads a naira amount typed by a parent ("30,000", "₦30000").
 *
 * @param raw - What was typed.
 * @returns Whole naira, or 0.
 */
export function parseNairaInput(raw: string | number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.floor(raw) : 0;
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
}

/**
 * The part-payment rules of C3, checked before anything is sent so the parent
 * hears about a problem straight away (the server enforces the same rules):
 *
 * - paying in full is always allowed while something is owed;
 * - a part payment needs every selected item to allow it;
 * - it must be at least the school's `minimumPartPayment`, or the whole
 *   balance when that is smaller;
 * - it cannot exceed the balance; typing the whole balance is a full payment.
 *
 * @param items - The selected fee items.
 * @param mode - Full or part.
 * @param rawAmount - The part amount as typed.
 * @param minimumPartPayment - The school's minimum, when the API gives it.
 * @returns The check.
 */
export function checkPayment(
  items: readonly PayableItem[],
  mode: 'full' | 'part',
  rawAmount: string | number,
  minimumPartPayment?: number | null,
): PaymentCheck {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.balance), 0);
  const partAllowed = items.length > 0 && items.every((item) => item.allowPartial);
  const minimum = typeof minimumPartPayment === 'number' && minimumPartPayment > 0 ? Math.min(minimumPartPayment, total) : null;
  const base = { total, minimum, partAllowed };

  if (total <= 0) return { ...base, ok: false, amount: 0, partial: false, remaining: 0, error: 'Nothing is owed on the selected fees.' };
  if (mode === 'full') return { ...base, ok: true, amount: total, partial: false, remaining: 0, error: null };

  const amount = parseNairaInput(rawAmount);
  const fail = (error: string): PaymentCheck => ({ ...base, ok: false, amount, partial: amount < total, remaining: Math.max(0, total - amount), error });
  if (!partAllowed) {
    const fixed = items.filter((item) => !item.allowPartial).map((item) => item.label);
    return fail(`${fixed.join(', ')} must be paid in full.`);
  }
  if (amount <= 0) return fail('Enter the amount you want to pay now.');
  if (amount > total) return fail(`That is more than the balance of ${formatWholeNaira(total)}.`);
  if (minimum !== null && amount < minimum) return fail(`The smallest part payment is ${formatWholeNaira(minimum)}.`);
  return { ...base, ok: true, amount, partial: amount < total, remaining: total - amount, error: null };
}

/**
 * Whole naira, as the checkout writes amounts ("₦30,000").
 *
 * @param amount - The amount in naira.
 * @returns The formatted amount.
 */
export function formatWholeNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}
