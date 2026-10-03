import { api } from '../lib/apiClient';
import type { VerifyPaymentResult } from '../types/payments';

/**
 * Verifying a hosted checkout (the provider's redirect back to
 * `/payments/verify`). The Part C routes (family fees, initialize with an
 * idempotency key, bank transfer, receipts, history) are in
 * `services/portal/payments.ts`.
 *
 * A failed verification is reported as a failure rather than swallowed,
 * because the alternative is telling a parent a payment succeeded when it did not.
 */

/**
 * Confirms with the provider what actually happened to a payment.
 *
 * Note this answers HTTP 200 for a failed payment too — `result.status` is the
 * only thing that says whether the money moved, so callers must branch on it
 * and never treat "the request succeeded" as "the payment succeeded".
 *
 * @param reference - The reference the provider redirected back with.
 * @returns The settled status, the transaction, and the receipt once issued.
 * @throws {ApiError} `NOT_FOUND` when no transaction carries that reference (or it is not the caller's),
 *   `PAYMENT_PROVIDER_ERROR` when the provider could not be reached.
 */
export function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  return api.get<VerifyPaymentResult>(`/payments/parent/verify/${encodeURIComponent(reference)}`);
}
