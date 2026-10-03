import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILDREN } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import { monthWeeks, startMonth } from '../../Components/portal/attendance/attendanceMath';
import Attendance from '../Attendance';

const MUSA = CHILDREN[0];

describe('Attendance (fixtures)', () => {
  it("shows the term's rate and numbers, and steps back a month to September's marks", async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Attendance />);
    expect(await screen.findByText('Days present')).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();

    // Walk to September 2026, the month the fixtures have marks for.
    while (!screen.queryByRole('heading', { name: 'September 2026' })) {
      await user.click(screen.getByRole('button', { name: 'Previous month' }));
    }
    expect(await screen.findByText('Wednesday 16: Absent')).toBeInTheDocument();
    expect(screen.getByText('Friday 4: On leave (approved leave, not counted as absence)')).toBeInTheDocument();
    // September is the term's first month: there is no going further back.
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();

    await waitFor(() => expect(requestsTo(fixtures, '/attendance').some((r) => r.query === '?month=2026-09')).toBe(true));
    for (const call of requestsTo(fixtures, '/attendance')) expect(call.headers[CHILD_HEADER]).toBe(MUSA.id);
  });

  it('stops at the end of the term', async () => {
    const user = userEvent.setup();
    renderPortal(<Attendance />);
    await screen.findByText('Days present');
    while (!screen.getByRole('button', { name: 'Next month' }).hasAttribute('disabled')) {
      await user.click(screen.getByRole('button', { name: 'Next month' }));
    }
    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
  });

  it('shows the no-class state instead of asking for register marks', async () => {
    const { fixtures } = renderPortal(<Attendance />, { scenario: 'no-class' });
    expect(await screen.findByText('Musa is not in a class yet')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/attendance')).toHaveLength(0);
  });
});

describe('month layout', () => {
  it('drops weekends and puts the 1st under its weekday', () => {
    // 1 September 2026 is a Tuesday.
    const days = Array.from({ length: 7 }, (_, i) => ({ date: `2026-09-0${i + 1}`, status: 'present' as const }));
    const weeks = monthWeeks(days);
    expect(weeks[0].map((cell) => cell.date)).toEqual([null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
    expect(weeks[1].map((cell) => cell.date)).toEqual(['2026-09-07', null, null, null, null]);
  });

  it('opens on this month inside the term, else the nearest term month', () => {
    const term = { startDate: '2026-09-01', endDate: '2026-12-15' };
    expect(startMonth('2026-10-03', term)).toBe('2026-10');
    expect(startMonth('2027-02-01', term)).toBe('2026-12');
    expect(startMonth('2026-08-01', term)).toBe('2026-09');
  });
});
