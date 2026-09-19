/** Where a parent writes when they cannot sign in or their child is not linked. */
export const SUPPORT_EMAIL = 'help@talim.com';

/**
 * A `mailto:` link for the address a parent should contact.
 *
 * @param email - The school's own address, when known; falls back to {@link SUPPORT_EMAIL}.
 * @returns The `mailto:` URL.
 */
export function mailtoHref(email?: string | null): string {
  return `mailto:${email?.trim() || SUPPORT_EMAIL}`;
}
