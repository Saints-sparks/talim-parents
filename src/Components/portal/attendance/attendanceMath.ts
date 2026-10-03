import { dayParts, monthOf } from '../../../lib/format';
import type { AttendanceDayStatus, ChildAttendance } from '../../../types/portal/learner';

/** Attendance arithmetic for the Attendance screen (pure, so it is tested alone). */

/** One cell of the month: a school day, or a blank before the 1st. */
export interface MonthCell {
  date: string | null;
  status: AttendanceDayStatus;
}

/**
 * The share of the term's school days in each mark, for the stacked bar.
 *
 * @param data - The term's numbers.
 * @returns Percent of school days present, late, on leave and absent.
 */
export function attendanceShares(data: ChildAttendance): { present: number; late: number; leave: number; absent: number } {
  const days = Math.max(1, data.schoolDays);
  const share = (n: number): number => Math.round((n / days) * 1000) / 10;
  return { present: share(data.present), late: share(data.late), leave: share(data.onLeave), absent: share(data.absent) };
}

/**
 * The month to open on: this month when it is inside the term, else the
 * term's last (or first) month.
 *
 * @param today - Today as `YYYY-MM-DD`.
 * @param term - The term's dates, when known.
 * @param term.startDate - The term's first day.
 * @param term.endDate - The term's last day.
 * @returns `YYYY-MM`.
 */
export function startMonth(today: string, term?: { startDate?: string | null; endDate?: string | null } | null): string {
  const month = monthOf(today);
  const first = term?.startDate ? monthOf(term.startDate) : null;
  const last = term?.endDate ? monthOf(term.endDate) : null;
  if (last && month > last) return last;
  if (first && month < first) return first;
  return month;
}

/**
 * Lays a month's school days out in Monday–Friday weeks (weekends dropped),
 * with blanks before the first weekday so each date sits under its weekday.
 *
 * @param days - The month's days from B6.
 * @returns The weeks, five cells each.
 */
export function monthWeeks(days: readonly { date: string; status: AttendanceDayStatus }[]): MonthCell[][] {
  const weeks: MonthCell[][] = [];
  let week: MonthCell[] = [];
  for (const day of days) {
    const parts = dayParts(day.date);
    if (!parts) continue;
    const weekday = new Date(Date.UTC(parts.y, parts.m, parts.d)).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const column = weekday - 1;
    if (week.length === 0 && column > 0) {
      for (let i = 0; i < column; i += 1) week.push({ date: null, status: 'unmarked' });
    }
    week.push({ date: day.date, status: day.status });
    if (column === 4) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 5) week.push({ date: null, status: 'unmarked' });
    weeks.push(week);
  }
  return weeks;
}
