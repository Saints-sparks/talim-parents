import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../../test-utils/render';
import { ApiError } from '../../../lib/apiError';

const changePassword = vi.fn();
vi.mock('../../../services/auth.services', () => ({ useAuth: () => ({ changePassword }) }));

import { ChangePasswordModal } from '../ChangePasswordModal';

/** Fills the three password boxes. */
async function fill(current: string, next: string, confirm: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Current Password'), current);
  await user.type(screen.getByLabelText('New Password'), next);
  await user.type(screen.getByLabelText('Confirm New Password'), confirm);
  await user.click(screen.getByRole('button', { name: /update password/i }));
}

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no scrolling; the modal restores scroll position on close.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('explains a weak password without calling the API', async () => {
    renderWithProviders(<ChangePasswordModal onClose={vi.fn()} />);
    await fill('Old#Pass1', 'short', 'short');
    expect(await screen.findByText(/needs at least 8 characters/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('sends exactly the DTO fields and closes on success', async () => {
    changePassword.mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithProviders(<ChangePasswordModal onClose={onClose} />);
    await fill('Old#Pass1', 'New#Pass22', 'New#Pass22');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'Old#Pass1',
      newPassword: 'New#Pass22',
      confirmPassword: 'New#Pass22',
    });
  });

  it('shows a wrong current password under its own field, keyed on the error code', async () => {
    changePassword.mockRejectedValue(new ApiError('UNAUTHENTICATED', 'Invalid credentials', 401));
    const onClose = vi.fn();
    renderWithProviders(<ChangePasswordModal onClose={onClose} />);
    await fill('Wrong#Pass1', 'New#Pass22', 'New#Pass22');
    expect(await screen.findByText(/not your current password/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
