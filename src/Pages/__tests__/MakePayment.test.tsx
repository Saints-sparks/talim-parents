import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../test-utils/render';
import MakePayment from '../MakePayment';
import type { DueFee, PaymentProvider } from '../../types/payments';

const CHILD = {
  childId: '65a000000000000000000001',
  firstName: 'Amara',
  lastName: 'Okafor',
};

vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: CHILD, updateSelectedStudent: vi.fn() }),
}));

const getDueFees = vi.fn();
const getPaymentProviders = vi.fn();
const initializePayment = vi.fn();
const verifyPayment = vi.fn();

vi.mock('../../services/payments.services', () => ({
  getDueFees: (...args: unknown[]) => getDueFees(...args),
  getPaymentProviders: (...args: unknown[]) => getPaymentProviders(...args),
  initializePayment: (...args: unknown[]) => initializePayment(...args),
  verifyPayment: (...args: unknown[]) => verifyPayment(...args),
  getPaymentSummary: vi.fn(),
  getPaymentHistory: vi.fn(),
  getReceipts: vi.fn(),
}));

/** An outstanding fee, overridable per test. */
function fee(overrides: Partial<DueFee> = {}): DueFee {
  return {
    _id: 'fee-1',
    feeName: 'Third Term Tuition',
    category: 'Tuition',
    feeType: 'one_time',
    description: '',
    amount: 50_000,
    // Far in the future, so no late fee applies by default.
    dueDate: '2099-01-01T00:00:00.000Z',
    lateFeeAmount: 0,
    isOverdue: false,
    status: 'due',
    ...overrides,
  };
}

const PAYSTACK: PaymentProvider = {
  providerName: 'paystack',
  isEnabled: true,
  environment: 'live',
  supportedChannels: ['card'],
  currency: 'NGN',
};

let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  getDueFees.mockResolvedValue([fee()]);
  getPaymentProviders.mockResolvedValue([PAYSTACK]);
  assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign, pathname: '/payments/pay', href: '/payments/pay' },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Walks the flow from fee selection to the review step. */
async function reachReviewStep(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Third Term Tuition');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /continue/i }));

  await screen.findByText('Paystack');
  await user.click(screen.getByRole('radio', { name: /paystack/i }));
  await user.click(screen.getByRole('button', { name: /^continue$/i }));

  return screen.findByRole('button', { name: /confirm & pay/i });
}

describe('MakePayment — selecting fees', () => {
  it('shows a loading state, then the outstanding fees', async () => {
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('Third Term Tuition')).toBeInTheDocument();
  });

  it('tells the parent there is nothing to pay rather than showing an empty list', async () => {
    getDueFees.mockResolvedValue([]);
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    expect(await screen.findByText(/no outstanding fees/i)).toBeInTheDocument();
  });

  it('shows an error with a retry instead of a spinner that never stops', async () => {
    getDueFees.mockRejectedValue(new Error('boom'));
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('quotes a late fee only once the due date has passed', async () => {
    getDueFees.mockResolvedValue([
      fee({ _id: 'a', amount: 10_000, lateFeeAmount: 1_000, dueDate: '2020-01-01T00:00:00.000Z' }),
      fee({ _id: 'b', amount: 20_000, lateFeeAmount: 5_000, dueDate: '2099-01-01T00:00:00.000Z' }),
    ]);
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await screen.findAllByText('Third Term Tuition');
    for (const box of screen.getAllByRole('checkbox')) await user.click(box);

    // 10,000 + 20,000 + 1,000 overdue late fee — NOT the 5,000 that is not due.
    expect(await screen.findByText('₦31,000.00')).toBeInTheDocument();
    expect(screen.queryByText('₦36,000.00')).not.toBeInTheDocument();
  });
});

describe('MakePayment — confirming', () => {
  it('sends exactly the fields InitializePaymentDto declares', async () => {
    initializePayment.mockResolvedValue({ checkoutUrl: 'https://checkout.example/abc' });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    const confirm = await reachReviewStep(user);
    await user.click(confirm);

    await waitFor(() => expect(initializePayment).toHaveBeenCalledTimes(1));
    expect(initializePayment).toHaveBeenCalledWith({
      studentId: CHILD.childId,
      feeAssignmentIds: ['fee-1'],
      providerName: 'paystack',
    });
  });

  it('redirects to the provider checkout', async () => {
    initializePayment.mockResolvedValue({ checkoutUrl: 'https://checkout.example/abc' });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.example/abc'));
  });

  it('never initialises twice, however fast the parent double-clicks', async () => {
    let resolveInit: (value: unknown) => void = () => {};
    initializePayment.mockImplementation(
      () => new Promise((resolve) => { resolveInit = resolve; }),
    );
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    const confirm = await reachReviewStep(user);
    await user.click(confirm);
    await user.click(confirm);
    await user.click(confirm);

    expect(initializePayment).toHaveBeenCalledTimes(1);
    resolveInit({ checkoutUrl: 'https://checkout.example/abc' });
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
  });

  it('keeps the parent on the review step with a readable error when initialisation fails', async () => {
    const { ApiError } = await import('../../lib/apiError');
    initializePayment.mockRejectedValue(
      new ApiError('PAYMENT_PROVIDER_ERROR', 'Payment initialization failed: bad key', 502),
    );
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user));

    expect(await screen.findByRole('alert')).toHaveTextContent(/payment initialization failed/i);
    expect(assign).not.toHaveBeenCalled();
    // …and the button is live again, so a retry is possible.
    expect(screen.getByRole('button', { name: /confirm & pay/i })).toBeEnabled();
  });

  it('does not redirect when the provider returns no checkout URL', async () => {
    initializePayment.mockResolvedValue({ checkoutUrl: '' });
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await user.click(await reachReviewStep(user));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('MakePayment — verifying the provider callback', () => {
  /** Renders the page as the provider redirect lands on it. */
  function renderCallback(query: string) {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign, pathname: '/payments/verify' },
    });
    return renderWithProviders(<MakePayment />, { route: `/payments/verify${query}` });
  }

  it('reports a successful payment, with its receipt number', async () => {
    verifyPayment.mockResolvedValue({
      success: true,
      status: 'successful',
      transaction: { totalAmount: 50_000 },
      receipt: { receiptNumber: 'RCP-0001' },
    });
    renderCallback('?reference=TLM-123');

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
    expect(screen.getByText(/RCP-0001/)).toBeInTheDocument();
    expect(screen.getByText(/₦50,000.00 has been paid/)).toBeInTheDocument();
    expect(verifyPayment).toHaveBeenCalledWith('TLM-123');
  });

  it('reports a declined payment as failed — the request succeeding is not the payment succeeding', async () => {
    // The endpoint answers HTTP 200 with success:true even when the money did
    // not move; only `status` says what happened.
    verifyPayment.mockResolvedValue({
      success: true,
      status: 'failed',
      transaction: { failureReason: 'Insufficient funds' },
    });
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

  it('distinguishes "we could not check" from "the payment failed"', async () => {
    const { ApiError } = await import('../../lib/apiError');
    verifyPayment.mockRejectedValue(ApiError.unreachable());
    renderCallback('?reference=TLM-126');

    expect(await screen.findByText(/couldn't confirm this payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();
    // The reference is on screen so the parent can quote it to the school.
    expect(screen.getByText('TLM-126')).toBeInTheDocument();
  });

  it('lets the parent re-check a payment we could not confirm', async () => {
    const { ApiError } = await import('../../lib/apiError');
    verifyPayment.mockRejectedValueOnce(ApiError.unreachable()).mockResolvedValueOnce({
      success: true,
      status: 'successful',
      transaction: { totalAmount: 50_000 },
      receipt: null,
    });
    const user = userEvent.setup();
    renderCallback('?reference=TLM-127');

    await screen.findByText(/couldn't confirm this payment/i);
    await user.click(screen.getByRole('button', { name: /check again/i }));

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
  });

  it('accepts Paystack\'s trxref when no reference param is present', async () => {
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
    vi.doMock('../../contexts/SelectedStudentContext', () => ({
      useSelectedStudent: () => ({ selectedStudent: null, updateSelectedStudent: vi.fn() }),
    }));
    vi.resetModules();
    const { default: Fresh } = await import('../MakePayment');
    renderWithProviders(<Fresh />, { route: '/payments/pay' });

    expect(await screen.findByText(/choose a child first/i)).toBeInTheDocument();
    expect(getDueFees).not.toHaveBeenCalled();
    vi.doUnmock('../../contexts/SelectedStudentContext');
  });
});

describe('MakePayment — provider step', () => {
  it('explains when the school has enabled no providers', async () => {
    getPaymentProviders.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await screen.findByText('Third Term Tuition');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/no payment providers available/i)).toBeInTheDocument();
  });

  it('flags a provider running in test mode', async () => {
    getPaymentProviders.mockResolvedValue([{ ...PAYSTACK, environment: 'test' as const }]);
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await screen.findByText('Third Term Tuition');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/test mode/i)).toBeInTheDocument();
  });

  it('cannot continue until a provider is chosen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MakePayment />, { route: '/payments/pay' });

    await screen.findByText('Third Term Tuition');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    const providerStep = await screen.findByRole('group');
    expect(within(providerStep).getByRole('radio', { name: /paystack/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
  });
});
