import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../auth.services';
import { sessionStore, STORAGE_KEYS } from '../../lib/session';

const changeParentPassword = vi.fn();
vi.mock('../settings.services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../settings.services')>()),
  changeParentPassword: (...args: unknown[]) => changeParentPassword(...args),
}));
vi.mock('../../hooks/usePushNotifications', () => ({ unsubscribeWebPushOnLogout: vi.fn() }));

/** A button that changes the password and shows the token the context now holds. */
function Probe() {
  const { changePassword, authToken } = useAuth();
  return (
    <>
      <button onClick={() => void changePassword({ currentPassword: 'a', newPassword: 'b', confirmPassword: 'b' })}>go</button>
      <span data-testid="token">{authToken}</span>
    </>
  );
}

describe('AuthProvider.changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem(STORAGE_KEYS.accessToken, 'old-token');
    sessionStore.__resetForTests();
  });

  it('adopts the rotated access token everywhere it is read', async () => {
    changeParentPassword.mockResolvedValue({ success: true, message: 'ok', access_token: 'new-token' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await userEvent.click(screen.getByText('go'));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('new-token'));
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBe('new-token');
    expect(sessionStore.getToken()).toBe('new-token');
  });
});
