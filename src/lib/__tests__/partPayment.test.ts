import { describe, expect, it } from 'vitest';
import { checkPayment, parseNairaInput } from '../paymentTotals';

const TUITION = { label: 'Tuition', balance: 30_000, allowPartial: true };
const UNIFORM = { label: 'Uniform', balance: 9_000, allowPartial: true };
const EXAM = { label: 'Examination fee', balance: 15_000, allowPartial: false };

describe('checkPayment (C3 part-payment rules)', () => {
  it('pays the whole balance in full mode', () => {
    expect(checkPayment([TUITION, UNIFORM], 'full', '', 10_000)).toMatchObject({ ok: true, amount: 39_000, partial: false, remaining: 0 });
  });

  it('accepts a part payment at or above the minimum and says what stays outstanding', () => {
    expect(checkPayment([TUITION], 'part', '₦12,000', 10_000)).toMatchObject({ ok: true, amount: 12_000, partial: true, remaining: 18_000, error: null });
  });

  it('refuses one under the minimum', () => {
    expect(checkPayment([TUITION], 'part', '9999', 10_000)).toMatchObject({ ok: false, error: 'The smallest part payment is ₦10,000.' });
  });

  it('lowers the minimum to the balance when the balance is smaller', () => {
    const small = { label: 'PTA', balance: 8_000, allowPartial: true };
    expect(checkPayment([small], 'part', '8000', 10_000)).toMatchObject({ ok: true, minimum: 8_000, partial: false });
  });

  it('refuses more than the balance', () => {
    expect(checkPayment([TUITION], 'part', '30001', 10_000).error).toBe('That is more than the balance of ₦30,000.');
  });

  it('refuses part payment when any selected item must be paid in full', () => {
    const check = checkPayment([TUITION, EXAM], 'part', '20000', 10_000);
    expect(check).toMatchObject({ ok: false, partAllowed: false, error: 'Examination fee must be paid in full.' });
  });

  it('treats the whole balance typed in part mode as a full payment (no amount sent)', () => {
    expect(checkPayment([TUITION], 'part', '30000', 10_000)).toMatchObject({ ok: true, partial: false });
  });

  it('states no minimum when the API does not give one', () => {
    expect(checkPayment([TUITION], 'part', '100', null)).toMatchObject({ ok: true, minimum: null });
  });

  it('reads what a parent types', () => {
    expect(parseNairaInput('₦12,000')).toBe(12_000);
    expect(parseNairaInput('abc')).toBe(0);
  });
});
