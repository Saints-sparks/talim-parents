import { PHONE_PATTERN, type ChangePasswordPayload } from '../services/settings.services';

/**
 * Client-side checks that mirror the API's own rules for account changes, so a
 * parent hears about a problem before the round trip. The server still decides:
 * these never replace its `VALIDATION_FAILED` answer.
 */

/** Field name to the message shown under it. */
export type FieldMessages = Partial<Record<keyof ChangePasswordPayload, string>>;

/**
 * Checks a password change against `ChangePasswordDto` and the strength rules
 * the service enforces: at least 8 characters with upper- and lower-case
 * letters, a number and a symbol.
 *
 * @param form - What the parent typed.
 * @returns A message per invalid field; empty when the form is fine to send.
 */
export function validatePasswordChange(form: ChangePasswordPayload): FieldMessages {
  const errors: FieldMessages = {};
  if (!form.currentPassword) errors.currentPassword = 'Enter your current password.';

  const missing: string[] = [];
  if (form.newPassword.length < 8) missing.push('at least 8 characters');
  if (!/[a-z]/.test(form.newPassword)) missing.push('a lower-case letter');
  if (!/[A-Z]/.test(form.newPassword)) missing.push('an upper-case letter');
  if (!/\d/.test(form.newPassword)) missing.push('a number');
  if (!/[^A-Za-z0-9]/.test(form.newPassword)) missing.push('a symbol');
  if (missing.length > 0) errors.newPassword = `Your new password needs ${missing.join(', ')}.`;
  else if (form.newPassword === form.currentPassword) {
    errors.newPassword = 'Choose a password you have not used just now.';
  }

  if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'The passwords do not match.';
  return errors;
}

/**
 * Removes the spaces and dashes people type into phone numbers, so
 * "0801 234 5678" and "+234-801-234-5678" match the API's pattern.
 *
 * @param input - What the parent typed.
 * @returns The number with separators removed.
 */
export function normalizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, '');
}

/**
 * Whether a number is one the API will accept (`SendPhoneOtpDto`).
 *
 * @param input - What the parent typed.
 * @returns True for a Nigerian mobile number, with or without separators.
 */
export function isValidPhone(input: string): boolean {
  return PHONE_PATTERN.test(normalizePhone(input));
}
