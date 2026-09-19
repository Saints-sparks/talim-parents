import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonthlyAttendance } from '../hooks/useAttendance';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { childFullName, childRecordId } from '../types/parent';
import { ErrorState, LoadingState } from './StateComponents';
import type { AttendanceCalendarDay } from '../services/attendance.services';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Zero-pads a number to two digits.
 *
 * @param value - The number.
 * @returns The padded string.
 */
const pad = (value: number): string => String(value).padStart(2, '0');

/** A month/year pair. */
interface MonthYear {
  month: number;
  year: number;
}

/**
 * Builds the school-week (Mon–Fri) rows for a month, mapping each weekday
 * onto its attendance record.
 *
 * @param year - Four-digit year.
 * @param month - 1–12.
 * @param records - The month's calendar days from the API.
 * @returns One array of weekday cells per week.
 */
function buildWeeks(
  year: number,
  month: number,
  records: AttendanceCalendarDay[],
): Array<Array<{ day: number; dateKey: string; status?: string; isToday: boolean } | null>> {
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(new Date());

  const weeks: Array<Array<{ day: number; dateKey: string; status?: string; isToday: boolean } | null>> = [];
  let week: Array<{ day: number; dateKey: string; status?: string; isToday: boolean } | null> = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue; // Weekends are never school days.

    const dateKey = toDateKey(date);
    week.push({ day, dateKey, status: recordMap.get(dateKey)?.status, isToday: dateKey === todayKey });

    if (weekday === 5 || day === daysInMonth) {
      while (week.length < 5) week.push(null);
      weeks.push(week);
      week = [];
    }
  }

  return weeks;
}

/**
 * Formats a date as `YYYY-MM-DD`, in local time.
 *
 * @param date - The date.
 * @returns The date key.
 */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A compact attendance calendar for the Dashboard — the current selected
 * child's school days for one month, with real per-day status.
 *
 * The previous version accepted `selectedMonth`/`selectedYear` from the
 * Dashboard's own dropdowns but fetched from the summary endpoint regardless,
 * so the controls never actually changed what was shown. This owns its own
 * month state and both its arrows and its data agree on which month is open.
 *
 * @returns The calendar card.
 */
export default function AttendanceCalendar() {
  const { selectedStudent } = useSelectedStudent();
  const [cursor, setCursor] = useState<MonthYear>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const studentId = childRecordId(selectedStudent);
  const { data, isPending, isError, error, refetch } = useMonthlyAttendance(studentId, cursor.month, cursor.year);

  const weeks = useMemo(
    () => buildWeeks(cursor.year, cursor.month, data?.calendarDays ?? []),
    [cursor.year, cursor.month, data?.calendarDays],
  );

  /**
   * Moves the calendar to a neighbouring month.
   *
   * @param direction - `-1` for the previous month, `1` for the next.
   */
  const moveMonth = (direction: 1 | -1): void => {
    setCursor((current) => {
      const next = new Date(current.year, current.month - 1 + direction, 1);
      return { month: next.getMonth() + 1, year: next.getFullYear() };
    });
  };

  if (!selectedStudent) {
    return <div className="p-4 text-sm text-gray-500 dark:text-slate-400">Select a child to see their attendance.</div>;
  }

  if (isPending) return <LoadingState count={1} className="h-80" label="Loading attendance" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load attendance" />;

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
      <div className="border-b p-4 dark:border-slate-800">
        <div className="mb-1 text-sm font-medium text-gray-700 dark:text-slate-300">
          Viewing attendance for: <span className="font-bold">{childFullName(selectedStudent)}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 dark:text-slate-300" aria-hidden="true" />
          </button>
          <h3 className="font-medium text-gray-700 dark:text-slate-200">
            {MONTH_NAMES[cursor.month - 1]} {cursor.year}
          </h3>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 dark:text-slate-300" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-5 gap-0">
          {WEEKDAY_LABELS.map((day) => (
            <div key={day} className="pb-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-0">
          {weeks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
              No attendance records posted for this month yet.
            </p>
          ) : (
            weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-5 gap-0">
                {week.map((cell, cellIndex) =>
                  cell ? (
                    <div key={cell.dateKey} className="relative h-20 border border-gray-200 p-2 dark:border-slate-800">
                      <span className="font-medium dark:text-slate-200">{cell.day}</span>
                      {cell.isToday && (
                        <span className="absolute right-1 top-1 rounded bg-blue-500 px-1 text-xs text-white">
                          Today
                        </span>
                      )}
                      {cell.status && cell.status !== 'noRecord' && (
                        <div
                          className={`mt-1 rounded px-1 text-center text-sm font-medium ${
                            cell.status === 'present'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                              : cell.status === 'late'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                          }`}
                        >
                          {cell.status === 'present' ? 'Present' : cell.status === 'late' ? 'Late' : 'Absent'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={`empty-${weekIndex}-${cellIndex}`} className="h-20 border border-gray-200 dark:border-slate-800" />
                  ),
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
