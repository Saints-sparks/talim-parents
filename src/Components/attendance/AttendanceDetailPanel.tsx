import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { formatReadableDate, fromDateKey } from './attendanceDates';
import { STATUS_META, TALLY_KEYS, metaFor } from './attendanceStatus';
import type { AttendanceCalendarDay, MonthlyAttendance } from '../../services/attendance.services';

const STEP_BUTTON =
  'h-8 w-8 rounded-lg border border-[#E6ECF3] hover:bg-[#F4F8FF] dark:border-slate-700 dark:hover:bg-slate-800';

/** Props for {@link AttendanceDetailPanel}. */
interface AttendanceDetailPanelProps {
  selectedDate: string;
  selectedDay: AttendanceCalendarDay;
  summary: MonthlyAttendance['summary'] | undefined;
  periodLabel: string;
  onMoveDay: (direction: 1 | -1) => void;
  onDownload: () => void;
}

/**
 * The right-hand panel: the open day's status and notes, the month's overview,
 * the attendance-rate bar and the report download.
 *
 * @param props - Component props.
 * @returns The panel.
 */
export default function AttendanceDetailPanel({
  selectedDate,
  selectedDay,
  summary,
  periodLabel,
  onMoveDay,
  onDownload,
}: AttendanceDetailPanelProps) {
  const dayMeta = metaFor(selectedDay.status);
  const DayIcon = dayMeta.icon;
  const rate = summary?.attendanceRate ?? 0;

  return (
    <aside data-guide="attendance-detail" className="xl:sticky xl:top-24 xl:self-start">
      <div className="rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#101828] dark:text-slate-100">
            {formatReadableDate(fromDateKey(selectedDate))}
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => onMoveDay(-1)} className={STEP_BUTTON} aria-label="Previous day">
              <ChevronLeft className="mx-auto h-4 w-4 dark:text-slate-300" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onMoveDay(1)} className={STEP_BUTTON} aria-label="Next day">
              <ChevronRight className="mx-auto h-4 w-4 dark:text-slate-300" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={`mt-5 rounded-2xl border p-4 ${dayMeta.soft} ${dayMeta.border}`}>
          <div className={`flex items-center gap-3 ${dayMeta.color}`}>
            <DayIcon className="h-6 w-6" />
            <span className="font-bold">{selectedDay.statusLabel || dayMeta.label}</span>
          </div>
          <p className="mt-2 text-sm text-[#475467] dark:text-slate-400">
            {selectedDay.notes || 'No attendance detail is available for this day.'}
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold text-[#101828] dark:text-slate-100">Attendance overview</h3>
          <div className="mt-4 space-y-3">
            {TALLY_KEYS.map((status) => {
              const meta = STATUS_META[status];
              const tally = summary?.[status] ?? { count: 0, percentage: 0 };
              return (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-[#475467] dark:text-slate-400">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                    {meta.label}
                  </span>
                  <span className={`font-bold ${meta.color}`}>
                    {tally.count} ({tally.percentage || 0}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-[#EEF2F6] pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between text-sm">
            <h3 className="font-bold text-[#101828] dark:text-slate-100">Monthly trend</h3>
            <span className="text-xs font-bold text-[#003366] dark:text-blue-300">{periodLabel}</span>
          </div>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EEF2F6] dark:bg-slate-800"
            role="progressbar"
            aria-label="Attendance rate"
            aria-valuenow={rate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-[#667085] dark:text-slate-400">
            <span>
              {summary?.present?.count ?? 0} of {summary?.totalSchoolDays ?? 0} school days
            </span>
            <span>{rate}%</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onDownload}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D7E0EA] bg-white text-sm font-bold text-[#003366] hover:bg-[#F4F8FF] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          Download detailed report
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mt-4 rounded-xl bg-[#F0F7FF] p-4 text-xs leading-5 text-[#475467] dark:bg-blue-950/30 dark:text-slate-400">
          <Info className="mb-2 h-4 w-4 text-[#003366] dark:text-blue-300" aria-hidden="true" />
          Percentage is calculated from attendance records posted by the school for the selected month.
        </div>
      </div>
    </aside>
  );
}
