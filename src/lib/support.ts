/** Where a parent writes when they cannot sign in or their child is not linked. */
export const SUPPORT_EMAIL = 'support@mytalim.com';

/**
 * A `mailto:` link for the address a parent should contact.
 *
 * @param email - The school's own address, when known; falls back to {@link SUPPORT_EMAIL}.
 * @returns The `mailto:` URL.
 */
export function mailtoHref(email?: string | null): string {
  return `mailto:${email?.trim() || SUPPORT_EMAIL}`;
}

/** Talim's privacy policy on the public site. */
export const PRIVACY_POLICY_URL = 'https://www.mytalim.com/privacy';

/** Talim's terms of service on the public site. */
export const TERMS_OF_SERVICE_URL = 'https://www.mytalim.com/terms';

/** How to get help with Talim, on the public site. */
export const SUPPORT_URL = 'https://www.mytalim.com/support';

/** What deleting an account does, and what to do without access, on the public site. */
export const DELETE_ACCOUNT_INFO_URL = 'https://www.mytalim.com/delete-account';
