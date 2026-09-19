import { ChevronLeft, ChevronRight } from 'lucide-react';

/** The two layouts of the timetable. */
export type TimetableView = 'weekly' | 'list';

const ARROW =
  'rounded-xl border border-[#DCE5F2] p-2 text-[#344054] hover:bg-[#F8FAFD] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';

/**
 * Weekly/list toggle and the previous/next week arrows.
 *
 * @param props - Component props.
 * @param props.view - The layout shown.
 * @param props.onViewChange - Switches layout.
 * @param props.weekLabel - "Sep 14 - Sep 20, 2026".
 * @param props.onMoveWeek - Steps a week back or forward.
 * @returns The control bar.
 */
export default function TimetableControls({
  view,
  onViewChange,
  weekLabel,
  onMoveWeek,
}: {
  view: TimetableView;
  onViewChange: (view: TimetableView) => void;
  weekLabel: string;
  onMoveWeek: (direction: 1 | -1) => void;
}) {
  return (
    <div
      data-guide="timetable-controls"
      className="rounded-2xl border border-[#E5EAF2] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex self-start rounded-xl bg-[#F4F7FB] p-1 dark:bg-slate-800">
          {(['weekly', 'list'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onViewChange(item)}
              aria-pressed={view === item}
              className={`rounded-lg px-4 py-2 text-sm font-extrabold ${
                view === item
                  ? 'bg-white text-[#0A4EA3] shadow-sm dark:bg-slate-900 dark:text-blue-300'
                  : 'text-[#667085] dark:text-slate-400'
              }`}
            >
              {item === 'weekly' ? 'Weekly View' : 'List View'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onMoveWeek(-1)} className={ARROW} aria-label="Previous week">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="rounded-xl border border-[#DCE5F2] px-4 py-2 text-sm font-extrabold text-[#344054] dark:border-slate-700 dark:text-slate-200">
            {weekLabel}
          </div>
          <button type="button" onClick={() => onMoveWeek(1)} className={ARROW} aria-label="Next week">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
