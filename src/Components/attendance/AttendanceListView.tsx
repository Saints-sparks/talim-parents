import { metaFor } from './attendanceStatus';
import type { AttendanceCalendarDay } from '../../services/attendance.services';

/**
 * The month as a list of days with a status badge each.
 *
 * @param props - Component props.
 * @param props.days - The month's records.
 * @param props.periodLabel - The month, for the empty message.
 * @param props.onSelect - Opens a day's detail.
 * @returns The list.
 */
export default function AttendanceListView({
  days,
  periodLabel,
  onSelect,
}: {
  days: AttendanceCalendarDay[];
  periodLabel: string;
  onSelect: (dateKey: string) => void;
}) {
  return (
    <div className="divide-y divide-[#EEF2F6] rounded-2xl border border-[#E6ECF3] dark:divide-slate-800 dark:border-slate-800">
      {days.length > 0 ? (
        days.map((record) => (
          <button
            key={record.id ?? record.date}
            type="button"
            onClick={() => onSelect(record.date)}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[#F4F8FF] dark:hover:bg-slate-800/60"
          >
            <span>
              <span className="block text-sm font-bold text-[#101828] dark:text-slate-100">{record.date}</span>
              <span className="text-xs text-[#667085] dark:text-slate-400">{record.day}</span>
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${metaFor(record.status).badge}`}>
              {record.statusLabel}
            </span>
          </button>
        ))
      ) : (
        <div className="p-8 text-center text-sm text-[#667085] dark:text-slate-400">
          No attendance records posted for {periodLabel}.
        </div>
      )}
    </div>
  );
}
