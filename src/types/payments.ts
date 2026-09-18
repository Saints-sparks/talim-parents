/**
 * Payment contract types.
 *
 * Mirrors `talimBE-V2/src/modules/payments` — the DTOs in
 * `data/dtos/payment.dto.ts`, the enums in `enums/payment.enums.ts` and the
 * shapes `service/payments.service.ts` actually returns. The API runs
 * `whitelist + forbidNonWhitelisted`, so a request body with one extra field
 * is a 400: the request types below are exactly what the DTOs declare.
 */

/** Providers the platform can route a payment through. */
export type PaymentProviderName = 'paystack' | 'opay' | 'stripe';

/** Channels a provider can settle a payment on. */
export type PaymentChannel = 'card' | 'bank_transfer' | 'ussd' | 'wallet' | 'bank' | 'mobile_money';

/** Lifecycle of a payment transaction. */
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'cancelled' | 'refunded' | 'partial';

/** One outstanding fee assignment, as `GET /payments/parent/due-fees` returns it. */
export interface DueFee {
  _id: string;
  feeName: string;
  category: string;
  feeType: string;
  description: string;
  /** The fee itself, in naira. Excludes `lateFeeAmount`. */
  amount: number;
  dueDate: string | null;
  /**
   * The surcharge that applies **only once `dueDate` has passed** — the server
   * adds it to the charge under exactly that condition, so the client must
   * gate it on `isOverdue` too or it will quote a total that is never charged.
   */
  lateFeeAmount: number;
  isOverdue: boolean;
  /** `'overdue' | 'due'` — a display string, not a {@link PaymentStatus}. */
  status: string;
}

/** Body of `GET /payments/parent/due-fees`. */
export interface DueFeesResponse {
  success: true;
  fees: DueFee[];
}

/** Body of `GET /payments/parent/summary`. */
export interface PaymentSummary {
  success: true;
  totalPaid: number;
  totalOutstanding: number;
  totalReceipts: number;
}

/** Query accepted by `GET /payments/parent/due-fees` (`DueFeesQueryDto`). */
export interface DueFeesQuery {
  academicYearId?: string;
  termId?: string;
}

/** Body of `POST /payments/parent/initialize` (`InitializePaymentDto`). */
export interface InitializePaymentPayload {
  /** 24-hex Student record id. Must be a child of the signed-in parent. */
  studentId: string;
  /** At least one active fee-assignment id. */
  feeAssignmentIds: string[];
  providerName: PaymentProviderName;
  paymentChannel?: PaymentChannel;
}

/**
 * What `POST /payments/parent/initialize` returns. The amount is computed
 * server-side from the fee assignments — the client never sends one, and
 * `amount` here is the authoritative figure the parent will be charged.
 */
export interface InitializePaymentResult {
  transactionId: string;
  /** The reference the provider redirects back with. */
  internalReference: string;
  /** Hosted checkout to send the parent to. */
  checkoutUrl: string;
  /** `subtotal + lateFee` — what the card is charged. */
  amount: number;
  subtotal: number;
  lateFee: number;
  /** Deducted from `amount` on settlement; the parent does not pay it on top. */
  platformFee: number;
  schoolAmount: number;
  currency: string;
  provider: PaymentProviderName;
}

/** One line on an issued receipt. */
export interface ReceiptFeeItem {
  feeName: string;
  category: string;
  description: string;
  amount: number;
}

/** An issued receipt. */
export interface Receipt {
  _id: string;
  receiptNumber: string;
  studentId: string;
  transactionId: string;
  feeItems: ReceiptFeeItem[];
  subtotal: number;
  lateFee: number;
  discount: number;
  totalPaid: number;
  currency: string;
  paymentMethod?: string;
  paymentProvider?: string;
  transactionReference?: string;
  paymentDate?: string;
  receiptPdfUrl?: string;
  verificationCode?: string;
  status: 'issued' | 'voided';
  issuedAt: string;
}

/** A payment transaction, as the history and verify endpoints return it. */
export interface PaymentTransaction {
  _id: string;
  studentId: string;
  feeAssignmentIds: string[];
  providerName: PaymentProviderName;
  providerReference?: string;
  internalReference: string;
  amount: number;
  platformFee: number;
  schoolAmount: number;
  totalAmount: number;
  currency: string;
  status: PaymentStatus;
  paymentChannel?: PaymentChannel;
  checkoutUrl?: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * What `GET /payments/parent/verify/:reference` returns. The endpoint answers
 * HTTP 200 with `success: true` for a failed payment too — `status` is the
 * only thing that says whether the money moved.
 */
export interface VerifyPaymentResult {
  success: true;
  status: 'successful' | 'failed' | 'pending';
  transaction: PaymentTransaction;
  /** Present only once a receipt has been issued. */
  receipt?: Receipt | null;
}

/** Query accepted by `GET /payments/parent/history` (`PaymentHistoryQueryDto`). */
export interface PaymentHistoryQuery {
  studentId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/** Query accepted by `GET /payments/parent/receipts` (`ReceiptQueryDto`). */
export interface ReceiptsQuery {
  studentId?: string;
  page?: number;
  limit?: number;
}

/** The un-enveloped `{ data, total }` shape the list endpoints return. */
export interface PaginatedList<T> {
  data: T[];
  total: number;
}

/** One enabled payment provider from `GET /payments/parent/providers`. */
export interface PaymentProvider {
  providerName: PaymentProviderName;
  isEnabled: boolean;
  environment: 'test' | 'live';
  supportedChannels: PaymentChannel[];
  currency: string;
}

/** Body of `GET /payments/parent/providers`. */
export interface PaymentProvidersResponse {
  success: true;
  providers: PaymentProvider[];
}
