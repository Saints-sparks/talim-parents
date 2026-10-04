import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPortal } from '../../test-utils/portal';
import Dashboard from '../Dashboard';
import Timetable from '../Timetable';
import Attendance from '../Attendance';
import Payments from '../Payments';

vi.setConfig({ testTimeout: 20_000 });

/**
 * A school with no current term, as the API answers for a second school
 * before its term starts (Hillview in the e2e seed): `term: null`, no
 * periods or lessons, no report terms, a bill without a term.
 */
describe('a child whose school has no current term (fixtures: no-term)', () => {
  it('Dashboard says the school is between terms', async () => {
    renderPortal(<Dashboard />, { scenario: 'no-term', path: '/dashboard' });
    expect(await screen.findByText('The school is between terms.')).toBeInTheDocument();
  });

  it('Timetable says the week is outside the term', async () => {
    renderPortal(<Timetable />, { scenario: 'no-term', path: '/timetable' });
    expect(await screen.findByText('This week is outside the term, so no lessons are timetabled.')).toBeInTheDocument();
  });

  it('Attendance renders without a term', async () => {
    renderPortal(<Attendance />, { scenario: 'no-term', path: '/attendance' });
    expect(await screen.findByRole('heading', { name: 'Attendance', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/first term/i)).not.toBeInTheDocument();
  });

  it('Payments shows the bill without a term in the subtitle', async () => {
    renderPortal(<Payments />, { scenario: 'no-term', path: '/payments' });
    expect(await screen.findByText('Outstanding balance')).toBeInTheDocument();
    expect(screen.getByText(/Musa Adele · Easy Sparks Education Center$/)).toBeInTheDocument();
  });
});
