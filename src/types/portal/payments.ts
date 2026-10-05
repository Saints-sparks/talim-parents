/**
 * Part C payments for parents (C2–C7), as the generated contract describes
 * them.
 *
 * Money is in naira. The server allocates a payment by due date and is the
 * only authority on what was paid: the client never reports a payment as
 * done until verify (or the bursary, for a bank transfer) says so.
 *
 * BACKEND GAP fields (returned by the API, checked live by the contract test,
 * missing from its OpenAPI document) are added with intersections, so the
 * rest of each shape still comes from the generated DTO.
 */
import type { Schema } from '../apiContract';
import type { PaymentProviderName } from '../payments';
import type { TermLabel } from './common';

/**
 * One fee assignment on a child's bill (C2). `amount` includes the late fee
 * once it applies; `pendingPayment` means a checkout or bank transfer holds it.
 * BACKEND GAP: `lateFee` (the late fee inside `amount`) is not in the OpenAPI DTO.
 */
export type FeeItem = Schema<'FamilyFeeItemDto'> & { lateFee: number };

/** One fee item's state (C2). */
export type FeeItemStatus = FeeItem['status'];

/**
 * One child's bill in the family fees (C2). BACKEND GAP: `minimumPartPayment`
 * (naira, the school's minimum; 0 when it sets none) and `term` (the bill's
 * term, null when the school has no current term) are not in the OpenAPI DTO.
 */
export type ChildFees = Omit<Schema<'FamilyChildFeesDto'>, 'items'> & {
  items: FeeItem[];
  minimumPartPayment: number;
  term: TermLabel | null;
};

/** `GET /payments/parent/fees?termId=` (C2): every linked child, one call. */
export type FamilyFees = Omit<Schema<'FamilyFeesResponseDto'>, 'children'> & { children: ChildFees[] };

type InitializeBody = Schema<'InitializePaymentDto'>;

/**
 * Body of `POST /payments/parent/initialize` (C3) as this app sends it: the
 * child, provider and idempotency key are always set (the DTO keeps them
 * optional for older clients).
 */
export type CheckoutPayload = Required<Pick<InitializeBody, 'childId' | 'provider' | 'idempotencyKey'>> &
  Pick<InitializeBody, 'feeAssignmentIds' | 'amount'>;

/** `POST /payments/parent/initialize` answers (C3). */
export type CheckoutResult = Schema<'InitializePaymentResponseDto'>;

/** `GET /payments/parent/bank-details?childId=` (C4): the school's default account. */
export type BankDetails = Schema<'BankDetailsResponseDto'>;

type BankTransferBody = Schema<'BankTransferDto'>;

/** Body of `POST /payments/parent/bank-transfer` (C4); this app always names the child. */
export type BankTransferPayload = Omit<BankTransferBody, 'childId'> & { childId: string };

/** `POST /payments/parent/bank-transfer` answers `{ success, transfer }` (C4). */
export type BankTransferResponse = Schema<'BankTransferSubmittedResponseDto'>;

/** The pending transfer the bursary will confirm or reject. */
export type BankTransferResult = Schema<'SubmittedBankTransferDto'>;

/** How a payment was made, as history and receipts name it (`method` is a free string: `pos`…). */
export type PaymentMethodName = PaymentProviderName | 'bank_transfer' | 'cash' | 'other';

/**
 * One row of `GET /payments/parent/history?childId=&termId=` (C6). A bank
 * transfer row carries the stored `bankTransfer`: the bank's reference, and
 * the bursary's reason when it rejected it.
 */
export type PaymentHistoryRow = Schema<'ParentHistoryRowDto'>;

/** A transaction's state in the history (C6). */
export type HistoryStatus = PaymentHistoryRow['status'];

/** C6 page: `{ data, total, page, limit }` (no `meta`). */
export type HistoryPage = Schema<'ParentHistoryResponseDto'>;

/**
 * One receipt with its school header and lines (C5). `downloadAllowed` false
 * means the school does not let parents download it. BACKEND GAP: `term`
 * carries `session`, which the OpenAPI `TermRefDto` lacks.
 */
export type ParentReceipt = Omit<Schema<'ParentReceiptDto'>, 'term'> & { term: TermLabel | null };

/**
 * `GET /payments/parent/receipts?termId=&childId=` (C5). BACKEND GAP: `terms`
 * (the terms the children have receipts in, newest first) is not in the
 * OpenAPI DTO.
 */
export type ReceiptList = Omit<Schema<'ParentReceiptListResponseDto'>, 'data'> & {
  data: ParentReceipt[];
  terms: TermLabel[];
};

/** C7: the preferred method, `PATCH /parent/settings/payment-method`. */
export type PreferredMethod = NonNullable<Schema<'UpdatePreferredProviderDto'>['preferredProvider']>;
