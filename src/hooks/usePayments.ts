import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  getDueFees,
  getPaymentHistory,
  getPaymentProviders,
  getPaymentSummary,
  getReceipts,
  initializePayment,
  verifyPayment,
} from '../services/payments.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import { sessionStore } from '../lib/session';
import type {
  DueFee,
  DueFeesQuery,
  InitializePaymentPayload,
  InitializePaymentResult,
  PaginatedList,
  PaymentHistoryQuery,
  PaymentProvider,
  PaymentSummary,
  PaymentTransaction,
  Receipt,
  ReceiptsQuery,
  VerifyPaymentResult,
} from '../types/payments';

/**
 * Cached reads and mutations for the payment flow.
 *
 * Money is never served stale: every query here uses `staleTimes.live`, so it
 * refetches on mount rather than showing a parent a balance from ten minutes
 * ago. Provider configuration is the one exception — it is reference data.
 */

/**
 * Outstanding fees for one child.
 *
 * @param studentId - Student record id, or `undefined` while no child is chosen.
 * @param query - Optional academic year / term narrowing.
 * @returns The query result; disabled until a child is chosen.
 */
export function useDueFees(
  studentId: string | undefined,
  query: DueFeesQuery = {},
): UseQueryResult<DueFee[]> {
  return useQuery({
    queryKey: queryKeys.payments.dueFees(studentId ?? 'none', query),
    queryFn: () => getDueFees(studentId as string, query),
    enabled: Boolean(studentId),
    staleTime: staleTimes.live,
  });
}

/**
 * Payment providers the school has enabled.
 *
 * @returns The query result. Cached as reference data.
 */
export function usePaymentProviders(): UseQueryResult<PaymentProvider[]> {
  return useQuery({
    queryKey: queryKeys.payments.providers(),
    queryFn: getPaymentProviders,
    staleTime: staleTimes.reference,
  });
}

/**
 * Paid / outstanding totals across every child.
 *
 * @returns The query result.
 */
export function usePaymentSummary(): UseQueryResult<PaymentSummary> {
  return useQuery({
    queryKey: queryKeys.payments.summary(sessionStore.getParentId() ?? 'anon'),
    queryFn: getPaymentSummary,
    staleTime: staleTimes.live,
  });
}

/**
 * One page of the parent's transactions.
 *
 * @param query - Child, status, date range and page.
 * @returns The query result.
 */
export function usePaymentHistory(
  query: PaymentHistoryQuery = {},
): UseQueryResult<PaginatedList<PaymentTransaction>> {
  return useQuery({
    queryKey: queryKeys.payments.history(sessionStore.getParentId() ?? 'anon', query),
    queryFn: () => getPaymentHistory(query),
    staleTime: staleTimes.live,
    placeholderData: (previous) => previous,
  });
}

/**
 * One page of the parent's receipts.
 *
 * @param query - Child and page.
 * @returns The query result.
 */
export function useReceipts(query: ReceiptsQuery = {}): UseQueryResult<PaginatedList<Receipt>> {
  return useQuery({
    queryKey: queryKeys.payments.receipts(sessionStore.getParentId() ?? 'anon', query),
    queryFn: () => getReceipts(query),
    staleTime: staleTimes.live,
    placeholderData: (previous) => previous,
  });
}

/**
 * Starts a payment and hands back the provider's checkout URL.
 *
 * Never retried — a retried initialisation would create a second pending
 * transaction, and a parent who paid both would be charged twice.
 *
 * @returns The mutation.
 */
export function useInitializePayment() {
  return useMutation<InitializePaymentResult, unknown, InitializePaymentPayload>({
    mutationFn: initializePayment,
  });
}

/**
 * Confirms with the provider what happened to a payment, and refreshes every
 * cached balance once it settles.
 *
 * @returns The mutation. `data.status` — not its success — says whether the
 *   money moved.
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation<VerifyPaymentResult, unknown, string>({
    mutationFn: verifyPayment,
    onSuccess: (result) => {
      if (result.status !== 'pending') {
        // Due fees, the summary, history and receipts have all moved.
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      }
    },
  });
}
