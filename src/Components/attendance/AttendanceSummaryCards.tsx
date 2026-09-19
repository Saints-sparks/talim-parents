import { STATUS_META, TALLY_KEYS } from './attendanceStatus';
import type { MonthlyAttendance } from '../../services/attendance.services';

const TITLES = { present: 'Present', absent: 'Absent', late: 'Late', noClass: 'No Class' } as const;

/**
 * The four headline tallies for the month: present, absent, late, no class.
 *
 * @param props - Component props.
 * @param props.summary - The month's summary from the API.
 * @returns The card row.
 */
export default function AttendanceSummaryCards({ summary }: { summary: MonthlyAttendance['summary'] | undefined }) {
  return (
    <section data-guide="attendance-summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TALLY_KEYS.map((key) => {
        const meta = STATUS_META[key];
        const Icon = meta.icon;
        const tally = summary?.[key] ?? { count: 0, percentage: 0 };
        return (
          <div
            key={key}
            className="rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.soft} ${meta.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#344054] dark:text-slate-300">{TITLES[key]}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <span className="text-3xl font-bold text-[#101828] dark:text-slate-100">{tally.count}</span>
              <span className={`text-sm font-bold ${meta.color}`}>
                {tally.percentage ? `${tally.percentage}%` : '-'}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
