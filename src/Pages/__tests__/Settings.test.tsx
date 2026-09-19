import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test-utils/render';
import type { ParentSettings } from '../../services/settings.services';

const getParentSettings = vi.fn();
const updateThemePreference = vi.fn();
const setTheme = vi.fn();

vi.mock('../../services/auth.services', () => ({
  useAuth: () => ({
    user: { firstName: 'Amina', lastName: 'Bello', email: 'amina@example.com' },
    parentId: 'p1',
    logout: vi.fn(),
    updateUser: vi.fn(),
    changePassword: vi.fn(),
  }),
}));
vi.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'system', setTheme }) }));
vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));
vi.mock('../../services/settings.services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/settings.services')>()),
  getParentSettings: () => getParentSettings(),
  updateThemePreference: (...a: unknown[]) => updateThemePreference(...a),
}));

import Settings from '../Settings';

const SETTINGS: ParentSettings = {
  profile: {
    id: 'p1',
    fullName: 'Amina Bello',
    email: 'amina@example.com',
    phoneNumber: '08012345678',
    role: 'parent',
    isEmailVerified: true,
    isPhoneVerified: false,
  },
  children: [
    { id: 'c1', fullName: 'Chidi Bello', className: 'JSS 1', grade: 'Grade 7', schoolName: 'Grace Academy', status: 'Active' },
  ],
  preferences: { notifications: {}, theme: 'dark', language: 'en-US' },
  security: { twoFactorEnabled: false, emailOtpEnabled: true, lastPasswordChangedAt: null },
};

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    getParentSettings.mockResolvedValue(SETTINGS);
  });

  it('shows the parent, their children and the saved theme from the API, and applies it', async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText('Amina Bello')).toBeInTheDocument();
    expect(screen.getByText('Chidi Bello')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('offers no control that does nothing: no two-factor, no language', async () => {
    renderWithProviders(<Settings />);
    await screen.findByText('Amina Bello');
    expect(screen.queryByText(/two-factor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/language/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('carries the guide targets the page tour points at', async () => {
    const { container } = renderWithProviders(<Settings />);
    await screen.findByText('Amina Bello');
    for (const target of ['settings-header', 'settings-profile', 'settings-children', 'settings-security', 'settings-preferences']) {
      expect(container.querySelector(`[data-guide="${target}"]`)).not.toBeNull();
    }
  });

  it('shows an error with a retry when the settings cannot be loaded', async () => {
    getParentSettings.mockRejectedValueOnce(new Error('down'));
    renderWithProviders(<Settings />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    getParentSettings.mockResolvedValue(SETTINGS);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Amina Bello')).toBeInTheDocument();
  });

  it('reverts the theme when the server refuses the change', async () => {
    updateThemePreference.mockRejectedValue(new Error('nope'));
    renderWithProviders(<Settings />);
    await screen.findByText('Amina Bello');
    await userEvent.click(screen.getByRole('button', { name: /theme/i }));
    await userEvent.click(screen.getByRole('radio', { name: /light mode/i }));
    await userEvent.click(screen.getByRole('button', { name: /save preference/i }));
    await waitFor(() => expect(setTheme).toHaveBeenLastCalledWith('dark'));
    expect(updateThemePreference).toHaveBeenCalledWith({ theme: 'light' });
  });
});
