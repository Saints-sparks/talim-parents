import { Moon, Sun, SunMoon } from 'lucide-react';
import type { ThemePreference } from '../../services/settings.services';

/** The theme choices and how they are labelled. */
export const THEME_OPTIONS: readonly { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light Mode', Icon: Sun },
  { value: 'dark', label: 'Dark Mode', Icon: Moon },
  { value: 'system', label: 'System Default', Icon: SunMoon },
];
