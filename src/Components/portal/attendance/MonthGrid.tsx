import { useMemo } from 'react';
import { dayParts, weekdayOf } from '../../../lib/format';
import type { AttendanceDayStatus } from '../../../types/portal/learner';

/** How each register mark looks and reads. */
export const DAY_LOOK: Record<AttendanceDayStatus, { label: string; cell: string; text: string }> = {
  present: { label: 'Present', cell: 'bg-tl-success-bg', text: 'text-tl-success' },
  late: { label: 'Late', cell: 'bg-tl-warning-bg', text: 'text-tl-warning' },
  absent: { label: 'Absent', cell: 'bg-tl-danger-bg', text: 'text-tl-danger' },
  on_leave: { label: 'On leave', cell: 'bg-tl-accent-bg', text: 'text-tl-accent' },
  unmarked: { label: '', cell: 'bg-tl-track', text: 'text-tl-faint' },
  holiday: { label: 'Holiday', cell: 'bg-tl-subtle', text: 'text-tl-muted' },
  weekend: { label: '', cell: '', text: '' },
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** One cell of the month: a school day, or a blank before the 1st. */
export interface MonthCell {
  date: string | null;
  status: AttendanceDayStatus;
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

/**
 * The month calendar: Monday to Friday, each school day showing its date and
 * its mark, today outlined. A table, so each date is read with its weekday.
 *
 * @param props - The month's days, its title and today.
 * @param props.days - The days from B6.
 * @param props.title - "September 2026".
 * @param props.today - Today as `YYYY-MM-DD`.
 * @returns The table.
 */
export function MonthGrid({ days, title, today }: { days: { date: string; status: AttendanceDayStatus }[]; title: string; today: string }) {
  const weeks = useMemo(() => monthWeeks(days), [days]);
  return (
    <table className="mt-[18px] w-full table-fixed border-separate border-spacing-2">
      <caption className="sr-only">Register marks, {title}</caption>
      <thead>
        <tr>
          {WEEKDAYS.map((day) => (
            <th key={day} scope="col" className="pb-1 text-center text-[11px] font-extrabold uppercase tracking-[0.07em] text-tl-faint">
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, index) => (
          <tr key={index}>
            {week.map((cell, column) => {
              if (!cell.date) return <td key={`blank-${column}`} className="rounded-[13px] bg-tl-subtle/60" aria-hidden="true" />;
              const look = DAY_LOOK[cell.status];
              const dayNumber = Number(cell.date.slice(8, 10));
              const isToday = cell.date === today;
              const spoken = `${weekdayOf(cell.date)} ${dayNumber}: ${look.label || 'not yet marked'}${cell.status === 'on_leave' ? ' (approved leave, not counted as absence)' : ''}`;
              return (
                <td
                  key={cell.date}
                  title={spoken}
                  className={`h-[74px] rounded-[13px] p-2.5 align-top ${look.cell} ${isToday ? 'shadow-[inset_0_0_0_2px_rgb(var(--tl-brand))]' : ''}`}
                >
                  <span className="sr-only">{spoken}{isToday ? ', today' : ''}</span>
                  <span aria-hidden="true" className="flex h-full flex-col justify-between">
                    <span className={`text-[15px] font-extrabold ${look.text || 'text-tl-faint'}`}>{dayNumber}</span>
                    <span className={`text-[11px] font-extrabold uppercase tracking-[0.04em] ${look.text}`}>{look.label}</span>
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
