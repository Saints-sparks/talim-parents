import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../test-utils/render';
import MakePayment from '../MakePayment';
import type { PaymentProvider } from '../../types/payments';
import type { FamilyFees, FeeItem } from '../../types/portal/payments';

const CHILD_ID = '65a000000000000000000001';

vi.mock('../../hooks/useActiveChild', () => ({
  useActiveChild: () => ({ child: { id: CHILD_ID, name: 'Amara Okafor' }, childId: CHILD_ID, status: 'ready' }),
}));

vi.mock('../../services/auth.services', () => ({
  useAuth: () => ({ parentId: 'p1', isAuthenticated: true, user: { firstName: 'Ada' } }),
}));

const getFamilyFees = vi.fn();
const getChildProviders = vi.fn();
const initializeCheckout = vi.fn();
const verifyPayment = vi.fn();

vi.mock('../../services/portal/payments', () => ({
  getFamilyFees: (...args: unknown[]) => getFamilyFees(...args),
  getChildProviders: (...args: unknown[]) => getChildProviders(...args),
  initializeCheckout: (...args: unknown[]) => initializeCheckout(...args),
  getBankDetails: vi.fn(),
  submitBankTransfer: vi.fn(),
  getParentReceipts: vi.fn(),
  getPaymentHistory: vi.fn(),
}));

vi.mock('../../services/payments.services', () => ({
  verifyPayment: (...args: unknown[]) => verifyPayment(...args),
}));

/**
 * One fee item with a balance, overridable per test.
 *
 * @param overrides - Fields to change.
 * @returns The item.
 */
function item(overrides: Partial<FeeItem> = {}): FeeItem {
  return {
    id: 'fee-1',
    label: 'Third Term Tuition',
    category: 'Tuition',
    dueDate: '2099-01-01',
    amount: 50_000,
    paid: 0,
    balance: 50_000,
    status: 'due',
    allowPartial: true,
    parts: [],
    ...overrides,
  };
}

/**
 * The family bill with one child and these items.
 *
 * @param items - The child's items.
 * @param minimumPartPayment - The school's minimum.
 * @returns The C2 body.
 */
function family(items: FeeItem[], minimumPartPayment: number | null = 10_000): FamilyFees {
  const outstanding = items.reduce((sum, entry) => sum + entry.balance, 0);
  return {
    children: [{ child: { id: CHILD_ID, name: 'Amara Okafor', school: { id: 's1', name: 'Bright Star' } }, outstanding, paid: 0, billTotal: outstanding, overdue: 0, items, minimumPartPayment }],
    totals: { outstanding, paidThisSession: 0, receipts: 0, overdue: 0 },
  };
}

const PAYSTACK: PaymentProvider = { providerName: 'paystack', isEnabled: true, environment: 'live', supportedChannels: ['card'], currency: 'NGN' };

let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  getFamilyFees.mockResolvedValue(family([item()]));
  getChildProviders.mockResolvedValue([PAYSTACK]);
  assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign, pathname: '/payments/pay', href: '/payments/pay' },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Walks the flow from fee selection to the review step.
 *
 * @param user - The user-event instance.
 * @param partAmount - Pay this much in part instead of in full.
 * @returns The confirm button.
 */
async function reachReviewStep(user: ReturnType<typeof userEvent.setup>, partAmount?: string) {
  await screen.findByText('Third Term Tuition');
  await user.click(screen.getByRole('checkbox'));
  if (partAmount) {
    await user.click(screen.getByRole('radio', { name: /part payment/i }));
    await user.type(screen.getByLabelText(/amount to pay now/i), partAmount);
  }
  await user.click(screen.getByRole('button', { name: /continue/i }));

  await screen.findByText('Paystack');
  await user.click(screen.getByRole('radio', { name: /paystack/i }));
  await user.click(screen.getByRole('button', { name: /^continue$/i }));

  return screen.findByRole('button', { name: /confirm & pay/i });
}

describe('MakePayment — selecting fees', () => {
  it('shows a loading state, then the outstanding fees from the family bill (C2)', async () => {
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('Third Term Tuition')).toBeInTheDocument();
  });

  it('tells the parent there is nothing to pay rather than showing an empty list', async () => {
    getFamilyFees.mockResolvedValue(family([]));
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    expect(await screen.findByText(/no outstanding fees/i)).toBeInTheDocument();
  });

  it('shows an error with a retry instead of a spinner that never stops', async () => {
    getFamilyFees.mockRejectedValue(new Error('boom'));
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('applies the part-payment rules before anything is sent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    await screen.findByText('Third Term Tuition');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('radio', { name: /part payment/i }));
    const amount = screen.getByLabelText(/amount to pay now/i);

    await user.type(amount, '5000');
    expect(screen.getByText('The smallest part payment is ₦10,000.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();

    await user.clear(amount);
    await user.type(amount, '60000');
    expect(screen.getByText('That is more than the balance of ₦50,000.')).toBeInTheDocument();

    await user.clear(amount);
    await user.type(amount, '20000');
    expect(screen.getByText('₦30,000.00 will stay outstanding after this payment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('does not offer part payment on a fee the school wants paid in full', async () => {
    getFamilyFees.mockResolvedValue(family([item({ allowPartial: false })]));
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    await screen.findByText('Third Term Tuition');
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('radio', { name: /part payment/i })).toBeDisabled();
  });
});

describe('MakePayment — confirming', () => {
  it('sends the child, fees, provider and an idempotency key (no amount when paying in full)', async () => {
    initializeCheckout.mockResolvedValue({ reference: 'R1', checkoutUrl: 'https://checkout.example/abc', allocations: [] });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user));

    await waitFor(() => expect(initializeCheckout).toHaveBeenCalledTimes(1));
    const payload = initializeCheckout.mock.calls[0][0];
    expect(payload).toEqual({ childId: CHILD_ID, feeAssignmentIds: ['fee-1'], provider: 'paystack', idempotencyKey: expect.any(String) });
    expect(payload.idempotencyKey.length).toBeGreaterThan(8);
  });

  it('sends the part amount when paying less than the balance', async () => {
    initializeCheckout.mockResolvedValue({ reference: 'R1', checkoutUrl: 'https://checkout.example/abc', allocations: [] });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user, '20000'));
    await waitFor(() => expect(initializeCheckout).toHaveBeenCalledWith(expect.objectContaining({ amount: 20_000 })));
  });

  it('redirects to the provider checkout', async () => {
    initializeCheckout.mockResolvedValue({ reference: 'R1', checkoutUrl: 'https://checkout.example/abc', allocations: [] });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.example/abc'));
  });

  it('never initialises twice, however fast the parent triple-clicks', async () => {
    let resolveInit: (value: unknown) => void = () => {};
    initializeCheckout.mockImplementation(() => new Promise((resolve) => { resolveInit = resolve; }));
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    const confirm = await reachReviewStep(user);
    await user.click(confirm);
    await user.click(confirm);
    await user.click(confirm);

    expect(initializeCheckout).toHaveBeenCalledTimes(1);
    resolveInit({ reference: 'R1', checkoutUrl: 'https://checkout.example/abc', allocations: [] });
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
  });

  it('keeps the parent on the review step with a readable error, and a retry reuses the same idempotency key', async () => {
    const { ApiError } = await import('../../lib/apiError');
    initializeCheckout
      .mockRejectedValueOnce(new ApiError('SERVICE_UNAVAILABLE', 'The payment service did not answer.', 503))
      .mockResolvedValueOnce({ reference: 'R1', checkoutUrl: 'https://checkout.example/abc', allocations: [] });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach/i);
    expect(assign).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));
    await waitFor(() => expect(initializeCheckout).toHaveBeenCalledTimes(2));
    const [first, second] = initializeCheckout.mock.calls.map((call) => call[0].idempotencyKey);
    expect(second).toBe(first);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.example/abc'));
  });

  it('does not redirect when the provider returns no checkout URL', async () => {
    initializeCheckout.mockResolvedValue({ reference: 'R1', checkoutUrl: '', allocations: [] });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('MakePayment — verifying the provider callback', () => {
  /**
   * Renders the page as the provider redirect lands on it.
   *
   * @param query - The callback's query string.
   * @returns The render result.
   */
  function renderCallback(query: string) {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign, pathname: '/payments/verify' },
    });
    return renderWithProviders(<MakePayment />, { route: `/payments/verify${query}` });
  }

  it('reports a successful payment, with its receipt number', async () => {
    verifyPayment.mockResolvedValue({ success: true, status: 'successful', transaction: { totalAmount: 50_000 }, receipt: { receiptNumber: 'RCP-0001' } });
    renderCallback('?reference=TLM-123');

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
    expect(screen.getByText(/RCP-0001/)).toBeInTheDocument();
    expect(screen.getByText(/₦50,000.00 has been paid/)).toBeInTheDocument();
    expect(verifyPayment).toHaveBeenCalledWith('TLM-123');
  });

  it('reports a declined payment as failed — the request succeeding is not the payment succeeding', async () => {
    verifyPayment.mockResolvedValue({ success: true, status: 'failed', transaction: { failureReason: 'Insufficient funds' } });
    renderCallback('?reference=TLM-124');

    expect(await screen.findByText(/payment failed/i)).toBeInTheDocument();
    expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument();
  });

  it('reports a pending payment without telling the parent to pay again', async () => {
    verifyPayment.mockResolvedValue({ success: true, status: 'pending', transaction: {} });
    renderCallback('?reference=TLM-125');

    expect(await screen.findByText(/payment pending/i)).toBeInTheDocument();
    expect(screen.getByText(/don't pay again/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
  });

  it('distinguishes "we could not check" (unverified) from "the payment failed"', async () => {
    const { ApiError } = await import('../../lib/apiError');
    verifyPayment.mockRejectedValue(ApiError.unreachable());
    renderCallback('?reference=TLM-126');

    expect(await screen.findByText(/couldn't confirm this payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();
    expect(screen.getByText('TLM-126')).toBeInTheDocument();
  });

  it('lets the parent re-check a payment we could not confirm', async () => {
    const { ApiError } = await import('../../lib/apiError');
    verifyPayment.mockRejectedValueOnce(ApiError.unreachable()).mockResolvedValueOnce({ success: true, status: 'successful', transaction: { totalAmount: 50_000 }, receipt: null });
    const user = userEvent.setup();
    renderCallback('?reference=TLM-127');

    await screen.findByText(/couldn't confirm this payment/i);
    await user.click(screen.getByRole('button', { name: /check again/i }));

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
  });

  it("accepts Paystack's trxref when no reference param is present", async () => {
    verifyPayment.mockResolvedValue({ success: true, status: 'successful', transaction: {}, receipt: null });
    renderCallback('?trxref=TLM-128');
    await waitFor(() => expect(verifyPayment).toHaveBeenCalledWith('TLM-128'));
  });

  it('verifies once per callback, not once per render', async () => {
    verifyPayment.mockResolvedValue({ success: true, status: 'successful', transaction: {}, receipt: null });
    const { rerender } = renderCallback('?reference=TLM-129');

    await screen.findByText(/payment successful/i);
    rerender(<MakePayment />);
    await waitFor(() => expect(verifyPayment).toHaveBeenCalledTimes(1));
  });

  it('says a cancelled payment charged nothing', async () => {
    renderCallback('?status=cancelled');
    expect(await screen.findByText(/payment cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing was charged/i)).toBeInTheDocument();
    expect(verifyPayment).not.toHaveBeenCalled();
  });

  it('does not claim a failure when the callback carries no reference at all', async () => {
    renderCallback('');
    expect(await screen.findByText(/nothing to confirm/i)).toBeInTheDocument();
    expect(verifyPayment).not.toHaveBeenCalled();
  });
});

describe('MakePayment — no child selected', () => {
  it('asks the parent to pick a child rather than requesting fees for nobody', async () => {
    vi.doMock('../../hooks/useActiveChild', () => ({
      useActiveChild: () => ({ child: null, childId: undefined, status: 'empty' }),
    }));
    vi.resetModules();
    const { default: Fresh } = await import('../MakePayment');
    renderWithProviders(<Fresh />, { route: '/payments/pay' });

    expect(await screen.findByText(/choose a child first/i)).toBeInTheDocument();
    vi.doUnmock('../../hooks/useActiveChild');
  });
});

describe('MakePayment — provider step', () => {
  /**
   * Gets to the provider step.
   *
   * @param user - The user-event instance.
   */
  async function toProviders(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByText('Third Term Tuition');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /continue/i }));
  }

  it("asks for the child's school's providers", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    await toProviders(user);
    await screen.findByText('Paystack');
    expect(getChildProviders).toHaveBeenCalledWith(CHILD_ID);
  });

  it('explains when the school has enabled no providers', async () => {
    getChildProviders.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    await toProviders(user);
    expect(await screen.findByText(/no payment providers available/i)).toBeInTheDocument();
  });

  it('flags a provider running in test mode', async () => {
    getChildProviders.mockResolvedValue([{ ...PAYSTACK, environment: 'test' as const }]);
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    await toProviders(user);
    expect(await screen.findByText(/test mode/i)).toBeInTheDocument();
  });

  it('cannot continue until a provider is chosen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    await toProviders(user);

    const providerStep = await screen.findByRole('group');
    expect(within(providerStep).getByRole('radio', { name: /paystack/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
  });
});
