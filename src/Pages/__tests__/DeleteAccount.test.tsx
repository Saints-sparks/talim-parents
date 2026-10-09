import { describe, expect, it, vi } from 'vitest';
import { renderHook, screen, waitFor, within } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import Settings from '../Settings';
import SignIn from '../auth/SignIn';
import { toast } from '../../Components/CustomToast';
import { STORAGE_KEYS } from '../../lib/session';
import { useClearCacheOnSignOut } from '../../providers/QueryProvider';
import { DELETION_CANCELLED_MESSAGE, deletionErrorMessage, deletionNoticeFromSearch } from '../../lib/accountDeletion';
import { ApiError } from '../../lib/apiError';

vi.setConfig({ testTimeout: 20_000 });

const ROUTE = '/?deletionScheduledFor=2026-11-08T10%3A00%3A00.000Z';

/**
 * Renders Settings → Security against the fixtures.
 *
 * @returns The render result.
 */
function renderSecurity() {
  return renderPortal(<Settings />, { path: '/settings', route: '/settings?tab=security' });
}

/**
 * Opens the delete sheet from the danger zone.
 *
 * @param user - The user-event instance.
 * @returns The dialog.
 */
async function openSheet(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(await screen.findByRole('button', { name: 'Delete account' }));
  return screen.findByRole('dialog', { name: 'Delete your account?' });
}

/**
 * Types a password and ticks the box.
 *
 * @param user - The user-event instance.
 * @param dialog - The open sheet.
 * @param password - What to type.
 */
async function complete(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, password: string): Promise<void> {
  await user.type(within(dialog).getByLabelText('Password'), password);
  await user.click(within(dialog).getByRole('checkbox', { name: /I understand/ }));
}

describe('Settings → Security → Danger zone (fixtures)', () => {
  it('explains the 30 days, what is erased and kept, and links the full explanation', async () => {
    renderSecurity();
    const zone = await screen.findByRole('region', { name: 'Danger zone' });
    expect(zone).toHaveTextContent('deleted in 30 days');
    expect(zone).toHaveTextContent('signing in before then cancels it');
    expect(zone).toHaveTextContent('name, email, phone number and photo are erased');
    expect(zone).toHaveTextContent('keeps their grades, attendance and your payments');
    expect(within(zone).getByRole('link', { name: /What happens when you delete your account/ })).toHaveAttribute(
      'href',
      'https://www.mytalim.com/delete-account',
    );
  });

  it('keeps Delete disabled until a password is typed and the box is ticked', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderSecurity();
    const dialog = await openSheet(user);
    const confirm = within(dialog).getByRole('button', { name: 'Delete account' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Password'), 'pw');
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /I understand/ }));
    expect(confirm).toBeEnabled();
    await user.clear(within(dialog).getByLabelText('Password'));
    expect(confirm).toBeDisabled();
    expect(requestsTo(fixtures, '/auth/account/deletion')).toHaveLength(0);
  });

  it('on 200 signs out without more server calls and lands on sign-in with the date', async () => {
    const user = userEvent.setup();
    const { fixtures, location } = renderSecurity();
    const dialog = await openSheet(user);
    await complete(user, dialog, 'Correct-Passw0rd!');
    await user.type(within(dialog).getByLabelText(/Why are you leaving/), 'Moving abroad');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    await waitFor(() => expect(location()).toBe(ROUTE));
    expect(requestsTo(fixtures, '/auth/account/deletion')[0].body).toEqual({ password: 'Correct-Passw0rd!', reason: 'Moving abroad' });
    expect(requestsTo(fixtures, '/auth/logout')).toHaveLength(0);
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  });

  it('shows a wrong password (400, field error on password) on the field', async () => {
    const user = userEvent.setup();
    const { location } = renderSecurity();
    const dialog = await openSheet(user);
    await complete(user, dialog, 'wrong-password');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    const field = within(dialog).getByLabelText('Password');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription('Password is incorrect');
    expect(location()).toBe('/settings?tab=security');
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBe('fixture-access-token');
  });

  it('shows other refusals in a banner', async () => {
    const user = userEvent.setup();
    renderSecurity();
    const dialog = await openSheet(user);
    await complete(user, dialog, 'already-scheduled');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Your account is already scheduled for deletion.');
    expect(deletionErrorMessage(new ApiError('FORBIDDEN', '', 403, [], undefined, 'ADMIN_ACCOUNT')).banner).toBe(
      "Talim platform admin accounts can't be deleted from here.",
    );
  });
});

describe('About and sign-in (fixtures)', () => {
  it('keeps the in-app policy, links the full one, and links Support', async () => {
    const user = userEvent.setup();
    renderPortal(<Settings />, { path: '/settings', route: '/settings?tab=about' });
    expect(await screen.findByRole('link', { name: /Support/ })).toHaveAttribute('href', 'https://www.mytalim.com/support');
    await user.click(screen.getByRole('button', { name: /Privacy Policy/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Privacy Policy' });
    expect(within(dialog).getByRole('heading', { name: 'Who can see your data' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Read the full policy/ })).toHaveAttribute('href', 'https://www.mytalim.com/privacy');
  });

  it('says when the account will be deleted, and links Privacy, Terms and Support in the footer', async () => {
    renderPortal(<SignIn />, { path: '/', route: ROUTE, signedOut: true });
    expect(await screen.findByText('Your account will be deleted on 8 November 2026. Sign in before then to cancel.')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Talim policies and support' });
    expect(within(nav).getByRole('link', { name: /Privacy/ })).toHaveAttribute('href', 'https://www.mytalim.com/privacy');
    expect(within(nav).getByRole('link', { name: /Terms/ })).toHaveAttribute('href', 'https://www.mytalim.com/terms');
    expect(within(nav).getByRole('link', { name: /Support/ })).toHaveAttribute('href', 'https://www.mytalim.com/support');
    expect(deletionNoticeFromSearch('?deletionScheduledFor=nope')).toBeNull();
  });

  it('toasts the cancelled notice when login answers deletionCancelled: true', async () => {
    const success = vi.spyOn(toast, 'success');
    const user = userEvent.setup();
    renderPortal(<SignIn />, { path: '/', signedOut: true });
    await user.type(screen.getByLabelText('Email address'), 'saint@example.com');
    await user.type(screen.getByLabelText('Password'), 'returning-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(success).toHaveBeenCalledWith(DELETION_CANCELLED_MESSAGE));
    expect(DELETION_CANCELLED_MESSAGE).toBe('Welcome back. Your account deletion has been cancelled.');
    success.mockRestore();
  });
});

describe('useClearCacheOnSignOut', () => {
  it('empties the cache when the session ends, not before', () => {
    const client = new QueryClient();
    client.setQueryData(['dashboard'], { total: 1 });
    const { rerender } = renderHook(({ signedIn }) => useClearCacheOnSignOut(client, signedIn), { initialProps: { signedIn: true } });
    expect(client.getQueryData(['dashboard'])).toEqual({ total: 1 });
    rerender({ signedIn: false });
    expect(client.getQueryData(['dashboard'])).toBeUndefined();
  });
});
