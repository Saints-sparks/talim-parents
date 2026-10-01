/**
 * Part C payments for parents (C2–C7). Hand-written; see `./common.ts` for how
 * to swap these for the generated contract.
 *
 * Money is in naira. The server allocates a payment by due date and is the
 * only authority on what was paid: the client never reports a payment as
 * done until verify (or the bursary, for a bank transfer) says so.
 */
import type { PaymentProviderName } from '../payments';
import type { SchoolRef, TermRef } from './common';

/** One fee item's state (C2). */
export type FeeItemStatus = 'paid' | 'part_paid' | 'overdue' | 'due';

/** One fee assignment on a child's bill (C2). */
export interface FeeItem {
  /** The fee assignment id. */
  id: string;
  label: string;
  category: string;
  dueDate: string | null;
  amount: number;
  paid: number;
  balance: number;
  status: FeeItemStatus;
  /** The school allows part payment on this item. */
  allowPartial: boolean;
  /** The breakdown ("Class tuition", "Technology levy"…). */
  parts: { label: string; amount: number }[];
}

/** One child's bill in the family fees (C2). */
export interface ChildFees {
  child: { id: string; name: string; school: SchoolRef };
  outstanding: number;
  paid: number;
  billTotal: number;
  overdue: number;
  items: FeeItem[];
  /**
   * CONTRACT GAP: `FinanceSettings.minimumPartPayment` of this child's school.
   * C3 enforces it server-side; without it here the UI cannot say "minimum ₦X"
   * before the parent submits. Missing means the UI states no minimum and
   * relies on the server's 400.
   */
  minimumPartPayment?: number | null;
  /** CONTRACT GAP: the term the bill is for, for the page subtitle. */
  term?: TermRef | null;
}

/** `GET /payments/parent/fees?termId=` (C2): every linked child, one call. */
export interface FamilyFees {
  children: ChildFees[];
  totals: { outstanding: number; paidThisSession: number; receipts: number; overdue: number };
}

/** Body of `POST /payments/parent/initialize` (C3). */
export interface CheckoutPayload {
  childId: string;
  feeAssignmentIds: string[];
  /** Less than the total only for a part payment. */
  amount?: number;
  provider: PaymentProviderName;
  /** One per checkout attempt, reused on every retry: the same key returns the same checkout. */
  idempotencyKey: string;
}

/** `POST /payments/parent/initialize` answers (C3). */
export interface CheckoutResult {
  reference: string;
  checkoutUrl: string;
  allocations: { feeAssignmentId: string; amount: number }[];
}

/** `GET /payments/parent/bank-details?childId=` (C4): the school's default account. */
export interface BankDetails {
  bank: string;
  name: string;
  number: string;
}

/** Body of `POST /payments/parent/bank-transfer` (C4). */
export interface BankTransferPayload {
  childId: string;
  feeAssignmentIds: string[];
  amount: number;
  transferReference: string;
  /** `YYYY-MM-DD`. */
  paidOn: string;
  proofUrl?: string;
}

/**
 * `POST /payments/parent/bank-transfer` answers with the pending transaction.
 * CONTRACT GAP: only "creates a pending transaction" is stated.
 */
export interface BankTransferResult {
  id: string;
  status: 'pending';
  reference: string;
}

/** How a payment was made, as history and receipts name it. */
export type PaymentMethodName = PaymentProviderName | 'bank_transfer' | 'cash' | 'other';

/** A transaction's state in the history (C6). */
export type HistoryStatus = 'successful' | 'pending' | 'failed' | 'cancelled' | 'refunded' | 'rejected';

/** One row of `GET /payments/parent/history?childId=&termId=` (C6), paginated. */
export interface PaymentHistoryRow {
  id: string;
  date: string;
  child: { id: string; name: string };
  items: { label: string; amount: number }[];
  amount: number;
  method: PaymentMethodName;
  reference: string;
  status: HistoryStatus;
}

/** One receipt with its school header and lines, `GET /payments/parent/receipts?termId=&childId=` (C5). */
export interface ParentReceipt {
  id: string;
  receiptNumber: string;
  termId: string | null;
  /** CONTRACT GAP: the term's name, for the PDF heading. */
  termName?: string | null;
  session?: string | null;
  child: { id: string; name: string; admissionNumber?: string | null; className?: string | null };
  school: { name: string; logoUrl: string | null; address: string | null };
  items: { label: string; category?: string | null; amount: number }[];
  total: number;
  paidAt: string;
  method: PaymentMethodName;
  reference: string | null;
  currency?: string;
}

/** C5 list answer. */
export interface ReceiptList {
  data: ParentReceipt[];
  /** C5: `allowParentDownload` is enforced; false hides the download actions. */
  allowParentDownload?: boolean;
}

/** C7: the preferred method, read and written through `/parent/settings`. */
export type PreferredMethod = PaymentProviderName | 'bank_transfer';
