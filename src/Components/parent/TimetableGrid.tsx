import { Coffee } from 'lucide-react';
import type { TimetableSlot } from '../../services/parent.services';
import { formatTimeRange } from './parentUtils';

/** Tile colours, cycled by position so neighbouring cells are told apart. */
const TONES = [
  'bg-[#EAF2FF] text-[#0A4EA3] dark:bg-blue-950/50 dark:text-blue-200',
  'bg-[#EAF7EF] text-[#168044] dark:bg-emerald-950/50 dark:text-emerald-200',
  'bg-[#F3EAFE] text-[#6D28D9] dark:bg-purple-950/50 dark:text-purple-200',
  'bg-[#FFF5E6] text-[#A85C00] dark:bg-amber-950/50 dark:text-amber-200',
  'bg-[#FFF0F4] text-[#BE2454] dark:bg-rose-950/50 dark:text-rose-200',
  'bg-[#E9FAFB] text-[#0F766E] dark:bg-teal-950/50 dark:text-teal-200',
];

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** One row of the time column. */
interface TimeRow {
  startTime: string;
  endTime: string;
}

/**
 * The week as a time-by-day grid, with the school-wide break drawn across the
 * row it falls in. Scrolls sideways inside its own card on a phone.
 *
 * @param props - Component props.
 * @param props.slots - Every slot for the week, including the break.
 * @param props.weekDays - The days to draw as columns.
 * @returns The grid, or nothing when there are no slots.
 */
export default function TimetableGrid({
  slots = [],
  weekDays = DEFAULT_DAYS,
}: {
  slots?: TimetableSlot[];
  weekDays?: string[];
}) {
  const classSlots = slots.filter((slot) => slot.type !== 'break');
  const breakSlot = slots.find((slot) => slot.type === 'break');
  const rows: TimeRow[] = [...new Set(classSlots.map((slot) => `${slot.startTime}-${slot.endTime}`))]
    .sort()
    .map((key) => {
      const [startTime, endTime] = key.split('-');
      return { startTime, endTime };
    });

  if (!classSlots.length && !breakSlot) return null;

  const columns = { gridTemplateColumns: `110px repeat(${weekDays.length}, minmax(130px, 1fr))` };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E5EAF2] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="min-w-[920px]">
        <div
          style={columns}
          className="grid border-b border-[#E5EAF2] bg-[#FBFCFE] dark:border-slate-800 dark:bg-slate-800/60"
        >
          <div className="p-4 text-sm font-extrabold text-[#344054] dark:text-slate-200">Time</div>
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-center text-sm font-extrabold text-[#344054] dark:text-slate-200">
              {day.slice(0, 3)}
            </div>
          ))}
        </div>
        {rows.map((time, rowIndex) => {
          const showBreak = breakSlot && time.startTime >= breakSlot.startTime && time.startTime < breakSlot.endTime;
          return (
            <div
              key={`${time.startTime}-${time.endTime}`}
              style={columns}
              className="grid border-b border-[#EEF2F7] last:border-b-0 dark:border-slate-800"
            >
              <div className="flex items-center justify-center border-r border-[#EEF2F7] p-3 text-center text-sm font-bold text-[#344054] dark:border-slate-800 dark:text-slate-200">
                {time.startTime}
                <br />-<br />
                {time.endTime}
              </div>
              {showBreak ? (
                <div
                  style={{ gridColumn: `span ${weekDays.length}` }}
                  className="m-3 flex items-center justify-center gap-2 rounded-xl bg-[#F4F6F8] p-4 text-sm font-extrabold text-[#667085] dark:bg-slate-800 dark:text-slate-300"
                >
                  <Coffee className="h-5 w-5" aria-hidden="true" /> {breakSlot.title || 'Break Time'}
                </div>
              ) : (
                weekDays.map((day, dayIndex) => {
                  const slot = classSlots.find(
                    (item) => item.day === day && item.startTime === time.startTime && item.endTime === time.endTime,
                  );
                  return (
                    <div
                      key={`${day}-${time.startTime}`}
                      className="min-h-[96px] border-r border-[#EEF2F7] p-2 last:border-r-0 dark:border-slate-800"
                    >
                      {slot ? (
                        <div
                          className={`flex h-full min-h-[76px] flex-col justify-center rounded-xl p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${TONES[(dayIndex + rowIndex) % TONES.length]}`}
                        >
                          <p className="text-sm font-extrabold">{slot.subjectName}</p>
                          <p className="mt-1 text-xs font-semibold opacity-85">{slot.teacherName}</p>
                          <p className="mt-1 text-xs opacity-80">{slot.room}</p>
                          <p className="mt-1 text-[11px] opacity-75">{formatTimeRange(slot)}</p>
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[76px] items-center justify-center text-[#98A2B3] dark:text-slate-600">
                          -
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
