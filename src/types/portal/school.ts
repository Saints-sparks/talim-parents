/**
 * B12 school contact, §34 sessions and password policy, B13 profile and the
 * chat privacy switches. (v1.5 support tickets are in `../tickets.ts`.)
 */
import type { Schema } from '../apiContract';

/** `GET /parents/me/children/:childId/school` (B12, the §36 shape). */
export type SchoolContact = Schema<'SchoolContactDto'>;

/** One active session (§34), `current` marking this browser's. */
export type AuthSession = Schema<'SessionDto'>;

/** `DELETE /auth/sessions/:id` (§34). */
export type RevokeSessionResult = Schema<'RevokeSessionDto'>;

/** `POST /auth/sessions/revoke-others` (§34). */
export type RevokeOthersResult = Schema<'RevokeOthersDto'>;

/** `GET /auth/password-policy` (§34, public). */
export type PasswordPolicy = Schema<'PasswordPolicyDto'>;

/** `POST /auth/account/deletion` body (v1.5): the account's password and an optional reason (at most 500 characters). */
export type AccountDeletionBody = Schema<'RequestAccountDeletionDto'>;

/**
 * `GET`/`POST /auth/account/deletion` 200 (`AccountDeletionStatusDto`). After a
 * successful request `status` is `scheduled`, with `requestedAt` and
 * `scheduledFor` (`requestedAt` + 30 days); `none` carries neither.
 */
export type AccountDeletionScheduled = Schema<'AccountDeletionStatusDto'>;

/**
 * Body of `PATCH /parent/settings/profile` (B13): `occupation` and `address`
 * are new. Email is never sent; the phone changes through the OTP routes.
 */
export type ParentProfilePayload = Pick<Schema<'UpdateParentProfileDto'>, 'fullName' | 'occupation' | 'address'>;

/** The chat privacy switches of `GET`/`PATCH /chat/preferences` (A16, B10) the Privacy tab shows. */
export type ChatPrivacy = Pick<Schema<'ChatPreferencesResponseDto'>, 'showOnlineStatus' | 'readReceipts' | 'messagePreview'>;
