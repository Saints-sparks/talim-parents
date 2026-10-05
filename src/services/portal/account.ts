import { api } from '../../lib/apiClient';
import type {
  AuthSession,
  ChatPrivacy,
  ParentProfilePayload,
  PasswordPolicy,
  RevokeOthersResult,
  RevokeSessionResult,
  SupportTicketPayload,
  SupportTicketResult,
} from '../../types/portal/school';
import type { PreferredMethod } from '../../types/portal/payments';
import type { Schema } from '../../types/apiContract';

/** What `PATCH /parent/settings/payment-method` answers. */
export type PreferredMethodResult = Schema<'PreferredProviderUpdatedDto'>;

/** What `PATCH /parent/settings/preferences` answers. */
export type GuidesResult = Schema<'ParentPreferencesUpdatedDto'>;

/**
 * The parent's own account (B13, C7, §34, §35, A16): not about a child, so
 * nothing here sends a child header.
 */

/**
 * Saves the parent's name, occupation and address (B13).
 *
 * @param payload - Only the fields that changed.
 * @returns The acknowledgement.
 * @throws {ApiError} `VALIDATION_FAILED` with field details.
 */
export function updateParentProfile(payload: ParentProfilePayload): Promise<{ message?: string }> {
  return api.patch<{ message?: string }>('/parent/settings/profile', payload);
}

/**
 * Saves the method offered first at checkout (C7). `PATCH
 * /parent/settings/preferences` refuses this field (400): it takes only the
 * tour's `guides`.
 *
 * @param preferredProvider - The provider, or bank transfer; `null` clears the choice.
 * @returns The stored choice.
 * @throws {ApiError} `VALIDATION_FAILED` for an unknown provider.
 */
export function setPreferredMethod(preferredProvider: PreferredMethod | null): Promise<PreferredMethodResult> {
  const body: Schema<'UpdatePreferredProviderDto'> = { preferredProvider };
  return api.patch<PreferredMethodResult>('/parent/settings/payment-method', body);
}

/**
 * Records that the parent finished (or wants to see again) the first-run tour,
 * on the account rather than the device, so it is not shown again elsewhere.
 *
 * @param tourCompleted - True stamps `guides.tourCompletedAt` with now; false clears it.
 * @returns The stored guides.
 * @throws {ApiError} On any non-2xx.
 */
export function setTourCompleted(tourCompleted: boolean): Promise<GuidesResult> {
  const body: Schema<'UpdateParentPreferencesDto'> = { guides: { tourCompleted } };
  return api.patch<GuidesResult>('/parent/settings/preferences', body);
}

/**
 * The chat privacy switches (A16: `ChatPreference` owns them).
 *
 * @returns Online status, read receipts and message preview.
 * @throws {ApiError} On any non-2xx.
 */
export function getChatPrivacy(): Promise<ChatPrivacy> {
  return api.get<ChatPrivacy>('/chat/preferences');
}

/**
 * Changes one or more chat privacy switches.
 *
 * @param patch - The switches that changed.
 * @returns The stored switches.
 * @throws {ApiError} On any non-2xx.
 */
export function updateChatPrivacy(patch: Partial<ChatPrivacy>): Promise<ChatPrivacy> {
  return api.patch<ChatPrivacy>('/chat/preferences', patch);
}

/**
 * Where the parent is signed in (§34).
 *
 * @returns The sessions, the current one flagged.
 * @throws {ApiError} On any non-2xx.
 */
export function getSessions(): Promise<AuthSession[]> {
  return api.get<AuthSession[]>('/auth/sessions');
}

/**
 * Signs one session out (§34).
 *
 * @param id - The session.
 * @returns Whether it was this device's own session.
 * @throws {ApiError} `NOT_FOUND` for another user's session.
 */
export function revokeSession(id: string): Promise<RevokeSessionResult> {
  return api.delete<RevokeSessionResult>(`/auth/sessions/${encodeURIComponent(id)}`);
}

/**
 * Signs every other device out (§34).
 *
 * @returns How many sessions were revoked.
 * @throws {ApiError} On any non-2xx.
 */
export function revokeOtherSessions(): Promise<RevokeOthersResult> {
  return api.post<RevokeOthersResult>('/auth/sessions/revoke-others', {});
}

/**
 * The server's password rules (§34, public).
 *
 * @returns The policy.
 * @throws {ApiError} On any non-2xx.
 */
export function getPasswordPolicy(): Promise<PasswordPolicy> {
  return api.get<PasswordPolicy>('/auth/password-policy', { skipAuth: true });
}

/**
 * Sends a problem report to Talim support, not the school (§35).
 *
 * @param payload - Area, description and context.
 * @returns The ticket reference.
 * @throws {ApiError} `VALIDATION_FAILED` for a description under 10 characters.
 */
export function sendSupportTicket(payload: SupportTicketPayload): Promise<SupportTicketResult> {
  return api.post<SupportTicketResult>('/support/tickets', payload);
}

/**
 * Starts a password reset: emails a 6-digit code. Answers the same whether or
 * not the email has an account.
 *
 * @param email - The account's email.
 * @returns The server's message.
 * @throws {ApiError} `RATE_LIMITED` after too many attempts.
 */
export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/forgot-password', { email: email.trim() }, { skipAuth: true });
}

/**
 * Checks a reset code before asking for the new password.
 *
 * @param email - The account's email.
 * @param token - The 6-digit code.
 * @returns `{ valid: true }` when the code is usable.
 * @throws {ApiError} `VALIDATION_FAILED` (field `token`) for a wrong or expired code.
 */
export function verifyResetCode(email: string, token: string): Promise<{ valid: true }> {
  return api.post<{ valid: true }>('/auth/verify-reset-code', { email: email.trim(), token }, { skipAuth: true });
}

/**
 * Sets a new password with an emailed code; signs out every session.
 *
 * @param email - The account's email.
 * @param token - The 6-digit code.
 * @param newPassword - Must satisfy the password policy.
 * @returns The server's message.
 * @throws {ApiError} `VALIDATION_FAILED` for a weak password or a bad code.
 */
export function resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/reset-password', { email: email.trim(), token, newPassword }, { skipAuth: true });
}
