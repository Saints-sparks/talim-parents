/**
 * The accounts created by the backend's `e2e/seed.js` that this suite uses.
 * Fixed on purpose: the seed prints the same list, and its README documents it.
 */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5055';
export const ENVELOPE = process.env.E2E_ENVELOPE ?? 'false';

export interface Account {
  email: string;
  password: string;
  name: string;
}

const PASSWORD = 'Demo#Pass2026';

export const ACCOUNTS = {
  /** Parent of Ada and Ben (Greenfield) and Cara (Hillview). */
  parent: { email: 'parent@e2e.talim.test', password: PASSWORD, name: 'Paul Parent' },
  /** Greenfield's admin: global setup's envelope probe, replies to tickets, rejects test transfers. */
  schoolAdmin: { email: 'admin@e2e.talim.test', password: PASSWORD, name: 'Sade Principal' },
  /** Refused by this portal. */
  student: { email: 'ada.student@e2e.talim.test', password: PASSWORD, name: 'Ada Student' },
} satisfies Record<string, Account>;

export const AUTH_DIR = 'e2e/.auth';
export const authFile = (key: keyof typeof ACCOUNTS): string => `${AUTH_DIR}/${key}.json`;

/** The theme switch's storage key (src/contexts/ThemeContext.tsx). */
export const THEME_KEY = 'talim_theme';

/** The parent's three children, by school. */
export const CHILDREN = [
  { name: 'Ada Student', school: /Greenfield Academy/ },
  { name: 'Ben Student', school: /Greenfield Academy/ },
  { name: 'Cara Student', school: /Hillview Academy/ },
] as const;
