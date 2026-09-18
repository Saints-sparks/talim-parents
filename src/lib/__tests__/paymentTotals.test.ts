import { describe, it, expect } from 'vitest';
import { computePaymentTotals, lateFeeApplies, formatNaira } from '../paymentTotals';
import type { DueFee } from '../../types/payments';

const NOW = new Date('2026-06-15T12:00:00.000Z');

/** Builds a due fee with sensible defaults, overriding only what a test cares about. */
function fee(overrides: Partial<DueFee> = {}): DueFee {
  return {
    _id: 'f1',
    feeName: 'Tuition',
    category: 'Tuition',
    feeType: 'one_time',
    description: '',
    amount: 50_000,
    dueDate: '2026-09-01T00:00:00.000Z',
    lateFeeAmount: 0,
    isOverdue: false,
    status: 'due',
    ...overrides,
  };
}

describe('lateFeeApplies', () => {
  it('is false while the due date is still ahead', () => {
    expect(lateFeeApplies(fee({ lateFeeAmount: 5_000, dueDate: '2026-09-01T00:00:00.000Z' }), NOW)).toBe(false);
  });

  it('is true once the due date has passed', () => {
    expect(lateFeeApplies(fee({ lateFeeAmount: 5_000, dueDate: '2026-01-01T00:00:00.000Z' }), NOW)).toBe(true);
  });

  it('is false when the fee carries no late-fee amount, however overdue', () => {
    expect(lateFeeApplies(fee({ lateFeeAmount: 0, dueDate: '2020-01-01T00:00:00.000Z', isOverdue: true }), NOW)).toBe(false);
  });

  it('falls back to isOverdue when the server sent no due date', () => {
    expect(lateFeeApplies(fee({ lateFeeAmount: 5_000, dueDate: null, isOverdue: true }), NOW)).toBe(true);
    expect(lateFeeApplies(fee({ lateFeeAmount: 5_000, dueDate: null, isOverdue: false }), NOW)).toBe(false);
  });

  it('falls back to isOverdue when the due date is unparseable', () => {
    expect(lateFeeApplies(fee({ lateFeeAmount: 5_000, dueDate: 'not-a-date', isOverdue: true }), NOW)).toBe(true);
  });
});

describe('computePaymentTotals', () => {
  it('sums the fees themselves', () => {
    const totals = computePaymentTotals([fee({ amount: 50_000 }), fee({ _id: 'f2', amount: 12_500 })], NOW);
    expect(totals).toEqual({ subtotal: 62_500, lateFee: 0, total: 62_500 });
  });

  it('adds a late fee only for the fee that is actually overdue', () => {
    const totals = computePaymentTotals(
      [
        // Overdue: the surcharge is charged.
        fee({ _id: 'a', amount: 50_000, lateFeeAmount: 5_000, dueDate: '2026-01-01T00:00:00.000Z' }),
        // Not yet due: the surcharge is NOT charged, even though the fee
        // advertises one. Quoting it here would overstate the total.
        fee({ _id: 'b', amount: 20_000, lateFeeAmount: 2_000, dueDate: '2026-12-01T00:00:00.000Z' }),
      ],
      NOW,
    );
    expect(totals).toEqual({ subtotal: 70_000, lateFee: 5_000, total: 75_000 });
  });

  it('matches what the server charges: totalAmount = subtotal + lateFee', () => {
    // talimBE-V2 initializePayment: totalAmount = subtotal + lateFee, and
    // platformFee is deducted from it rather than added on top.
    const fees = [fee({ amount: 30_000, lateFeeAmount: 1_500, dueDate: '2026-02-01T00:00:00.000Z' })];
    const { subtotal, lateFee, total } = computePaymentTotals(fees, NOW);
    expect(total).toBe(subtotal + lateFee);
    expect(total).toBe(31_500);
  });

  it('is zero for an empty selection', () => {
    expect(computePaymentTotals([], NOW)).toEqual({ subtotal: 0, lateFee: 0, total: 0 });
  });

  it('keeps kobo exact instead of letting float drift reach the screen', () => {
    const totals = computePaymentTotals(
      [fee({ _id: 'a', amount: 0.1 }), fee({ _id: 'b', amount: 0.2 })],
      NOW,
    );
    expect(totals.subtotal).toBe(0.3);
    expect(totals.total).toBe(0.3);
  });
});

describe('formatNaira', () => {
  it('always shows two decimal places', () => {
    expect(formatNaira(50_000)).toBe('₦50,000.00');
    expect(formatNaira(1_234.5)).toBe('₦1,234.50');
  });

  it('renders a missing amount as zero rather than NaN', () => {
    expect(formatNaira(undefined)).toBe('₦0.00');
    expect(formatNaira(null)).toBe('₦0.00');
  });
});
