import { PHONE_PATTERN } from '../services/settings.services';

/**
 * Client-side checks that mirror the API's own rules for account changes, so a
 * parent hears about a problem before the round trip. The server still decides:
 * these never replace its `VALIDATION_FAILED` answer.
 */

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
