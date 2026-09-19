import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { logger } from '../lib/logger';
import type { ThemePreference } from '../services/settings.services';

/** What `useTheme()` exposes. */
export interface ThemeContextValue {
  /** The parent's choice; `system` follows the device. */
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const STORAGE_KEY = 'talim_theme';
const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system'];

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

/**
 * Whether the device currently prefers a dark colour scheme.
 *
 * @returns `"dark"` or `"light"`.
 */
function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Puts the `dark` class on `<html>` when the chosen theme calls for it.
 *
 * @param theme - The parent's choice.
 */
function applyThemeClass(theme: ThemePreference): void {
  const shouldBeDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');
  document.documentElement.classList.toggle('dark', shouldBeDark);
}

/**
 * The stored choice, ignoring anything that is not a known theme.
 *
 * @returns The stored theme, or `system`.
 */
function readStoredTheme(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.find((theme) => theme === stored) ?? 'system';
  } catch (error) {
    logger.warn('theme', 'Stored theme could not be read', error);
    return 'system';
  }
}

/**
 * Owns the light/dark/system choice and keeps `<html class="dark">` in step.
 * The choice is remembered on this device; the Settings page also saves it
 * against the parent's account.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Follow the device while the parent has chosen "system".
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => applyThemeClass('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference): void => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      // Private browsing: the choice still applies for this visit.
      logger.warn('theme', 'Theme could not be remembered on this device', error);
    }
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The current theme and how to change it.
 *
 * @returns The theme context.
 */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
