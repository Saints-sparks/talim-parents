import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verifyPayment } from '../services/payments.services';
import { invalidatePaymentQueries } from './portal/usePortalPayments';
import type { VerifyPaymentResult } from '../types/payments';

/**
 * Confirms with the provider what happened to a payment, and refreshes every
 * payment query once it settles: the bill, history, receipts, the children's
 * balances and each dashboard's fees tile. Never retried automatically.
 *
 * @returns The mutation. `data.status` — not its success — says whether the
 *   money moved.
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation<VerifyPaymentResult, unknown, string>({
    mutationFn: verifyPayment,
    onSuccess: (result) => {
      if (result.status !== 'pending') void invalidatePaymentQueries(queryClient);
    },
  });
}
