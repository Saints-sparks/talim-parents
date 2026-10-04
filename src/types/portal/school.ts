/**
 * B12 school contact, §34 sessions and password policy, §35 support tickets,
 * B13 profile and the chat privacy switches.
 */
import type { Schema } from '../apiContract';

/** `GET /parents/me/children/:childId/school` (B12, the §36 shape). */
export type SchoolContact = Schema<'SchoolContactDto'>;

/**
 * One active session (§34). BACKEND GAP: the OpenAPI `SessionDto` lists only
 * `device, browser, os, ip`; the API also returns `id`, `lastUsedAt`,
 * `createdAt` and `current`, which the Security tab needs.
 */
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

/**
 * `GET /auth/password-policy` (§34, public). BACKEND GAP: the OpenAPI
 * `PasswordPolicyDto` is empty.
 */
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

/** Body of `POST /support/tickets` (§35). */
export type SupportTicketPayload = Schema<'CreateSupportTicketDto'>;

/** The problem areas the parents' Help tab offers (a subset of the API's). */
export type SupportArea = Extract<SupportTicketPayload['area'], 'payments' | 'results' | 'attendance' | 'messages' | 'signing_in' | 'other'>;

/** `POST /support/tickets` answers. */
export type SupportTicketResult = Schema<'SupportTicketCreatedDto'>;

/**
 * Body of `PATCH /parent/settings/profile` (B13): `occupation` and `address`
 * are new. Email is never sent; the phone changes through the OTP routes.
 */
export type ParentProfilePayload = Pick<Schema<'UpdateParentProfileDto'>, 'fullName' | 'occupation' | 'address'>;

/** The chat privacy switches of `GET`/`PATCH /chat/preferences` (A16, B10) the Privacy tab shows. */
export type ChatPrivacy = Pick<Schema<'ChatPreferencesResponseDto'>, 'showOnlineStatus' | 'readReceipts' | 'messagePreview'>;
