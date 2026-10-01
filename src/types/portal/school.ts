/**
 * B12 school contact, §34 sessions and password policy, §35 support tickets,
 * B13 profile. Hand-written; see `./common.ts` for how to swap these for the
 * generated contract.
 */

/** `GET /parents/me/children/:childId/school` (B12, the §36 shape). */
export interface SchoolContact {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  officeHours: { start: string; end: string } | null;
}

/** One active session (§34). */
export interface AuthSession {
  id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  lastUsedAt: string;
  createdAt: string;
  current: boolean;
}

/** `GET /auth/password-policy` (§34, public). */
export interface PasswordPolicy {
  minLength: number;
  maxLength?: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  /** The characters the symbol rule accepts. */
  symbols?: string;
  historyCount: number;
}

/** Where a support ticket's problem happened (§35, plus B12's `payments` and `results`). */
export type SupportArea =
  | 'payments'
  | 'results'
  | 'attendance'
  | 'messages'
  | 'signing_in'
  | 'other';

/** Body of `POST /support/tickets` (§35). */
export interface SupportTicketPayload {
  area: SupportArea;
  /** 10–2000 characters. */
  description: string;
  context?: { path?: string; appVersion?: string; userAgent?: string };
}

/** `POST /support/tickets` answers. */
export interface SupportTicketResult {
  reference: string;
  createdAt: string;
}

/**
 * Body of `PATCH /parent/settings/profile` (B13): `occupation` and `address`
 * are new. Email is never sent; the phone changes through the OTP routes.
 */
export interface ParentProfilePayload {
  fullName?: string;
  occupation?: string;
  address?: string;
}

/** The chat privacy switches (`GET`/`PATCH /chat/preferences`, A16 and B10). */
export interface ChatPrivacy {
  showOnlineStatus: boolean;
  readReceipts: boolean;
  /** B10: when false, push text reads "New message". */
  messagePreview: boolean;
}
