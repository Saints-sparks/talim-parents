import { describe, expect, it } from 'vitest';
import {
  buildCalendarDays,
  parseYear,
  resolveSelectedDay,
  shiftDay,
  shiftMonth,
  toDateKey,
} from '../attendanceDates';
import { buildAttendanceCsv } from '../attendanceCsv';
import { metaFor } from '../attendanceStatus';
import type { AttendanceCalendarDay } from '../../../services/attendance.services';

/** A calendar day, overridable per test. */
function day(overrides: Partial<AttendanceCalendarDay> = {}): AttendanceCalendarDay {
  return {
    id: 'r1',
    date: '2026-03-04',
    day: 'Wednesday',
    status: 'present',
    statusLabel: 'Present',
    time: '8:01 AM',
    notes: 'All classes attended',
    ...overrides,
  };
}

describe('toDateKey', () => {
  it('formats in local time with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('shiftMonth', () => {
  it('rolls the year over in both directions', () => {
    expect(shiftMonth({ month: 12, year: 2026 }, 1)).toEqual({ month: 1, year: 2027 });
    expect(shiftMonth({ month: 1, year: 2026 }, -1)).toEqual({ month: 12, year: 2025 });
    expect(shiftMonth({ month: 6, year: 2026 }, 1)).toEqual({ month: 7, year: 2026 });
  });
});

describe('shiftDay', () => {
  it('crosses month and year boundaries', () => {
    expect(shiftDay('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('buildCalendarDays', () => {
  it('is Monday-first and padded to whole weeks', () => {
    // March 2026 starts on a Sunday: six leading days, 31 days, then padding to 42.
    const cells = buildCalendarDays(2026, 3, []);
    expect(cells).toHaveLength(42);
    expect(cells[0].outsideMonth).toBe(true);
    expect(cells[6].dateKey).toBe('2026-03-01');
    expect(cells[6].outsideMonth).toBe(false);
    expect(cells.filter((cell) => !cell.outsideMonth)).toHaveLength(31);
  });

  it('attaches records to their day, and only inside the month', () => {
    const cells = buildCalendarDays(2026, 3, [day({ date: '2026-03-04' }), day({ id: 'r2', date: '2026-02-27' })]);
    expect(cells.find((cell) => cell.dateKey === '2026-03-04')?.record?.id).toBe('r1');
    expect(cells.find((cell) => cell.dateKey === '2026-02-27')?.record).toBeUndefined();
  });
});

describe('resolveSelectedDay', () => {
  it('returns the day from the month when it has a record', () => {
    expect(resolveSelectedDay([day()], '2026-03-04').statusLabel).toBe('Present');
  });

  it('answers a day without a record the way the API does', () => {
    const placeholder = resolveSelectedDay([day()], '2026-03-05');
    expect(placeholder.status).toBe('noRecord');
    expect(placeholder.statusLabel).toBe('No Record');
    expect(placeholder.day).toBe('Thursday');
    expect(placeholder.notes).toMatch(/no attendance record/i);
  });
});

describe('parseYear', () => {
  it('accepts only a complete year the API allows', () => {
    expect(parseYear('2026')).toBe(2026);
    expect(parseYear('2')).toBeNull();
    expect(parseYear('202')).toBeNull();
    expect(parseYear('1999')).toBeNull();
    expect(parseYear('2101')).toBeNull();
    expect(parseYear('20a6')).toBeNull();
    expect(parseYear('')).toBeNull();
  });
});

describe('metaFor', () => {
  it('falls back to "No Record" for a status the API adds later', () => {
    expect(metaFor('excused-ish').label).toBe('No Record');
    expect(metaFor(undefined).label).toBe('No Record');
    expect(metaFor('late').label).toBe('Late');
  });
});

describe('buildAttendanceCsv', () => {
  it('writes the month as quoted rows', () => {
    const csv = buildAttendanceCsv([day()]).split('\n');
    expect(csv[0]).toBe('"Date","Day","Status","Time","Notes"');
    expect(csv[1]).toBe('"2026-03-04","Wednesday","Present","8:01 AM","All classes attended"');
  });

  it('defuses a formula typed into the notes', () => {
    const csv = buildAttendanceCsv([day({ notes: '=cmd|" /C calc"!A0' })]);
    expect(csv).toContain(`"'=cmd|"" /C calc""!A0"`);
  });

  it('shows a dash where there is no time or note', () => {
    const csv = buildAttendanceCsv([day({ time: null, notes: '' })]);
    expect(csv).toContain('"Present","-","-"');
  });
});
