import { metaFor } from './attendanceStatus';
import type { CalendarCell } from './attendanceDates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Props for {@link AttendanceCalendarGrid}. */
interface AttendanceCalendarGridProps {
  cells: CalendarCell[];
  selectedDate: string;
  todayKey: string;
  onSelect: (dateKey: string) => void;
}

/**
 * The Monday-first month grid; each day is a button that opens its detail.
 *
 * @param props - Component props.
 * @returns The grid.
 */
export default function AttendanceCalendarGrid({ cells, selectedDate, todayKey, onSelect }: AttendanceCalendarGridProps) {
  return (
    <>
      <div className="grid grid-cols-7 border-l border-t border-[#E6ECF3] text-center text-xs font-bold text-[#667085] dark:border-slate-800 dark:text-slate-400">
        {WEEKDAYS.map((day) => (
          <div key={day} className="border-b border-r border-[#E6ECF3] py-3 dark:border-slate-800">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-[#E6ECF3] dark:border-slate-800">
        {cells.map(({ date, dateKey, outsideMonth, record }) => {
          const meta = record ? metaFor(record.status) : null;
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === todayKey;
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelect(dateKey)}
              aria-current={isSelected ? 'date' : undefined}
              aria-label={record && !outsideMonth ? `${dateKey}: ${record.statusLabel}` : dateKey}
              className={`min-h-[64px] border-b border-r border-[#E6ECF3] p-1.5 text-left transition hover:bg-[#F4F8FF] sm:min-h-[106px] sm:p-2 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
                isSelected
                  ? 'bg-[#F0F7FF] ring-2 ring-inset ring-[#8FC5FF] dark:bg-blue-950/40 dark:ring-blue-500/50'
                  : 'bg-white dark:bg-slate-900'
              } ${outsideMonth ? 'text-[#98A2B3] dark:text-slate-600' : 'text-[#101828] dark:text-slate-100'}`}
            >
              <span
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg text-sm font-bold ${
                  isToday
                    ? 'bg-[#003366] text-white dark:bg-blue-600'
                    : isSelected
                      ? 'bg-white text-[#003366] dark:bg-slate-800 dark:text-blue-300'
                      : ''
                }`}
              >
                {date.getDate()}
              </span>
              {meta && !outsideMonth && (
                <span className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#475467] sm:mt-3 dark:text-slate-400">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                  <span className="hidden sm:inline">{meta.label}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
