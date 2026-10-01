import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../../services/auth.services';
import {
  getBankDetails,
  getChildProviders,
  getFamilyFees,
  getParentReceipts,
  getPaymentHistory,
  initializeCheckout,
  submitBankTransfer,
} from '../../services/portal/payments';
import { queryKeys, staleTimes } from '../../lib/queryKeys';
import { logger } from '../../lib/logger';
import type { PaymentProvider, PaymentProviderName } from '../../types/payments';
import type { Paginated } from '../../types/portal/common';
import type {
  BankDetails,
  BankTransferPayload,
  BankTransferResult,
  FamilyFees,
  PaymentHistoryRow,
  ReceiptList,
} from '../../types/portal/payments';

/**
 * Cached reads and guarded writes for Part C. Money is never served stale:
 * the bill, history and receipts refetch on mount (`staleTimes.live`).
 */

/**
 * Every query a payment can change: the family bill, history, receipts, the
 * children's outstanding balances and each child's dashboard fees tile.
 *
 * @param queryClient - The app's query client.
 * @returns Resolves once the invalidations are queued.
 */
export function invalidatePaymentQueries(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.children.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.child.all }),
  ]);
}

/**
 * Every child's bill, across schools, in one request (C2).
 *
 * @param termId - The term; the current one when omitted.
 * @returns The query.
 */
export function useFamilyFees(termId?: string): UseQueryResult<FamilyFees> {
  const { parentId, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.payments.family(parentId || 'anon', termId),
    queryFn: () => getFamilyFees(termId),
    enabled: Boolean(parentId && isAuthenticated),
    staleTime: staleTimes.live,
  });
}

/**
 * The providers the child's school has enabled.
 *
 * @param childId - The child being paid for.
 * @returns The query.
 */
export function useChildProviders(childId: string | undefined): UseQueryResult<PaymentProvider[]> {
  return useQuery({
    queryKey: queryKeys.payments.childProviders(childId ?? 'none'),
    queryFn: () => getChildProviders(childId as string),
    enabled: Boolean(childId),
    staleTime: staleTimes.reference,
  });
}

/**
 * The school's bank account for a transfer (C4).
 *
 * @param childId - The child being paid for.
 * @param enabled - Load only when the parent picks bank transfer.
 * @returns The query.
 */
export function useBankDetails(childId: string | undefined, enabled = true): UseQueryResult<BankDetails> {
  return useQuery({
    queryKey: queryKeys.payments.bankDetails(childId ?? 'none'),
    queryFn: () => getBankDetails(childId as string),
    enabled: Boolean(childId) && enabled,
    staleTime: staleTimes.reference,
  });
}

/**
 * One child's receipts for one term (C5).
 *
 * @param childId - The child.
 * @param termId - The term; every term when omitted.
 * @param enabled - Load only when needed (the tab or the download sheet).
 * @returns The query.
 */
export function useParentReceipts(childId: string | undefined, termId: string | undefined, enabled = true): UseQueryResult<ReceiptList> {
  const { parentId } = useAuth();
  return useQuery({
    queryKey: queryKeys.payments.receipts(parentId || 'anon', { childId, termId }),
    queryFn: () => getParentReceipts({ childId, termId }),
    enabled: Boolean(childId) && enabled,
    staleTime: staleTimes.live,
  });
}

/**
 * One page of the child's payments (C6).
 *
 * @param childId - The child.
 * @param page - 1-based page.
 * @param enabled - Load only when the tab is open.
 * @returns The query; the previous page stays on screen while the next loads.
 */
export function usePaymentHistory(childId: string | undefined, page: number, enabled = true): UseQueryResult<Paginated<PaymentHistoryRow>> {
  const { parentId } = useAuth();
  return useQuery({
    queryKey: queryKeys.payments.history(parentId || 'anon', { childId, page }),
    queryFn: () => getPaymentHistory({ childId, page, limit: 10 }),
    enabled: Boolean(childId) && enabled,
    staleTime: staleTimes.live,
    placeholderData: (previous) => previous,
  });
}

/**
 * Records a bank transfer (C4). It shows as Pending until the bursary
 * confirms it, so only the history and bill are refreshed; nothing is marked
 * paid here.
 *
 * @returns The mutation.
 */
export function useBankTransfer() {
  const queryClient = useQueryClient();
  return useMutation<BankTransferResult, unknown, BankTransferPayload>({
    mutationFn: submitBankTransfer,
    onSuccess: () => {
      void invalidatePaymentQueries(queryClient);
    },
  });
}

/** One hosted checkout the parent asked for. */
export interface CheckoutRequest {
  childId: string;
  feeAssignmentIds: string[];
  /** Only for a part payment; the full balance otherwise. */
  amount?: number;
  provider: PaymentProviderName;
}

/** What {@link useCheckout} hands a checkout screen. */
export interface CheckoutController {
  /** Starts the checkout and sends the browser to the provider. Ignored while one is in flight. */
  start: (request: CheckoutRequest) => Promise<void>;
  /** True from the click until the browser leaves (or the attempt fails). */
  submitting: boolean;
  /** Why the last attempt stopped, if it did. */
  error: unknown;
  /** Clears the error and forgets the attempt: the next start is a new attempt with a new key. */
  reset: () => void;
}

/**
 * A fresh idempotency key.
 *
 * @returns A random UUID (or an equivalent where `crypto.randomUUID` is missing).
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `ck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * What makes two requests "the same attempt": child, fees, amount and provider.
 *
 * @param request - The checkout request.
 * @returns A stable signature.
 */
function attemptSignature(request: CheckoutRequest): string {
  return JSON.stringify([request.childId, [...request.feeAssignmentIds].sort(), request.amount ?? null, request.provider]);
}

/**
 * The hosted-checkout flow, with the guards a payment needs:
 *
 * - **Double submit:** a ref is set the instant a checkout is committed to.
 *   `mutation.isPending` alone is not enough: it flips back to false the
 *   moment the request resolves, leaving a window before the browser
 *   navigates in which a second click would start a second checkout.
 * - **Idempotency:** one key per attempt, kept across retries of the same
 *   attempt, so a retry after a timeout returns the checkout the server may
 *   already have created instead of a second one. Changing the child, fees,
 *   amount or provider is a new attempt with a new key.
 * - **Never retried automatically** (mutations have `retry: false`).
 *
 * @returns The controller.
 */
export function useCheckout(): CheckoutController {
  const redirecting = useRef(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const mutation = useMutation({ mutationFn: initializeCheckout });
  const { mutateAsync } = mutation;

  const start = useCallback(
    async (request: CheckoutRequest): Promise<void> => {
      if (redirecting.current) return;
      redirecting.current = true;
      setSubmitting(true);
      setError(null);

      const signature = attemptSignature(request);
      if (!attempt.current || attempt.current.signature !== signature) {
        attempt.current = { signature, key: newIdempotencyKey() };
      }

      try {
        const result = await mutateAsync({ ...request, idempotencyKey: attempt.current.key });
        if (!result?.checkoutUrl) {
          // The checkout exists server-side but there is nowhere to send the
          // parent: say so rather than leave a button that looks dead.
          throw new Error("The payment provider didn't return a checkout page. Nothing has been charged — please try again.");
        }
        window.location.assign(result.checkoutUrl);
      } catch (cause) {
        logger.error('payments', 'Could not start checkout', cause);
        setError(cause);
        // The guard reopens so the parent can retry the same attempt (same key).
        redirecting.current = false;
        setSubmitting(false);
      }
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    redirecting.current = false;
    attempt.current = null;
    setSubmitting(false);
    setError(null);
  }, []);

  return { start, submitting, error, reset };
}
