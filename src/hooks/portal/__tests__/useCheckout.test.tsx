import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { createTestQueryClient } from '../../../test-utils/render';
import { useCheckout } from '../usePortalPayments';

const initializeCheckout = vi.fn();
vi.mock('../../../services/portal/payments', () => ({
  initializeCheckout: (...args: unknown[]) => initializeCheckout(...args),
}));
vi.mock('../../../services/auth.services', () => ({ useAuth: () => ({ parentId: 'p1', isAuthenticated: true }) }));

/**
 * Wraps the hook in a query client.
 *
 * @param props - Children.
 * @param props.children - The hook host.
 * @returns The wrapper.
 */
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

const REQUEST = { childId: 'c1', feeAssignmentIds: ['f1', 'f2'], provider: 'paystack' as const };
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
});

describe('useCheckout', () => {
  it('starts one checkout however many times start is called while it is in flight', async () => {
    let resolve: (value: unknown) => void = () => {};
    initializeCheckout.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useCheckout(), { wrapper });

    await act(async () => {
      void result.current.start(REQUEST);
      void result.current.start(REQUEST);
      void result.current.start(REQUEST);
    });
    expect(initializeCheckout).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ reference: 'R', checkoutUrl: 'https://pay.example/x', allocations: [] }));
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('reuses the idempotency key when the same attempt is retried after a failure', async () => {
    initializeCheckout.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ reference: 'R', checkoutUrl: 'https://pay.example/x', allocations: [] });
    const { result } = renderHook(() => useCheckout(), { wrapper });

    await act(() => result.current.start(REQUEST));
    expect(result.current.error).toBeInstanceOf(Error);
    await act(() => result.current.start({ ...REQUEST, feeAssignmentIds: ['f2', 'f1'] }));

    const keys = initializeCheckout.mock.calls.map((call) => call[0].idempotencyKey);
    expect(keys[1]).toBe(keys[0]);
    expect(assign).toHaveBeenCalledWith('https://pay.example/x');
  });

  it('a changed amount or provider is a new attempt with a new key, and so is reset', async () => {
    initializeCheckout.mockRejectedValue(new Error('timeout'));
    const { result } = renderHook(() => useCheckout(), { wrapper });

    await act(() => result.current.start(REQUEST));
    await act(() => result.current.start({ ...REQUEST, amount: 20_000 }));
    await act(() => result.current.start({ ...REQUEST, amount: 20_000, provider: 'opay' }));
    act(() => result.current.reset());
    await act(() => result.current.start({ ...REQUEST, amount: 20_000, provider: 'opay' }));

    const keys = initializeCheckout.mock.calls.map((call) => call[0].idempotencyKey);
    expect(new Set(keys).size).toBe(4);
  });

  it('does not redirect and reopens the guard when no checkout URL comes back', async () => {
    initializeCheckout.mockResolvedValue({ reference: 'R', checkoutUrl: '', allocations: [] });
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await act(() => result.current.start(REQUEST));
    expect(assign).not.toHaveBeenCalled();
    expect(result.current.submitting).toBe(false);
    expect(String(result.current.error)).toMatch(/Nothing has been charged/);
  });
});
