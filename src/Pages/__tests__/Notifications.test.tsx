import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILDREN } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import Notifications from '../Notifications';

vi.setConfig({ testTimeout: 20_000 });
const [MUSA, , ZAINAB] = CHILDREN;

describe('Notifications (fixtures)', () => {
  it("defaults the child filter to the active child and shows that child's and their school's notices", async () => {
    const { fixtures } = renderPortal(<Notifications />);
    const list = await screen.findByRole('region', { name: 'Notification list' });
    expect(within(list).getByText('Musa was marked absent')).toBeInTheDocument();
    expect(within(list).queryByText('Zainab was marked absent')).not.toBeInTheDocument();
    expect(within(list).getByText("Parents' evening, 2 October")).toBeInTheDocument();
    expect(screen.getByLabelText('Child')).toHaveValue(MUSA.id);
    const feed = requestsTo(fixtures, '/notifications').filter((r) => r.path === '/notifications');
    expect(feed[0].query).toContain(`childId=${MUSA.id}`);
    // Notifications are per parent: the child is a filter, not the X-Talim-Child scope.
    expect(feed[0].headers[CHILD_HEADER]).toBeUndefined();
  });

  it('filters by category (Payments, Results, Attendance, School, Leave, Unread)', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Notifications />);
    await screen.findByRole('region', { name: 'Notification list' });
    for (const [label, category] of [['Payments', 'payments'], ['Results', 'grading'], ['Attendance', 'attendance'], ['School', 'announcement'], ['Leave', 'leave']]) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
      await waitFor(() => expect(requestsTo(fixtures, '/notifications').some((r) => r.path === '/notifications' && r.query.includes(`category=${category}`))).toBe(true));
    }
    await user.click(screen.getByRole('button', { name: /^Unread/ }));
    await waitFor(() => expect(requestsTo(fixtures, '/notifications').some((r) => r.query.includes('unread=true'))).toBe(true));
    const list = await screen.findByRole('region', { name: 'Notification list' });
    expect(within(list).queryByText('Musa was marked absent')).not.toBeInTheDocument();
  });

  it('switches to another child or every child', async () => {
    const user = userEvent.setup();
    renderPortal(<Notifications />);
    await screen.findByRole('region', { name: 'Notification list' });
    await user.selectOptions(screen.getByLabelText('Child'), ZAINAB.id);
    const list = (): HTMLElement => screen.getByRole('region', { name: 'Notification list' });
    await waitFor(() => expect(within(list()).getByText('Zainab was marked absent')).toBeInTheDocument());
    expect(within(list()).queryByText('Musa was marked absent')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Child'), 'all');
    await waitFor(() => expect(within(list()).getByText('Musa was marked absent')).toBeInTheDocument());
    expect(within(list()).getByText('Zainab was marked absent')).toBeInTheDocument();
  });

  it('opens an item, marks it read, and its action goes to the target page', async () => {
    const user = userEvent.setup();
    const { fixtures, location } = renderPortal(<Notifications />, { path: '/notifications' });
    const list = await screen.findByRole('region', { name: 'Notification list' });
    await user.click(within(list).getByRole('button', { name: /Fee reminder: first term/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Fee reminder: first term' })).toBeInTheDocument();
    await waitFor(() => expect(requestsTo(fixtures, '/read').filter((r) => r.method === 'PUT')).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Open Payments' }));
    expect(location()).toBe('/payments');
  });

  it('marks everything read with one request (read-all), not one per item', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Notifications />);
    await screen.findByRole('region', { name: 'Notification list' });
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(requestsTo(fixtures, '/notifications/read-all')).toHaveLength(1));
    expect(fixtures.requests.filter((r) => r.method === 'PUT')).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled());
  });

  it('says when nothing is linked yet', async () => {
    renderPortal(<Notifications />, { scenario: 'empty' });
    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument();
  });
});
