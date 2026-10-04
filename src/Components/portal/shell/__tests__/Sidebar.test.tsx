import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../../../test-utils/portal';
import { CHILDREN } from '../../../../dev/fixtures/seed';
import { Sidebar } from '../Sidebar';
import { TopBar } from '../TopBar';

describe('Sidebar and top bar (fixtures)', () => {
  it("shows the design's groups, the child's school and the badges", async () => {
    renderPortal(<Sidebar drawerOpen={false} onCloseDrawer={() => undefined} />, { path: '/' });
    const nav = screen.getByRole('navigation', { name: 'Portal' });
    expect(within(nav).getByText('Progress')).toBeInTheDocument();
    expect(within(nav).getByText('School & you')).toBeInTheDocument();
    expect(await screen.findByText('Easy Sparks Education Center')).toBeInTheDocument();
    // One pending leave request; all four children still owe fees except none paid in full.
    expect(await within(nav).findByRole('link', { name: 'Leave requests, 1 pending' })).toBeInTheDocument();
    expect(await within(nav).findByRole('link', { name: /Notifications, \d+ unread/ })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Payments, \d with fees due/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account & settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('top bar: menu button, child switcher, bell count from /notifications/counts and the parent', async () => {
    const { fixtures } = renderPortal(<TopBar drawerOpen={false} onToggleDrawer={() => undefined} />, { path: '/' });
    expect(screen.getByRole('button', { name: 'Open the menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(await screen.findByRole('button', { name: /Viewing Musa Adele/ })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Notifications, \d+ unread/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saint Agbukor, account and settings' })).toBeInTheDocument();
    // The bell counts the active child (B11), not the whole family.
    const counts = requestsTo(fixtures, '/notifications/counts');
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.every((request) => request.query === `?childId=${CHILDREN[0].id}`)).toBe(true);
  });
});
