import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDays, formatWeekLabel, startOfWeek } from '../timetableDates';
import { toDateKey } from '../../attendance/attendanceDates';

describe('startOfWeek', () => {
  it('is the Monday, at local midnight', () => {
    const wednesday = new Date(2026, 8, 16, 15, 30); // Wed 16 Sep 2026
    const monday = startOfWeek(wednesday);
    expect(toDateKey(monday)).toBe('2026-09-14');
    expect(monday.getHours()).toBe(0);
  });

  it('treats Sunday as the end of the week, not the start', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 8, 20)))).toBe('2026-09-14');
  });
});

describe('addDays', () => {
  it('steps by a week in either direction without mutating', () => {
    const start = new Date(2026, 8, 14);
    expect(toDateKey(addDays(start, 7))).toBe('2026-09-21');
    expect(toDateKey(addDays(start, -7))).toBe('2026-09-07');
    expect(toDateKey(start)).toBe('2026-09-14');
  });
});

describe('formatWeekLabel', () => {
  it('spans the seven days and names the year the week ends in', () => {
    expect(formatWeekLabel(new Date(2026, 11, 28))).toBe('Dec 28 - Jan 3, 2027');
  });
});

describe('the week sent to the API', () => {
  const original = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'Africa/Lagos'; // UTC+1: Monday 00:00 is still Sunday in UTC
  });
  afterAll(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it('is the local Monday, where toISOString() would have said Sunday', () => {
    const monday = startOfWeek(new Date(2026, 8, 16));
    expect(monday.toISOString().slice(0, 10)).toBe('2026-09-13'); // the old bug
    expect(toDateKey(monday)).toBe('2026-09-14');
  });
});
