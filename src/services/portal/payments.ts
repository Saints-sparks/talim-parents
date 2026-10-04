import { api, buildQuery } from '../../lib/apiClient';
import type { PaymentProvider, PaymentProvidersResponse } from '../../types/payments';
import type {
  BankDetails,
  BankTransferPayload,
  BankTransferResponse,
  BankTransferResult,
  CheckoutPayload,
  CheckoutResult,
  FamilyFees,
  HistoryPage,
  ReceiptList,
} from '../../types/portal/payments';

/**
 * Part C payments for parents. Real money, so:
 * - the server allocates and settles; the client never marks anything paid;
 * - `initialize` carries an `idempotencyKey` so a retried request returns the
 *   same checkout instead of a second one;
 * - mutations are never retried automatically (`QueryProvider`).
 */

/**
 * Every linked child's bill, across schools, in one call (C2).
 *
 * @param termId - The term; the current one when omitted.
 * @returns Each child's items and totals, and the family totals.
 * @throws {ApiError} On any non-2xx.
 */
export function getFamilyFees(termId?: string): Promise<FamilyFees> {
  return api.get<FamilyFees>(`/payments/parent/fees${buildQuery({ termId })}`);
}

/**
 * The payment providers the child's school has enabled.
 *
 * @param childId - Student record id of a linked child (multi-school: the child picks the school).
 * @returns The enabled providers.
 * @throws {ApiError} On any non-2xx.
 */
export async function getChildProviders(childId: string): Promise<PaymentProvider[]> {
  const body = await api.get<PaymentProvidersResponse>('/payments/parent/providers', { childId });
  return (body?.providers ?? []).filter((provider) => provider.isEnabled);
}

/**
 * Starts a hosted checkout (C3). Cards are only ever entered on the
 * provider's page, never in this app.
 *
 * @param payload - Child, fee assignments, optional part amount, provider and
 *   the attempt's idempotency key.
 * @returns The reference, the checkout URL and how the server allocated the amount.
 * @throws {ApiError} `VALIDATION_FAILED` for a part payment below the minimum or on an
 *   item that must be paid in full, `BAD_REQUEST` for a fee already paid or in checkout.
 */
export function initializeCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  return api.post<CheckoutResult>('/payments/parent/initialize', payload, { childId: payload.childId });
}

/**
 * The school's account for a bank transfer (C4).
 *
 * @param childId - Student record id of a linked child.
 * @returns Bank name, account name and number, and the school they belong to.
 * @throws {ApiError} `NOT_FOUND` when the school has not set one.
 */
export function getBankDetails(childId: string): Promise<BankDetails> {
  return api.get<BankDetails>(`/payments/parent/bank-details${buildQuery({ childId })}`, { childId });
}

/**
 * Records a bank transfer the parent has made (C4). It stays pending until the
 * bursary confirms it.
 *
 * @param payload - Child, fees, amount, the bank's reference, the date and an optional proof URL.
 * @returns The pending transfer (the answer's `transfer`).
 * @throws {ApiError} `VALIDATION_FAILED` for an amount the fees do not allow, a
 *   future date or a reference already used; `CONFLICT` for a fee already held.
 */
export async function submitBankTransfer(payload: BankTransferPayload): Promise<BankTransferResult> {
  const body = await api.post<BankTransferResponse>('/payments/parent/bank-transfer', payload, { childId: payload.childId });
  return body.transfer;
}

/**
 * The parent's receipts, with the school header and lines the PDFs are built
 * from (C5). The list is family-wide, so it sends no child header: `childId`
 * is a filter.
 *
 * @param query - The term and the child; every term and child when omitted.
 * @param query.termId - The term.
 * @param query.childId - The child.
 * @returns The receipts (each with `downloadAllowed`) and the terms that have receipts.
 * @throws {ApiError} On any non-2xx.
 */
export async function getParentReceipts(query: { termId?: string; childId?: string }): Promise<ReceiptList> {
  const body = await api.get<ReceiptList>(`/payments/parent/receipts${buildQuery({ ...query, limit: 100 })}`);
  return { ...body, data: body.data ?? [], terms: body.terms ?? [] };
}

/**
 * One page of the parent's payments, with names (C6). Family-wide like the
 * receipts: `childId` is a filter, not a child header.
 *
 * @param query - Child, term and page.
 * @param query.childId - The child.
 * @param query.termId - The term.
 * @param query.page - 1-based page.
 * @param query.limit - Rows per page (the API's default is 20, its maximum 100).
 * @returns The rows with `total`, `page` and `limit`.
 * @throws {ApiError} On any non-2xx.
 */
export function getPaymentHistory(query: {
  childId?: string;
  termId?: string;
  page?: number;
  limit?: number;
}): Promise<HistoryPage> {
  return api.get<HistoryPage>(`/payments/parent/history${buildQuery(query)}`);
}

/**
 * The number of pages of a `{ total, limit }` list.
 *
 * @param page - The list's numbers.
 * @param page.total - Rows in all.
 * @param page.limit - Rows per page.
 * @returns At least 1.
 */
export function lastPageOf(page: { total: number; limit: number }): number {
  return Math.max(1, Math.ceil(page.total / Math.max(1, page.limit)));
}
