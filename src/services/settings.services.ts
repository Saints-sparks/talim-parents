import { api } from '../lib/apiClient';
import type {
  AvatarPayload,
  ChangePasswordPayload,
  SendPhoneOtpPayload,
  ThemePayload,
  UpdateProfilePayload,
  VerifyPhoneOtpPayload,
} from '../types/apiPayloads';

export type {
  ChangePasswordPayload,
  SendPhoneOtpPayload,
  UpdateProfilePayload,
  VerifyPhoneOtpPayload,
} from '../types/apiPayloads';

/**
 * `/parent/settings/*` — the signed-in parent's own account.
 *
 * The controller is `@Roles(UserRole.PARENT)` and every handler keys off
 * `req.user`, so nothing here takes an id from the client: there is no way to
 * address another parent's settings.
 */

/** What `GET /parent/settings` returns. */
export interface ParentSettings {
  profile: {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phoneNumber?: string;
    avatar?: string;
    role: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  children: LinkedChild[];
  preferences: {
    /** The parent-settings switches. Delivery follows `/notifications/preferences`, not these. */
    notifications: Record<string, boolean>;
    theme: ThemePreference;
    language?: string;
  };
  security: {
    twoFactorEnabled: boolean;
    emailOtpEnabled: boolean;
    lastPasswordChangedAt: string | null;
  };
}

/** The themes the API accepts. */
export type ThemePreference = ThemePayload['theme'];

/*
 * Request bodies (`UpdateParentProfileDto`, `ChangePasswordDto`,
 * `SendPhoneOtpDto`, `VerifyPhoneOtpDto`) come from the generated contract in
 * `types/apiPayloads.ts`, so `tsc` compares every builder below with its DTO.
 * `ChangePasswordPayload.confirmPassword` must equal `newPassword`; the server
 * checks it too.
 */

/** Nigerian mobile numbers, as `SendPhoneOtpDto` and `VerifyPhoneOtpDto` require. */
export const PHONE_PATTERN = /^(\+234|0)[789][01]\d{8}$/;

/** The `{ success, message }` acknowledgement these routes answer with. */
export interface SettingsAck {
  success: true;
  message: string;
  [key: string]: unknown;
}

/**
 * The parent's profile, children, preferences and security state.
 *
 * @returns The settings.
 * @throws {ApiError} On any non-2xx.
 */
export function getParentSettings(): Promise<ParentSettings> {
  return api.get<ParentSettings>('/parent/settings');
}

/**
 * Updates the parent's display name or avatar.
 *
 * @param payload - Only `fullName` and `avatar` are accepted.
 * @returns The acknowledgement and the updated profile.
 * @throws {ApiError} `VALIDATION_FAILED` with per-field details.
 */
export function updateParentSettingsProfile(payload: UpdateProfilePayload): Promise<SettingsAck> {
  return api.patch<SettingsAck>('/parent/settings/profile', payload);
}

/** What `PUT /auth/profile/avatar` answers with. */
export interface AvatarResult {
  message: string;
  /** The stored URL; an empty string after a removal. */
  userAvatar: string;
}

/**
 * Sets the parent's profile photo to an already-hosted image, or removes it.
 *
 * @param avatarUrl - An `http(s)` image URL, or an empty string to remove the photo.
 * @returns The stored URL.
 * @throws {ApiError} `VALIDATION_FAILED` when the URL is not a valid image URL.
 */
export function setProfileAvatar(avatarUrl: string): Promise<AvatarResult> {
  const body: AvatarPayload = { avatarUrl };
  return api.put<AvatarResult>('/auth/profile/avatar', body);
}

/**
 * Changes the parent's password, and rotates their session.
 *
 * @param payload - Current password, new password and its confirmation.
 * @returns The acknowledgement, carrying a fresh `access_token`.
 * @throws {ApiError} `VALIDATION_FAILED` when the confirmation does not match,
 *   `UNAUTHENTICATED` when the current password is wrong.
 */
export function changeParentPassword(
  payload: ChangePasswordPayload,
): Promise<SettingsAck & { access_token?: string }> {
  return api.patch<SettingsAck & { access_token?: string }>('/parent/settings/password', payload);
}

/**
 * Sends a verification code before a phone-number change. The code goes to the
 * parent's email address, not the new number.
 *
 * @param payload - The new phone number.
 * @returns The acknowledgement.
 * @throws {ApiError} `CONFLICT` when the number belongs to another account.
 */
export function sendPhoneChangeOtp(payload: SendPhoneOtpPayload): Promise<SettingsAck> {
  return api.post<SettingsAck>('/parent/settings/phone/send-otp', payload);
}

/**
 * Completes a phone-number change.
 *
 * @param payload - The new number and the six-digit code.
 * @returns The acknowledgement.
 * @throws {ApiError} `VALIDATION_FAILED` when the code is wrong or expired.
 */
export function verifyPhoneChangeOtp(payload: VerifyPhoneOtpPayload): Promise<SettingsAck> {
  return api.post<SettingsAck>('/parent/settings/phone/verify-otp', payload);
}

/**
 * Stores the parent's theme choice against their account.
 *
 * @param payload - One of `light`, `dark` or `system`.
 * @returns The acknowledgement.
 * @throws {ApiError} `VALIDATION_FAILED` on any other value.
 */
export function updateThemePreference(payload: ThemePayload): Promise<SettingsAck & { theme?: ThemePreference }> {
  return api.patch<SettingsAck & { theme?: ThemePreference }>('/parent/settings/theme', payload);
}

/** One child, as the settings page lists them. */
export interface LinkedChild {
  id: string;
  fullName: string;
  avatar?: string | null;
  className?: string;
  grade?: string;
  schoolName?: string;
  status: 'Active' | 'Inactive';
  userId?: { _id?: string; firstName?: string; lastName?: string; userAvatar?: string };
  classId?: string;
}

/**
 * The children linked to the signed-in parent.
 *
 * @returns The children; an empty array when the parent has no profile yet.
 * @throws {ApiError} On any non-2xx.
 */
export function getLinkedChildren(): Promise<LinkedChild[]> {
  return api.get<LinkedChild[]>('/parent/settings/children');
}
