import type { TimetableDay } from '../../services/parent.services';
import { formatTimeRange } from './parentUtils';

/**
 * The week as one card per day, for a phone or a parent who prefers a list.
 *
 * @param props - Component props.
 * @param props.grouped - The days, each with its classes.
 * @returns The list.
 */
export default function TimetableListView({ grouped = [] }: { grouped?: TimetableDay[] }) {
  return (
    <div className="space-y-4">
      {grouped.map((day) => (
        <section
          key={day.day}
          className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-extrabold text-[#101828] dark:text-slate-100">{day.day}</h2>
            <p className="text-sm font-semibold text-[#667085] dark:text-slate-400">{day.date}</p>
          </div>
          <div className="mt-4 divide-y divide-[#EEF2F7] dark:divide-slate-800">
            {(day.classes || []).length ? (
              day.classes.map((slot, index) => (
                <div key={`${slot.startTime}-${index}`} className="grid gap-2 py-3 sm:grid-cols-[150px_1fr_1fr_120px]">
                  <p className="text-sm font-extrabold text-[#0A4EA3] dark:text-blue-300">{formatTimeRange(slot)}</p>
                  <p className="font-extrabold text-[#101828] dark:text-slate-100">{slot.subjectName || slot.title}</p>
                  <p className="text-sm text-[#667085] dark:text-slate-400">{slot.teacherName}</p>
                  <p className="text-sm font-semibold text-[#667085] dark:text-slate-400">{slot.room}</p>
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-[#667085] dark:text-slate-400">No classes scheduled.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
