import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILD_HEADER } from '../../lib/apiClient';
import { CHILDREN } from '../../dev/fixtures/seed';
import Settings from '../Settings';
import { relationshipLine } from '../../Components/portal/settings/AccountPanel';

vi.setConfig({ testTimeout: 20_000 });
const MUSA = CHILDREN[0];

/**
 * Renders Settings on one tab.
 *
 * @param tab - The tab.
 * @param scenario - The fixture family.
 * @returns The render result.
 */
function renderTab(tab: string, scenario: 'family' | 'single' | 'empty' = 'family') {
  return renderPortal(<Settings />, { path: '/settings', route: `/settings?tab=${tab}`, scenario });
}

describe('Settings (fixtures)', () => {
  it('lists the eight tabs, with no two-step sign-in anywhere', async () => {
    renderTab('account');
    const tabs = await screen.findByRole('tablist', { name: 'Settings' });
    expect(within(tabs).getAllByRole('tab').map((tab) => tab.querySelector('span')?.textContent)).toEqual([
      'Account', 'Children', 'Notifications', 'Messages', 'Payments', 'Security', 'Help', 'About',
    ]);
    expect(screen.queryByText(/two-step|2FA/i)).not.toBeInTheDocument();
  });

  it('Account: shows the profile with relationships, email read-only, and saves name, occupation and address', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderTab('account');
    expect(await screen.findByText('Civil servant')).toBeInTheDocument();
    expect(screen.getByText('Father of Musa and Aisha · Guardian of Zainab and Ibrahim')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Occupation'));
    await user.type(screen.getByLabelText('Occupation'), 'Engineer');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Your profile has been saved.')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/parent/settings/profile')[0].body).toEqual({ occupation: 'Engineer' });
  });

  it('Children: cards grouped by school, and a link code adds a child (wrong and used codes explained)', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderTab('children');
    expect(await screen.findByRole('heading', { name: 'Easy Sparks Education Center' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Brightgate Academy' })).toBeInTheDocument();
    expect(screen.getByText('Currently viewing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "View Zainab's portal" })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enter link code' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a child' });
    await user.type(within(dialog).getByLabelText('Link code'), 'WXYZ-0000');
    await user.click(within(dialog).getByRole('button', { name: 'Father' }));
    await user.click(within(dialog).getByRole('button', { name: 'Link child' }));
    expect(await within(dialog).findByText(/wrong or has expired/)).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Link code'));
    await user.type(within(dialog).getByLabelText('Link code'), 'USED-0000');
    await user.click(within(dialog).getByRole('button', { name: 'Link child' }));
    expect(await within(dialog).findByText(/already been used/)).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Link code'));
    await user.type(within(dialog).getByLabelText('Link code'), 'abcd1234');
    await user.click(within(dialog).getByRole('button', { name: 'Link child' }));
    expect(await screen.findByRole('dialog', { name: 'Tobi Adele added' })).toBeInTheDocument();
    const link = requestsTo(fixtures, '/children/link');
    expect(link[link.length - 1].body).toEqual({ code: 'ABCD-1234', relationship: 'FATHER' });
  });

  it('Notifications: each switch saves only what changed', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderTab('notifications');
    const fees = await screen.findByRole('switch', { name: 'Fee reminders' });
    expect(fees).toHaveAttribute('aria-checked', 'true');
    await user.click(fees);
    await waitFor(() => expect(requestsTo(fixtures, '/notifications/preferences').find((r) => r.method === 'PATCH')?.body).toEqual({ feesEnabled: false }));
    expect(screen.getByRole('switch', { name: 'Leave decisions' })).toBeInTheDocument();
  });

  it('Messages: online status, read receipts and message preview', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderTab('messages');
    await user.click(await screen.findByRole('switch', { name: 'Message preview' }));
    await waitFor(() => expect(requestsTo(fixtures, '/chat/preferences').find((r) => r.method === 'PATCH')?.body).toEqual({ messagePreview: false }));
    expect(screen.getByRole('switch', { name: 'Show online status' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Read receipts' })).toBeInTheDocument();
  });

  it('Payments: preferred method and the term receipts download, no card form', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderTab('payments');
    await user.click(await screen.findByRole('button', { name: 'OPay' }));
    await waitFor(() => expect(requestsTo(fixtures, '/parent/settings/preferences')[0]?.body).toEqual({ preferredProvider: 'opay' }));
    expect(screen.queryByText(/Add a card/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Download all receipts/ }));
    expect(await screen.findByRole('dialog', { name: 'Download receipts' })).toBeInTheDocument();
  });

  it('Security: signs other devices out and checks a new password against the policy', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderTab('security');
    expect(await screen.findByText('This device')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out other devices' }));
    await waitFor(() => expect(requestsTo(fixtures, '/auth/sessions/revoke-others')).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: /Change password/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Change password' });
    await user.type(within(dialog).getByLabelText('Current password'), 'Old-Passw0rd!');
    await user.type(within(dialog).getByLabelText('New password'), 'short');
    await user.type(within(dialog).getByLabelText('Confirm new password'), 'short');
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }));
    expect(within(dialog).getByText("Your new password doesn't meet every rule yet.")).toBeInTheDocument();
    expect(requestsTo(fixtures, '/parent/settings/password')).toHaveLength(0);

    await user.clear(within(dialog).getByLabelText('New password'));
    await user.type(within(dialog).getByLabelText('New password'), 'N3w-Passw0rd!');
    await user.clear(within(dialog).getByLabelText('Confirm new password'));
    await user.type(within(dialog).getByLabelText('Confirm new password'), 'N3w-Passw0rd!');
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }));
    expect(await screen.findByRole('dialog', { name: 'Password changed' })).toBeInTheDocument();
  });

  it("Help: contacts the active child's school (tel: only) and reports a problem to support", async () => {
    const user = userEvent.setup();
    const { fixtures } = renderTab('help');
    await user.click(await screen.findByRole('button', { name: /Contact the school office/ }));
    const contact = await screen.findByRole('dialog', { name: 'Easy Sparks Education Center' });
    expect(await within(contact).findByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+2348024157730');
    expect(within(contact).getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:office@easysparks.edu.ng');
    expect(requestsTo(fixtures, '/school')[0].headers[CHILD_HEADER]).toBe(MUSA.id);
    await user.click(within(contact).getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: /Report a problem/ }));
    const report = await screen.findByRole('dialog', { name: 'Tell Talim what is not working' });
    await user.click(within(report).getByRole('button', { name: 'Results' }));
    await user.type(within(report).getByLabelText('What went wrong'), 'The report card will not load.');
    await user.click(within(report).getByRole('button', { name: 'Send to Talim support' }));
    expect(await screen.findByRole('dialog', { name: 'Report sent' })).toBeInTheDocument();
    expect(requestsTo(fixtures, '/support/tickets')[0].body).toEqual(expect.objectContaining({ area: 'results', description: 'The report card will not load.' }));
  });

  it('About: version and the privacy policy', async () => {
    const user = userEvent.setup();
    renderTab('about');
    expect(await screen.findByText('Talim Parents Web')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Privacy Policy/ }));
    expect(await screen.findByRole('dialog', { name: 'Privacy Policy' })).toBeInTheDocument();
  });

  it('Children with none linked yet still offers the link code', async () => {
    renderTab('children', 'empty');
    expect(await screen.findByRole('button', { name: 'Enter link code' })).toBeInTheDocument();
  });
});

describe('relationshipLine', () => {
  it('groups the children by relationship', () => {
    const kid = (name: string, relationship: 'MOTHER' | 'GUARDIAN') => ({ id: name, name, relationship } as never);
    expect(relationshipLine([kid('Ada Obi', 'MOTHER'), kid('Tolu Obi', 'MOTHER'), kid('Femi Obi', 'GUARDIAN')])).toBe('Mother of Ada and Tolu · Guardian of Femi');
    expect(relationshipLine([])).toBeNull();
  });
});
