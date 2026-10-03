import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILDREN } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import Timetable from '../Timetable';
import { lessonIndex } from '../../Components/portal/timetable/lessonIndex';
import type { ChildTimetable } from '../../types/portal/learner';

const ZAINAB = CHILDREN[2];

describe('Timetable (fixtures)', () => {
  it('shows the subject legend and the week grid with teachers and the break', async () => {
    renderPortal(<Timetable />, { childId: ZAINAB.id });
    const table = await screen.findByRole('table');
    expect(screen.getByText(/Zainab Adele · Jss3 A · 08:00 to 16:00, Monday to Friday/)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Subjects' })).getAllByRole('listitem')).toHaveLength(12);
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent?.split(/\d/)[0])).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    expect(within(table).getAllByText('Break')).toHaveLength(5);
    // Brightgate teachers, not Easy Sparks ones: the child decides the school.
    expect(within(table).getAllByText('Mrs Ngozi Umeh').length).toBeGreaterThan(0);
  });

  it('pages to the next week with the child header', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Timetable />, { childId: ZAINAB.id });
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Next week' }));
    await waitFor(() => expect(requestsTo(fixtures, '/timetable')).toHaveLength(2));
    const second = requestsTo(fixtures, '/timetable')[1];
    expect(second.query).toMatch(/^\?weekStart=\d{4}-\d{2}-\d{2}$/);
    expect(second.headers[CHILD_HEADER]).toBe(ZAINAB.id);
    expect(await screen.findByRole('button', { name: 'This week' })).toBeInTheDocument();
  });

  it('shows the no-class state without asking for lessons', async () => {
    const { fixtures } = renderPortal(<Timetable />, { scenario: 'no-class' });
    expect(await screen.findByText('Musa is not in a class yet')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/timetable')).toHaveLength(0);
  });
});

describe('lessonIndex', () => {
  it('keys lessons by day and period, matching a lesson without a period key by its start time', () => {
    const base = { day: 'Monday', endTime: '09:00', course: { id: 'c', code: null, title: 'Maths' }, subject: null, class: { id: 'k', name: 'A' }, classRoomId: null, room: null, topic: null, cancelled: null, teacher: null, courseShort: 'Maths' };
    const timetable = {
      periods: [{ key: 'p1', label: 'P1', startTime: '08:00', endTime: '09:00', isBreak: false }],
      lessons: [
        { ...base, id: 'a', date: '2026-09-14', periodKey: 'p1', startTime: '08:00' },
        { ...base, id: 'b', date: '2026-09-15', periodKey: null, startTime: '08:00' },
      ],
    } as unknown as ChildTimetable;
    const index = lessonIndex(timetable);
    expect(index.get('2026-09-14|p1')?.id).toBe('a');
    expect(index.get('2026-09-15|p1')?.id).toBe('b');
  });
});
