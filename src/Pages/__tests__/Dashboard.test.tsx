import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { CHILDREN } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import Dashboard from '../Dashboard';

const MUSA = CHILDREN[0];

describe('Dashboard (fixtures)', () => {
  it('shows the four tiles, attention, lessons, updates and the term chart for the active child', async () => {
    const { fixtures } = renderPortal(<Dashboard />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Good morning, Saint' })).toBeInTheDocument();
    expect(screen.getByText(/Here is how Musa is doing in Jss1 A at Easy Sparks Education Center/)).toBeInTheDocument();
    for (const label of ['Term average', 'Class position', 'Attendance', 'Fees']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    const attention = screen.getByRole('region', { name: 'Needs your attention' });
    expect(within(attention).getByText('First term fees part paid')).toBeInTheDocument();
    expect(within(attention).getByText('Term report is ready')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: "Today's lessons" })).toHaveTextContent('Computer Studies');
    expect(screen.getByRole('list', { name: "Musa's subject totals" })).toBeInTheDocument();

    // One aggregate request for the screen, for this child, with the child header.
    const calls = requestsTo(fixtures, '/dashboard');
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe(`/parents/me/children/${MUSA.id}/dashboard`);
    expect(calls[0].headers[CHILD_HEADER]).toBe(MUSA.id);
  });

  it('asks for a link code when no child is linked', async () => {
    renderPortal(<Dashboard />, { scenario: 'empty' });
    expect(await screen.findByText('No child is linked to this account yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter link code' })).toBeInTheDocument();
  });

  it('explains a child the school has not placed in a class, without asking for lessons', async () => {
    const { fixtures } = renderPortal(<Dashboard />, { scenario: 'no-class' });
    expect(await screen.findByText('Musa is not in a class yet')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/dashboard')).toHaveLength(0);
  });
});
