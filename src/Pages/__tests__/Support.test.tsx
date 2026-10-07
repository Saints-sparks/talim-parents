import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILD_HEADER } from '../../lib/apiClient';
import { CHILDREN } from '../../dev/fixtures/seed';
import Settings from '../Settings';
import Notifications from '../Notifications';

vi.mock('../../services/chat.services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/chat.services')>()),
  uploadChatAttachment: vi.fn(async (file: File) => ({ url: `https://files.test/${file.name}`, name: file.name, mimeType: file.type, size: file.size, type: 'document' })),
}));

vi.setConfig({ testTimeout: 20_000 });
const MUSA = CHILDREN[0];
const ZAINAB = CHILDREN[2];

/**
 * Renders Settings → Help, optionally with a ticket open.
 *
 * @param query - Extra query, e.g. `&ticket=tk-waiting`.
 * @returns The render result.
 */
function renderHelp(query = '') {
  return renderPortal(<Settings />, { path: '/settings', route: `/settings?tab=help${query}` });
}

/**
 * Opens a ticket from the `?ticket=` deep link and waits for its thread.
 *
 * @param ticketId - The fixture ticket.
 * @returns The dialog and the render result.
 */
async function openThread(ticketId: string) {
  const rendered = renderHelp(`&ticket=${ticketId}`);
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('list', { name: 'Messages' });
  return { dialog, ...rendered };
}

describe('My tickets list (fixtures)', () => {
  it("lists the parent's tickets with the child, status chips, the 'N new' badge and last activity, in one call", async () => {
    const { fixtures } = renderHelp();
    const list = await screen.findByRole('list', { name: 'My tickets' });
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('1 new');
    expect(rows[0]).toHaveTextContent('Report card shows the wrong class');
    expect(rows[0]).toHaveTextContent('Musa Adele · TCKT-20260311 · My school (Easy Sparks Education Center) · Updated 2 hours ago');
    expect(rows[0]).toHaveTextContent('Open');
    expect(rows[1]).toHaveTextContent('Waiting on you');
    expect(rows[1]).toHaveTextContent('TS-4K7QM · Talim support · Updated yesterday');
    expect(rows[2]).toHaveTextContent('Ibrahim Adele');
    expect(rows[2]).toHaveTextContent('My school (Brightgate Academy)');
    expect(rows[2]).toHaveTextContent('Resolved');
    expect(requestsTo(fixtures, '/tickets/mine')).toHaveLength(1);
    expect(requestsTo(fixtures, '/tickets/mine')[0].headers[CHILD_HEADER]).toBeUndefined();
    expect(fixtures.requests.filter((request) => /^\/tickets\/tk-/.test(request.path))).toHaveLength(0);
  });

  it('opens a thread from a row and keeps it in the URL, and closing drops it', async () => {
    const user = userEvent.setup();
    const { location } = renderHelp();
    const list = await screen.findByRole('list', { name: 'My tickets' });
    await user.click(within(list).getByRole('button', { name: /Paid by card but no receipt/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Paid by card but no receipt' });
    await waitFor(() => expect(location()).toBe('/settings?tab=help&ticket=tk-waiting'));
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(location()).toBe('/settings?tab=help'));
  });
});

describe('Ticket thread (fixtures)', () => {
  it('opens from the ?ticket= deep link with the child, messages and status', async () => {
    const { dialog } = await openThread('tk-waiting');
    expect(within(dialog).getByRole('heading', { name: 'Paid by card but no receipt' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Talim support · Payments · About Musa Adele');
    expect(within(dialog).getByText('Waiting on you')).toBeInTheDocument();
    const messages = within(within(dialog).getByRole('list', { name: 'Messages' })).getAllByRole('listitem');
    expect(messages[0]).toHaveTextContent('You');
    expect(messages[1]).toHaveTextContent('Amaka Obi');
    expect(messages[1]).toHaveTextContent('Talim support');
  });

  it('sends a reply and shows it', async () => {
    const user = userEvent.setup();
    const { dialog, fixtures } = await openThread('tk-waiting');
    await user.click(within(dialog).getByRole('button', { name: 'Send reply' }));
    expect(within(dialog).getByLabelText('Your reply')).toHaveAccessibleDescription(/Write a message\./);
    await user.type(within(dialog).getByLabelText('Your reply'), 'The reference is PSK-77812.');
    await user.click(within(dialog).getByRole('button', { name: 'Send reply' }));
    expect(await within(dialog).findByText('The reference is PSK-77812.')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/tickets/tk-waiting/messages')[0].body).toEqual({ body: 'The reference is PSK-77812.' });
    await waitFor(() => expect(within(dialog).getByLabelText('Your reply')).toHaveValue(''));
  });

  it('reopens a ticket resolved two days ago', async () => {
    const user = userEvent.setup();
    const { dialog } = await openThread('tk-resolved');
    expect(within(dialog).getByText(/^You can reopen until /)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reopen' }));
    expect(await within(dialog).findByText('Open')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
  });

  it("shows the 409 when the server says the window has passed", async () => {
    const user = userEvent.setup();
    const { dialog, fixtures } = await openThread('tk-resolved');
    // The server's clock has moved on: it now answers 409 REOPEN_WINDOW_PASSED.
    const stored = fixtures.db.tickets.find((ticket) => ticket.id === 'tk-resolved');
    if (stored) stored.resolvedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await user.click(within(dialog).getByRole('button', { name: 'Reopen' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "This ticket was resolved more than 7 days ago, so it can't be reopened. Raise a new ticket and mention TCKT-20260287.",
    );
  });

  it('offers no Reopen ten days after resolving, only the reason and a new ticket', async () => {
    const user = userEvent.setup();
    const { dialog } = await openThread('tk-old');
    expect(within(dialog).getByText(/can't be reopened\. Raise a new ticket and mention TS-9PX2D\./)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'New ticket' }));
    expect(await screen.findByRole('dialog', { name: 'How can we help?' })).toBeInTheDocument();
  });

  it('closes after a confirm step, then takes no replies', async () => {
    const user = userEvent.setup();
    const { dialog, fixtures } = await openThread('tk-open');
    await user.click(within(dialog).getByRole('button', { name: 'Close ticket' }));
    expect(within(dialog).getByRole('button', { name: 'Yes, close ticket' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Yes, close ticket' }));
    expect(await within(dialog).findByText('This ticket is closed, so it takes no more replies. Raise a new ticket if you still need help.')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Your reply')).not.toBeInTheDocument();
    expect(requestsTo(fixtures, '/tickets/tk-open/close')).toHaveLength(1);
  });
});

describe('New ticket (fixtures)', () => {
  /**
   * Opens the New ticket sheet from Help.
   *
   * @returns The dialog and the render result.
   */
  async function openNew() {
    const user = userEvent.setup();
    const rendered = renderHelp();
    await screen.findByRole('list', { name: 'My tickets' });
    await user.click(screen.getByRole('button', { name: 'New ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'How can we help?' });
    return { user, dialog, ...rendered };
  }

  it('defaults to the active child, offers both desks with that child’s school, and checks every field on Send', async () => {
    const { user, dialog, fixtures } = await openNew();
    const child = within(dialog).getByLabelText('Which child is it about?');
    expect(child).toHaveValue(MUSA.id);
    expect(child).toHaveFocus();
    const desks = within(dialog).getByRole('radiogroup', { name: 'Who should handle it?' });
    expect(within(desks).getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['My school (Easy Sparks Education Center)', 'Talim support']);
    await user.selectOptions(child, ZAINAB.id);
    expect(within(desks).getByRole('radio', { name: 'My school (Brightgate Academy)' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Send ticket' }));
    expect(within(dialog).getByText('Choose who should handle this.')).toBeInTheDocument();
    expect(within(dialog).getByText('Choose what it is about.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Subject')).toHaveAccessibleDescription(/Add a subject\./);
    expect(within(dialog).getByLabelText('Message')).toHaveAccessibleDescription(/Write a message\./);
    expect(within(desks).getAllByRole('radio')[0]).toHaveFocus();
    expect(requestsTo(fixtures, '/tickets').filter((request) => request.method === 'POST')).toHaveLength(0);
  });

  it("raises a ticket about the chosen child to that child's school, with a file, then opens it", async () => {
    const { user, dialog, fixtures, location } = await openNew();
    await user.selectOptions(within(dialog).getByLabelText('Which child is it about?'), ZAINAB.id);
    await user.click(within(dialog).getByRole('radio', { name: 'My school (Brightgate Academy)' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Fees' }));
    await user.type(within(dialog).getByLabelText('Subject'), 'Hostel fee charged twice');
    await user.type(within(dialog).getByLabelText('Message'), 'The invoice shows the hostel fee twice.');
    const file = new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' });
    await user.upload(dialog.querySelector('input[type="file"]') as HTMLInputElement, file);
    expect(within(dialog).getByRole('list', { name: 'Files to send' })).toHaveTextContent('invoice.pdf');
    await user.click(within(dialog).getByRole('button', { name: 'Send ticket' }));

    const thread = await screen.findByRole('dialog', { name: 'Hostel fee charged twice' });
    expect(thread).toHaveTextContent('My school (Brightgate Academy) · Fees · About Zainab Adele');
    const post = requestsTo(fixtures, '/tickets').find((request) => request.method === 'POST');
    expect(post?.body).toEqual({
      desk: 'school',
      area: 'fees',
      subject: 'Hostel fee charged twice',
      body: 'The invoice shows the hostel fee twice.',
      childId: ZAINAB.id,
      attachments: [{ url: 'https://files.test/invoice.pdf', name: 'invoice.pdf', mimeType: 'application/pdf', size: 3 }],
      context: { path: `${window.location.pathname}${window.location.search}`, appVersion: '1.5.0', userAgent: navigator.userAgent },
    });
    await waitFor(() => expect(location()).toMatch(/^\/settings\?tab=help&ticket=tk-new-\d+$/));
  });
});

describe('Support notifications (fixtures)', () => {
  it('files a ticket reply under the Support filter, and its button opens the ticket', async () => {
    const user = userEvent.setup();
    const { location } = renderPortal(<Notifications />, {
      path: '/notifications',
      route: '/notifications',
      prepare: (db) => {
        db.notifications.unshift({
          _id: '69n000000000000000000999',
          title: 'Talim support replied to TS-4K7QM',
          message: 'Could you send the payment reference?',
          category: 'support' as never,
          type: 'support_ticket_reply',
          createdAt: new Date().toISOString(),
          isRead: false,
          childId: null,
          schoolKey: 'sparks',
          senderName: 'Talim',
          target: { page: 'support', ticketId: 'tk-waiting' } as never,
          actionLabel: null as never,
        });
      },
    });
    await user.click(await screen.findByRole('button', { name: /^Support/ }));
    await user.click((await screen.findAllByText('Talim support replied to TS-4K7QM'))[0]);
    await user.click(await screen.findByRole('button', { name: 'Open ticket' }));
    await waitFor(() => expect(location()).toBe('/settings?tab=help&ticket=tk-waiting'));
  });
});
