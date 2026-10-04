import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILDREN } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import Payments from '../Payments';

const [MUSA, , ZAINAB] = CHILDREN;

// Whole checkouts are driven through the UI; give them room on a busy machine.
vi.setConfig({ testTimeout: 20_000 });
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign, origin: 'http://localhost' } });
});

describe('Payments (fixtures)', () => {
  it("shows the active child's bill from the one family request (C2)", async () => {
    const { fixtures } = renderPortal(<Payments />);
    expect(await screen.findByRole('heading', { name: 'Outstanding balance' })).toBeInTheDocument();
    // Musa: tuition 30,000 + exam 15,000 + uniform 9,000 + PTA 8,000.
    expect(screen.getAllByText('₦62,000').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Outstanding balance' })).getByText('Part paid')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Due fees/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('4 fees outstanding · ₦62,000')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/payments/parent/fees')).toHaveLength(1);
    expect(screen.getByText(/All your children: ₦/)).toBeInTheDocument();
  });

  it('shows a fully paid child as cleared, from the same family bill', async () => {
    renderPortal(<Payments />, { childId: ZAINAB.id, prepare: (db) => db.extraPaid.set(ZAINAB.id, { hostel: 70_000 }) });
    expect(await screen.findByText('Cleared')).toBeInTheDocument();
    expect(screen.getByText('Fully paid')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay all' })).not.toBeInTheDocument();
  });

  it('checkout: part payment shows the minimum and what stays outstanding, then hands off with the child header', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Payments />);
    await user.click(await screen.findByRole('button', { name: 'Pay now: Tuition' }));

    const dialog = await screen.findByRole('dialog', { name: 'Tuition' });
    expect(within(dialog).getByText('Balance due')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Part payment/ }));
    expect(within(dialog).getByText('Part payment · minimum ₦10,000')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/amount to pay now/i), '12000');
    expect(within(dialog).getByText('₦18,000 will stay outstanding after this payment.')).toBeInTheDocument();

    await user.click(await within(dialog).findByRole('radio', { name: /Paystack/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Pay ₦12,000' }));

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    const init = requestsTo(fixtures, '/payments/parent/initialize');
    expect(init).toHaveLength(1);
    expect(init[0].headers[CHILD_HEADER]).toBe(MUSA.id);
    expect(init[0].body).toEqual({ childId: MUSA.id, feeAssignmentIds: ['fa-musa-tuition'], amount: 12_000, provider: 'paystack', idempotencyKey: expect.any(String) });
    expect(assign.mock.calls[0][0]).toMatch(/\/payments\/verify\?reference=TLM-FX-/);
  });

  it('checkout: refuses a part payment under the minimum before sending anything', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Payments />);
    await user.click(await screen.findByRole('button', { name: 'Pay now: Tuition' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tuition' });
    await user.click(within(dialog).getByRole('button', { name: /Part payment/ }));
    await user.type(within(dialog).getByLabelText(/amount to pay now/i), '500');
    await user.click(await within(dialog).findByRole('radio', { name: /Paystack/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Pay ₦500' }));
    expect(within(dialog).getByText('The smallest part payment is ₦10,000.')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/payments/parent/initialize')).toHaveLength(0);
  });

  it('pay selected: several fees in one checkout; a must-pay-in-full fee rules out part payment', async () => {
    const user = userEvent.setup();
    renderPortal(<Payments />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select Tuition' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Examination fee' }));
    expect(screen.getByText('2 selected · ₦45,000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pay selected' }));

    const dialog = await screen.findByRole('dialog', { name: '2 fees' });
    expect(within(dialog).getByRole('button', { name: /Part payment/ })).toBeDisabled();
    expect(within(dialog).getByText(/Examination fee to be paid in full/)).toBeInTheDocument();
  });

  it('bank transfer: shows the school account, records the reference, and the payment shows as Pending', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Payments />);
    await user.click(await screen.findByRole('button', { name: 'Pay all' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('radio', { name: /Bank transfer/ }));
    await user.click(within(dialog).getByRole('button', { name: /by bank transfer/ }));

    expect(await within(dialog).findByText('0123456789')).toBeInTheDocument();
    expect(within(dialog).getByText('Zenith Bank')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'I have made the transfer' }));
    expect(within(dialog).getByText('Enter the reference your bank gave the transfer.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Transfer reference'), 'FT2626XYZ');
    await user.click(within(dialog).getByRole('button', { name: 'I have made the transfer' }));
    expect(await within(dialog).findByText('Transfer recorded · Pending')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/payments/parent/bank-transfer')[0].body).toEqual(
      expect.objectContaining({ childId: MUSA.id, amount: 62_000, transferReference: 'FT2626XYZ' }),
    );
    // The answer's `transfer` carries the transaction reference the parent quotes to the bursary.
    const reference = (await within(dialog).findByText(/^TXN-2026-/)).textContent as string;
    // Nothing is marked paid: the balance stays until the bursary confirms, and the
    // held fees cannot be paid again meanwhile (C4 holds, `pendingPayment`).
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(await screen.findAllByText('Payment pending')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Pay all' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay now: Tuition/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Tuition: a payment is pending' })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: 'Payment history' }));
    const row = (await screen.findByText(reference)).closest('tr') as HTMLElement;
    expect(within(row).getByText('Pending')).toBeInTheDocument();
    expect(within(row).getByText('Waiting for the bursary')).toBeInTheDocument();
    expect(screen.getAllByText('₦62,000').length).toBeGreaterThan(0);
  });

  it('bank transfer: a school with no transfer account says so, and goes back to the methods', async () => {
    const user = userEvent.setup();
    renderPortal(<Payments />, { prepare: (db) => (db.noBankAccount = true) });
    await user.click(await screen.findByRole('button', { name: 'Pay all' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('radio', { name: /Bank transfer/ }));
    await user.click(within(dialog).getByRole('button', { name: /by bank transfer/ }));
    expect(await within(dialog).findByText('The school has not set up a bank account for transfers yet.')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Transfer reference')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Choose another method' }));
    expect(await within(dialog).findByText('How much would you like to pay?')).toBeInTheDocument();
  });

  it('receipts tab lists the term receipts with view and download', async () => {
    const user = userEvent.setup();
    renderPortal(<Payments />);
    await user.click(await screen.findByRole('tab', { name: 'Receipts' }));
    expect(await screen.findByRole('button', { name: 'Download all as one PDF' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Download receipt RCP-/ }).length).toBe(3);
  });

  it('methods tab marks the preferred method and saves a new one (C7)', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Payments />);
    await user.click(await screen.findByRole('tab', { name: 'Payment methods' }));
    const group = await screen.findByRole('radiogroup', { name: 'Preferred payment method' });
    expect(await within(group).findByRole('radio', { name: /Paystack/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(group).getByRole('radio', { name: /^Bank transfer/ }));
    // C7 has its own route; `/parent/settings/preferences` would answer 400 for this field.
    await waitFor(() => expect(requestsTo(fixtures, '/parent/settings/payment-method')[0]?.body).toEqual({ preferredProvider: 'bank_transfer' }));
    expect(requestsTo(fixtures, '/parent/settings/preferences')).toHaveLength(0);
  });

  it('"Payment not showing?" opens the office thread', async () => {
    renderPortal(<Payments />);
    expect(await screen.findByRole('link', { name: 'Message the bursary' })).toHaveAttribute('href', '/messages?to=office');
  });

  it('asks for a link code when no child is linked', async () => {
    renderPortal(<Payments />, { scenario: 'empty' });
    expect(await screen.findByText('No child is linked to this account yet')).toBeInTheDocument();
  });

  it('a child without a class can still pay', async () => {
    renderPortal(<Payments />, { scenario: 'no-class' });
    expect(await screen.findByRole('button', { name: 'Pay all' })).toBeInTheDocument();
  });
});
