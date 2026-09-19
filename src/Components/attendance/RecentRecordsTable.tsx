import { Eye } from 'lucide-react';
import { metaFor } from './attendanceStatus';
import type { AttendanceCalendarDay } from '../../services/attendance.services';

/**
 * The child's most recent attendance records (the API's latest eight, whatever
 * the month on screen), each with a shortcut to open that day.
 *
 * @param props - Component props.
 * @param props.records - The recent records.
 * @param props.onSelect - Opens a day's detail.
 * @returns The card.
 */
export default function RecentRecordsTable({
  records,
  onSelect,
}: {
  records: AttendanceCalendarDay[];
  onSelect: (dateKey: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-bold text-[#101828] dark:text-slate-100">Recent attendance records</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Recent attendance records</caption>
          <thead>
            <tr className="border-b border-[#EEF2F6] text-xs uppercase tracking-wide text-[#667085] dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="px-3 py-3">Date</th>
              <th scope="col" className="px-3 py-3">Day</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3">Time</th>
              <th scope="col" className="px-3 py-3">Notes/reason</th>
              <th scope="col" className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F6] dark:divide-slate-800">
            {records.map((record) => (
              <tr key={record.id ?? record.date} className="transition hover:bg-[#F8FBFF] dark:hover:bg-slate-800/40">
                <td className="whitespace-nowrap px-3 py-4 font-semibold text-[#344054] dark:text-slate-300">{record.date}</td>
                <td className="whitespace-nowrap px-3 py-4 text-[#667085] dark:text-slate-400">{record.day}</td>
                <td className="px-3 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${metaFor(record.status).badge}`}>
                    {record.statusLabel}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-[#667085] dark:text-slate-400">{record.time ?? '-'}</td>
                <td className="min-w-[220px] px-3 py-4 text-[#667085] dark:text-slate-400">{record.notes || '-'}</td>
                <td className="px-3 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(record.date)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#003366] hover:bg-[#F0F7FF] dark:text-blue-300 dark:hover:bg-slate-800"
                    aria-label={`View attendance for ${record.date}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="p-8 text-center text-sm text-[#667085] dark:text-slate-400">
            Attendance records will appear here once the school posts them.
          </div>
        )}
      </div>
    </section>
  );
}
