import type { AttendanceCalendarDay } from '../../services/attendance.services';

/** Month names, January first. */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** The earliest and latest year the monthly attendance route accepts. */
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

/**
 * Zero-pads a number to two digits.
 *
 * @param value - The number.
 * @returns The padded string.
 */
export const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Formats a date as `YYYY-MM-DD`, in local time — the key the API's
 * `calendarDays` are indexed by.
 *
 * @param date - The date.
 * @returns The date key.
 */
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Reads a `YYYY-MM-DD` key as a local date at midnight.
 *
 * @param key - The date key.
 * @returns The date.
 */
export const fromDateKey = (key: string): Date => new Date(`${key}T00:00:00`);

/**
 * Formats a date as a long, readable date.
 *
 * @param date - The date.
 * @returns e.g. "Monday, March 3, 2026".
 */
export const formatReadableDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);

/** A month and year, 1-based month. */
export interface MonthYear {
  month: number;
  year: number;
}

/**
 * The month `direction` months away, rolling the year over.
 *
 * @param current - The month shown now.
 * @param direction - `-1` for the previous month, `1` for the next.
 * @returns The neighbouring month.
 */
export function shiftMonth(current: MonthYear, direction: 1 | -1): MonthYear {
  const next = new Date(current.year, current.month - 1 + direction, 1);
  return { month: next.getMonth() + 1, year: next.getFullYear() };
}

/**
 * The day `direction` days from a date key.
 *
 * @param key - The date key.
 * @param direction - `-1` for the previous day, `1` for the next.
 * @returns The neighbouring day's key.
 */
export function shiftDay(key: string, direction: 1 | -1): string {
  const next = fromDateKey(key);
  next.setDate(next.getDate() + direction);
  return toDateKey(next);
}

/** One cell of the calendar grid. */
export interface CalendarCell {
  date: Date;
  dateKey: string;
  outsideMonth: boolean;
  record?: AttendanceCalendarDay;
}

/**
 * Builds a Monday-first calendar grid for a month, mapping each day onto its
 * attendance record.
 *
 * @param year - Four-digit year.
 * @param month - 1–12.
 * @param records - The month's calendar days from the API.
 * @returns One cell per grid square, padded to full weeks.
 */
export function buildCalendarDays(year: number, month: number, records: AttendanceCalendarDay[] = []): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingDays = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const cells: CalendarCell[] = [];

  for (let i = leadingDays; i > 0; i -= 1) {
    const date = new Date(year, month - 1, 1 - i);
    cells.push({ date, dateKey: toDateKey(date), outsideMonth: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const dateKey = toDateKey(date);
    cells.push({ date, dateKey, outsideMonth: false, record: recordMap.get(dateKey) });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const date = new Date(last);
    date.setDate(last.getDate() + 1);
    cells.push({ date, dateKey: toDateKey(date), outsideMonth: true });
  }

  return cells;
}

/**
 * The record for one day, or the "nothing posted" placeholder the API itself
 * returns for a day without one — so the detail panel needs no request of its
 * own when the parent clicks a different day.
 *
 * @param calendarDays - The month's records.
 * @param dateKey - The day to describe.
 * @returns That day's record, or a `noRecord` placeholder.
 */
export function resolveSelectedDay(calendarDays: AttendanceCalendarDay[], dateKey: string): AttendanceCalendarDay {
  const found = calendarDays.find((record) => record.date === dateKey);
  if (found) return found;
  return {
    date: dateKey,
    day: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(fromDateKey(dateKey)),
    status: 'noRecord',
    statusLabel: 'No Record',
    time: null,
    notes: 'No attendance record has been posted for this day.',
  };
}

/**
 * Parses a year typed into the year box.
 *
 * @param text - What the parent typed.
 * @returns The year when it is a four-digit year the API accepts, else `null`.
 */
export function parseYear(text: string): number | null {
  if (!/^\d{4}$/.test(text.trim())) return null;
  const year = Number(text);
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
}
