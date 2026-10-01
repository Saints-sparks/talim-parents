import type { PasswordPolicy } from '../types/portal/school';

/**
 * Password rules built from the server's policy (`GET /auth/password-policy`,
 * §34), so a password that passes here is accepted there. Until the policy
 * answers (or if it cannot), the backend's default policy is used.
 */

/** One rule, with the nudge shown while it is unmet. */
export interface PolicyRule {
  id: 'length' | 'upper' | 'lower' | 'number' | 'symbol';
  label: string;
  hint: string;
  test: (password: string) => boolean;
}

/** The backend's default policy (`security-config.service.ts`). */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  symbols: '!@#$%^&*(),.?":{}|<>',
  historyCount: 1,
};

/**
 * Escapes a string for use inside a regular-expression character class.
 *
 * @param chars - The characters.
 * @returns The escaped characters.
 */
function escapeClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, '\\$&');
}

/**
 * The rules a policy asks for, in the order they are checked and listed.
 *
 * @param policy - The server's policy; the default while it loads or after it failed.
 * @returns The rules.
 */
export function rulesFromPolicy(policy?: PasswordPolicy | null): PolicyRule[] {
  const source = policy ?? DEFAULT_PASSWORD_POLICY;
  const minLength = Number.isFinite(Number(source.minLength)) && source.minLength > 0 ? Math.floor(source.minLength) : 8;
  const rules: PolicyRule[] = [
    { id: 'length', label: `At least ${minLength} characters`, hint: `Use at least ${minLength} characters.`, test: (p) => p.length >= minLength },
  ];
  if (source.requireUppercase) rules.push({ id: 'upper', label: 'An uppercase letter', hint: 'Include an uppercase letter.', test: (p) => /[A-Z]/.test(p) });
  if (source.requireLowercase) rules.push({ id: 'lower', label: 'A lowercase letter', hint: 'Include a lowercase letter.', test: (p) => /[a-z]/.test(p) });
  if (source.requireNumber) rules.push({ id: 'number', label: 'A number', hint: 'Include a number.', test: (p) => /\d/.test(p) });
  if (source.requireSymbol) {
    const symbols = source.symbols || DEFAULT_PASSWORD_POLICY.symbols || '';
    const pattern = new RegExp(`[${escapeClass(symbols)}]`);
    rules.push({
      id: 'symbol',
      label: `A symbol such as ${symbols.slice(0, 8).split('').join(' ')}`,
      hint: 'Include a symbol such as ! @ # $ or %.',
      test: (p) => pattern.test(p),
    });
  }
  return rules;
}

/**
 * Whether a password meets a policy (and its maximum length).
 *
 * @param password - The candidate.
 * @param policy - The server's policy; the default when missing.
 * @returns True when every rule is met.
 */
export function meetsPolicy(password: string, policy?: PasswordPolicy | null): boolean {
  const max = policy?.maxLength ?? DEFAULT_PASSWORD_POLICY.maxLength ?? 128;
  return password.length <= max && rulesFromPolicy(policy).every((rule) => rule.test(password));
}
