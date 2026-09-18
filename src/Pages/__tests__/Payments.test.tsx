import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../test-utils/render';
import Payments from '../Payments';
import type { DueFee, PaymentProvider } from '../../types/payments';

const CHILD = {
  childId: '65d0000000000000000000c1',
  firstName: 'Amara',
  lastName: 'Okafor',
  className: 'JSS 1',
};

vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: CHILD, updateSelectedStudent: vi.fn() }),
}));
vi.mock('../../contexts/ParentOnboardingContext', () => ({
  useParentOnboarding: () => ({ wards: [CHILD] }),
}));
vi.mock('../../hooks/useSchool', () => ({
  useSchool: () => ({ data: { name: 'Bright Star Academy', phoneNumber: '08000000000' } }),
}));

const getDueFees = vi.fn();
const getPaymentSummary = vi.fn();
const getPaymentHistory = vi.fn();
const getReceipts = vi.fn();
const getPaymentProviders = vi.fn();

vi.mock('../../services/payments.services', () => ({
  getDueFees: (...a: unknown[]) => getDueFees(...a),
  getPaymentSummary: (...a: unknown[]) => getPaymentSummary(...a),
  getPaymentHistory: (...a: unknown[]) => getPaymentHistory(...a),
  getReceipts: (...a: unknown[]) => getReceipts(...a),
  getPaymentProviders: (...a: unknown[]) => getPaymentProviders(...a),
  initializePayment: vi.fn(),
  verifyPayment: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  getDueFees.mockResolvedValue([fee()]);
  getPaymentSummary.mockResolvedValue({ success: true, totalPaid: 100_000, totalOutstanding: 50_000, totalReceipts: 2 });
  getPaymentHistory.mockResolvedValue({ data: [], total: 0 });
  getReceipts.mockResolvedValue({ data: [], total: 0 });
  getPaymentProviders.mockResolvedValue([PAYSTACK]);
});

describe('Payments — overview', () => {
  it('shows the outstanding total for the selected child, not every child', async () => {
    renderWithProviders(<Payments />);
    await screen.findByText('Third Term Tuition');
    // getDueFees is scoped to studentId — assert it was called with the
    // selected child, never with none / all children.
    expect(getDueFees).toHaveBeenCalledWith(CHILD.childId, {});
  });

  it('only counts overdue fees toward the overdue amount stat', async () => {
    getDueFees.mockResolvedValue([
      fee({ _id: 'a', amount: 10_000, isOverdue: true }),
      fee({ _id: 'b', amount: 20_000, isOverdue: false }),
    ]);
    renderWithProviders(<Payments />);
    await screen.findAllByText('Third Term Tuition');

    // Overdue amount stat should read ₦10,000.00, not ₦30,000.00.
    const overdueLabel = await screen.findByText('Overdue amount');
    const card = overdueLabel.closest('div');
    expect(card).toHaveTextContent('₦10,000.00');
  });

  it('badges the Due Fees tab with the outstanding count', async () => {
    getDueFees.mockResolvedValue([fee({ _id: 'a' }), fee({ _id: 'b' })]);
    renderWithProviders(<Payments />);
    await screen.findAllByText('Third Term Tuition');
    // The stat card also has a "View due fees" link, so match the tab by its
    // exact leading text rather than a loose /due fees/i on every button.
    const tab = screen.getAllByRole('button').find((el) => el.textContent?.startsWith('Due Fees'));
    expect(tab).toBeDefined();
    expect(tab).toHaveTextContent('2');
  });
});

describe('Payments — tabs', () => {
  it('switches to payment history and requests that child\'s transactions', async () => {
    getPaymentHistory.mockResolvedValue({
      data: [
        {
          _id: 't1',
          studentId: CHILD.childId,
          feeAssignmentIds: ['fee-1'],
          providerName: 'paystack',
          internalReference: 'TLM-001',
          amount: 50_000,
          platformFee: 0,
          schoolAmount: 50_000,
          totalAmount: 50_000,
          currency: 'NGN',
          status: 'successful',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    const user = userEvent.setup();
    renderWithProviders(<Payments />);
    await screen.findByText('Third Term Tuition');

    await user.click(screen.getByRole('button', { name: /paid history/i }));

    expect(await screen.findByText('TLM-001')).toBeInTheDocument();
    await waitFor(() =>
      expect(getPaymentHistory).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: CHILD.childId }),
      ),
    );
  });

  it('shows a real empty state on Payment Methods rather than a hardcoded provider list', async () => {
    getPaymentProviders.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<Payments />);
    await screen.findByText('Third Term Tuition');

    await user.click(screen.getByRole('button', { name: /payment methods/i }));
    expect(await screen.findByText(/no payment providers available/i)).toBeInTheDocument();
  });

  it('lists only the providers the school actually enabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Payments />);
    await screen.findByText('Third Term Tuition');

    await user.click(screen.getByRole('button', { name: /payment methods/i }));
    expect(await screen.findByText('Paystack')).toBeInTheDocument();
    expect(screen.queryByText('OPay')).not.toBeInTheDocument();
    expect(screen.queryByText('Stripe')).not.toBeInTheDocument();
  });
});

describe('Payments — no child selected', () => {
  it('asks the parent to choose a child instead of fetching for nobody', async () => {
    vi.doMock('../../contexts/SelectedStudentContext', () => ({
      useSelectedStudent: () => ({ selectedStudent: null, updateSelectedStudent: vi.fn() }),
    }));
    vi.resetModules();
    const { default: Fresh } = await import('../Payments');
    renderWithProviders(<Fresh />);

    expect(await screen.findByText(/no child selected/i)).toBeInTheDocument();
    expect(getDueFees).not.toHaveBeenCalled();
    vi.doUnmock('../../contexts/SelectedStudentContext');
  });
});

describe('Payments — errors', () => {
  it('shows a retryable error instead of an empty-fees state when the load fails', async () => {
    const { ApiError } = await import('../../lib/apiError');
    getDueFees.mockRejectedValue(ApiError.unreachable());
    renderWithProviders(<Payments />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/all fees are paid/i)).not.toBeInTheDocument();
  });
});
