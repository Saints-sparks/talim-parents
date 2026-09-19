import { STATUS_META, TALLY_KEYS } from './attendanceStatus';

/**
 * The colour key under the calendar.
 *
 * @returns The legend.
 */
export default function AttendanceLegend() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-[#667085] dark:text-slate-400">
      {TALLY_KEYS.map((status) => (
        <span key={status} className="inline-flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${STATUS_META[status].dot}`} aria-hidden="true" />
          {STATUS_META[status].label}
        </span>
      ))}
    </div>
  );
}
