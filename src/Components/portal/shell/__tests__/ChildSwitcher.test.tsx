import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../../../test-utils/portal';
import { userEvent } from '../../../../test-utils/render';
import { CHILDREN } from '../../../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../../../lib/apiClient';
import { ChildSwitcher } from '../ChildSwitcher';
import Dashboard from '../../../../Pages/Dashboard';

const [MUSA, , ZAINAB] = CHILDREN;

describe('ChildSwitcher', () => {
  it('groups the children by school, with class and attendance', async () => {
    const user = userEvent.setup();
    renderPortal(<ChildSwitcher />);
    await user.click(await screen.findByRole('button', { name: /Viewing Musa Adele/ }));

    const sparks = screen.getByRole('group', { name: 'Easy Sparks Education Center' });
    const bright = screen.getByRole('group', { name: 'Brightgate Academy' });
    expect(within(sparks).getAllByRole('button').map((b) => b.textContent)).toEqual([
      expect.stringContaining('Musa Adele'),
      expect.stringContaining('Aisha Adele'),
    ]);
    expect(within(bright).getByText('Zainab Adele')).toBeInTheDocument();
    expect(within(sparks).getByText(/Jss1 A · \d+(\.\d)?% attendance/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manage children/ })).toBeInTheDocument();
  });

  it('switching child refetches the child-scoped screen with the new X-Talim-Child', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(
      <>
        <ChildSwitcher />
        <Dashboard />
      </>,
    );
    await screen.findByText(/Here is how Musa is doing/);
    expect(requestsTo(fixtures, '/dashboard').map((r) => r.headers[CHILD_HEADER])).toEqual([MUSA.id]);

    await user.click(screen.getByRole('button', { name: /Viewing Musa Adele/ }));
    await user.click(screen.getByRole('button', { name: /Zainab Adele/ }));

    expect(await screen.findByText(/Here is how Zainab is doing in Jss3 A at Brightgate Academy/)).toBeInTheDocument();
    await waitFor(() => expect(requestsTo(fixtures, '/dashboard').map((r) => r.headers[CHILD_HEADER])).toEqual([MUSA.id, ZAINAB.id]));
    expect(requestsTo(fixtures, '/dashboard')[1].path).toBe(`/parents/me/children/${ZAINAB.id}/dashboard`);
    // The choice is remembered for the next visit.
    expect(window.localStorage.getItem(`selected_student_${'65e0000000000000000000p1'}`)).toBe(ZAINAB.id);
  });
});
