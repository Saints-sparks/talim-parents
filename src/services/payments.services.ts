import { api, buildQuery } from '../lib/apiClient';
import type {
  DueFee,
  DueFeesQuery,
  DueFeesResponse,
  InitializePaymentPayload,
  InitializePaymentResult,
  PaginatedList,
  PaymentHistoryQuery,
  PaymentProvider,
  PaymentProvidersResponse,
  PaymentSummary,
  PaymentTransaction,
  Receipt,
  ReceiptsQuery,
  VerifyPaymentResult,
} from '../types/payments';

/**
 * Parent-facing payment endpoints (`talimBE-V2/src/modules/payments`).
 *
 * Every one of these is real money, so two rules hold throughout:
 * the amount is never sent by the client — the server recomputes it from the
 * fee assignments — and a failed verification is reported as a failure rather
 * than swallowed, because the alternative is telling a parent a payment
 * succeeded when it did not.
 */

/**
 * Outstanding fee assignments for one child.
 *
 * @param studentId - 24-hex Student record id; the server rejects a child who
 *   is not linked to the signed-in parent with `FORBIDDEN`.
 * @param query - Optional academic year / term narrowing.
 * @returns The outstanding fees, oldest due date first as the server sorts them.
 * @throws {ApiError} `FORBIDDEN` when the child is not the parent's,
 *   `NOT_FOUND` when the student does not exist.
 */
export async function getDueFees(studentId: string, query: DueFeesQuery = {}): Promise<DueFee[]> {
  const body = await api.get<DueFeesResponse>(
    `/payments/parent/due-fees${buildQuery({ studentId, ...query })}`,
  );
  return body?.fees ?? [];
}

/**
 * Paid and outstanding totals across every child of the signed-in parent.
 *
 * @returns The summary totals.
 * @throws {ApiError} On any non-2xx.
 */
export function getPaymentSummary(): Promise<PaymentSummary> {
  return api.get<PaymentSummary>('/payments/parent/summary');
}

/**
 * Creates a pending transaction and a hosted checkout with the provider.
 *
 * The payload is exactly `InitializePaymentDto`: the API runs
 * `forbidNonWhitelisted`, so one extra field turns this into a 400.
 *
 * @param payload - Student, fee assignments and chosen provider.
 * @returns The checkout URL to send the parent to, plus the authoritative
 *   amount the server will charge.
 * @throws {ApiError} `PAYMENT_PROVIDER_ERROR` when the provider rejects the
 *   initialisation, `BAD_REQUEST` when a fee assignment is no longer active,
 *   `FORBIDDEN` when the child is not the parent's.
 */
export function initializePayment(
  payload: InitializePaymentPayload,
): Promise<InitializePaymentResult> {
  return api.post<InitializePaymentResult>('/payments/parent/initialize', payload);
}

/**
 * Confirms with the provider what actually happened to a payment.
 *
 * Note this answers HTTP 200 for a failed payment too — `result.status` is the
 * only thing that says whether the money moved, so callers must branch on it
 * and never treat "the request succeeded" as "the payment succeeded".
 *
 * @param reference - The `internalReference` the provider redirected back with.
 * @returns The settled status, the transaction, and the receipt once issued.
 * @throws {ApiError} `NOT_FOUND` when no transaction carries that reference,
 *   `PAYMENT_PROVIDER_ERROR` when the provider could not be reached.
 */
export function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  return api.get<VerifyPaymentResult>(
    `/payments/parent/verify/${encodeURIComponent(reference)}`,
  );
}

/**
 * The signed-in parent's transactions, newest first. Server-side paginated.
 *
 * @param query - Child, status, date range and page.
 * @returns One page of transactions and the total row count.
 * @throws {ApiError} On any non-2xx.
 */
export function getPaymentHistory(
  query: PaymentHistoryQuery = {},
): Promise<PaginatedList<PaymentTransaction>> {
  return api.get<PaginatedList<PaymentTransaction>>(
    `/payments/parent/history${buildQuery({ ...query })}`,
  );
}

/**
 * The signed-in parent's receipts, newest first. Server-side paginated.
 *
 * @param query - Child and page.
 * @returns One page of receipts and the total row count.
 * @throws {ApiError} On any non-2xx.
 */
export function getReceipts(query: ReceiptsQuery = {}): Promise<PaginatedList<Receipt>> {
  return api.get<PaginatedList<Receipt>>(`/payments/parent/receipts${buildQuery({ ...query })}`);
}

/**
 * One receipt in full.
 *
 * @param receiptId - The receipt's id.
 * @returns The receipt.
 * @throws {ApiError} `FORBIDDEN` when the receipt belongs to another parent,
 *   `NOT_FOUND` when it does not exist.
 */
export async function getReceiptById(receiptId: string): Promise<Receipt> {
  const body = await api.get<{ success: true; receipt: Receipt }>(
    `/payments/parent/receipts/${encodeURIComponent(receiptId)}`,
  );
  return body.receipt;
}

/**
 * Payment providers the school has enabled.
 *
 * @returns The enabled providers.
 * @throws {ApiError} On any non-2xx.
 */
export async function getPaymentProviders(): Promise<PaymentProvider[]> {
  const body = await api.get<PaymentProvidersResponse>('/payments/parent/providers');
  return (body?.providers ?? []).filter((provider) => provider.isEnabled);
}
