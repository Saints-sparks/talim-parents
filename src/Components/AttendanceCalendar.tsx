import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonthlyAttendance } from '../hooks/useAttendance';
import { useActiveChild } from '../hooks/useActiveChild';
import { childFullName } from '../types/parent';
import { MONTHS, shiftMonth, toDateKey, type MonthYear } from './attendance/attendanceDates';
import { ErrorState, LoadingState } from './StateComponents';
import type { AttendanceCalendarDay } from '../services/attendance.services';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** One school day in the compact calendar. */
interface WeekdayCell {
  day: number;
  dateKey: string;
  status?: string;
  isToday: boolean;
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
): Array<Array<WeekdayCell | null>> {
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(new Date());

  const weeks: Array<Array<WeekdayCell | null>> = [];
  let week: Array<WeekdayCell | null> = [];

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
  const { status, child, childId, error: childrenError, retry } = useActiveChild();
  const [cursor, setCursor] = useState<MonthYear>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const { data, isPending, isError, error, refetch } = useMonthlyAttendance(childId, cursor.month, cursor.year);

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
    setCursor((current) => shiftMonth(current, direction));
  };

  if (status === 'loading') return <LoadingState count={1} className="h-80" label="Loading attendance" />;
  if (status === 'error') {
    return <ErrorState error={null} onRetry={retry} title="Couldn't load your children" fallback={childrenError ?? undefined} />;
  }
  if (!child) {
    return <div className="p-4 text-sm text-gray-500 dark:text-slate-400">Select a child to see their attendance.</div>;
  }

  if (isPending) return <LoadingState count={1} className="h-80" label="Loading attendance" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load attendance" />;

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
      <div className="border-b p-4 dark:border-slate-800">
        <div className="mb-1 text-sm font-medium text-gray-700 dark:text-slate-300">
          Viewing attendance for: <span className="font-bold">{childFullName(child)}</span>
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
            {MONTHS[cursor.month - 1]} {cursor.year}
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
