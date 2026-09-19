import { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MAX_YEAR, MIN_YEAR, MONTHS, parseYear } from './attendanceDates';
import type { AttendanceViewMode } from '../../hooks/useAttendanceMonth';

const NAV_BUTTON =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-[#D7E0EA] text-[#344054] hover:bg-[#F4F8FF] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';
const FIELD =
  'h-10 rounded-xl border border-[#D7E0EA] bg-white text-sm font-bold text-[#101828] outline-none hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

/**
 * The year box. Holds what the parent is typing and only commits a complete,
 * valid year — typing "2026" would otherwise fire requests for year 2, 20 and
 * 202, each of which the API rejects.
 *
 * @param props - Component props.
 * @param props.year - The year currently shown.
 * @param props.onCommit - Called with a complete, valid year.
 * @returns The input.
 */
function YearField({ year, onCommit }: { year: number; onCommit: (year: number) => void }) {
  const [text, setText] = useState(String(year));

  // Follow the arrows: stepping past December must update the box.
  useEffect(() => {
    setText(String(year));
  }, [year]);

  return (
    <label className="relative">
      <span className="sr-only">Year</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={text}
        aria-invalid={parseYear(text) === null}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '');
          setText(next);
          const parsed = parseYear(next);
          if (parsed !== null && parsed !== year) onCommit(parsed);
        }}
        onBlur={() => setText(String(year))}
        className={`${FIELD} w-24 px-3`}
        title={`${MIN_YEAR}–${MAX_YEAR}`}
      />
    </label>
  );
}

/** Props for {@link AttendanceControls}. */
interface AttendanceControlsProps {
  viewMode: AttendanceViewMode;
  onViewModeChange: (mode: AttendanceViewMode) => void;
  month: number;
  year: number;
  onMoveMonth: (direction: 1 | -1) => void;
  onGoToMonth: (month: number, year: number) => void;
}

/**
 * Calendar/list toggle and the month navigation (arrows, month picker, year).
 *
 * @param props - Component props.
 * @returns The control bar.
 */
export default function AttendanceControls({
  viewMode,
  onViewModeChange,
  month,
  year,
  onMoveMonth,
  onGoToMonth,
}: AttendanceControlsProps) {
  return (
    <div
      data-guide="attendance-controls"
      className="flex flex-col gap-4 border-b border-[#EEF2F6] pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800"
    >
      <div className="inline-flex self-start rounded-xl bg-[#F4F7FB] p-1 dark:bg-slate-800">
        {(['calendar', 'list'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            aria-pressed={viewMode === mode}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              viewMode === mode
                ? 'bg-white text-[#003366] shadow-sm dark:bg-slate-900 dark:text-blue-300'
                : 'text-[#667085] hover:text-[#003366] dark:text-slate-400 dark:hover:text-blue-300'
            }`}
          >
            {mode === 'calendar' ? 'Calendar view' : 'List view'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onMoveMonth(-1)} className={NAV_BUTTON} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <label className="relative">
          <span className="sr-only">Month</span>
          <select
            value={month}
            onChange={(event) => onGoToMonth(Number(event.target.value), year)}
            className={`${FIELD} appearance-none px-4 pr-9`}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#667085] dark:text-slate-400"
            aria-hidden="true"
          />
        </label>
        <YearField year={year} onCommit={(next) => onGoToMonth(month, next)} />
        <button type="button" onClick={() => onMoveMonth(1)} className={NAV_BUTTON} aria-label="Next month">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
