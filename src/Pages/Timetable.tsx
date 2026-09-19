import { useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import ActiveChildGate from '../Components/parent/ActiveChildGate';
import ClassInformationCard from '../Components/parent/ClassInformationCard';
import { EmptyTimetableState } from '../Components/parent/EmptyStates';
import TimetableGrid from '../Components/parent/TimetableGrid';
import TimetableListView from '../Components/parent/TimetableListView';
import TodayScheduleCard from '../Components/parent/TodayScheduleCard';
import SelectedChildCard from '../Components/timetable/SelectedChildCard';
import TimetableControls, { type TimetableView } from '../Components/timetable/TimetableControls';
import TimetableSkeleton from '../Components/timetable/TimetableSkeleton';
import { addDays, formatWeekLabel, startOfWeek } from '../Components/timetable/timetableDates';
import { normalizeTimetableTeachers } from '../Components/timetable/timetableTeachers';
import { toDateKey } from '../Components/attendance/attendanceDates';
import { toast } from '../Components/CustomToast';
import { ErrorState } from '../Components/StateComponents';
import { useChildTimetable, useDownloadTimetable } from '../hooks/useTimetable';
import { getErrorMessage } from '../lib/apiError';
import { childRecordId, type ParentChild } from '../types/parent';

/** Props for {@link TimetablePageView}. */
interface TimetablePageViewProps {
  child: ParentChild;
  wards: ParentChild[];
  onSelectChild: (child: ParentChild) => void;
}

/**
 * One child's class timetable: weekly grid or list, today's schedule and the
 * class information.
 *
 * @param props - Component props.
 * @param props.child - A child verified to be linked to the signed-in parent.
 * @param props.wards - Every linked child, for the switcher.
 * @param props.onSelectChild - Switches the child the whole app shows.
 * @returns The page body.
 */
function TimetablePageView({ child, wards, onSelectChild }: TimetablePageViewProps) {
  const childId = childRecordId(child);
  const [view, setView] = useState<TimetableView>('weekly');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

  // `toDateKey` is local time. `toISOString()` was used before, which for a
  // parent east of UTC turns Monday 00:00 into Sunday's date, so the API
  // labelled every day of the list view a week early.
  const { data, isPending, isError, error, refetch } = useChildTimetable(childId, toDateKey(weekStart));
  const timetable = useMemo(() => (data ? normalizeTimetableTeachers(data, child) : null), [data, child]);

  const download = useDownloadTimetable();
  const handleDownload = (): void => {
    if (!childId) return;
    download.mutate(childId, {
      onSuccess: () => toast.success('Timetable downloaded successfully.'),
      onError: (err) => toast.error(getErrorMessage(err, 'Failed to download timetable.')),
    });
  };

  return (
    <div className="space-y-6">
      <div data-guide="timetable-header" className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#101828] md:text-3xl dark:text-slate-100">Timetable</h1>
          <p className="mt-1 text-sm font-medium text-[#667085] md:text-base dark:text-slate-400">
            View your child’s class schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!childId || download.isPending}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#003366] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A4EA3] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {download.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}{' '}
          Download Timetable
        </button>
      </div>

      <div data-guide="timetable-child">
        <SelectedChildCard child={child} wards={wards} onChange={onSelectChild} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-5">
          <TimetableControls
            view={view}
            onViewChange={setView}
            weekLabel={weekLabel}
            onMoveWeek={(direction) => setWeekStart((date) => addDays(date, direction * 7))}
          />

          {isPending ? (
            <TimetableSkeleton />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load the timetable" />
          ) : !timetable?.timetableSlots?.length ? (
            <EmptyTimetableState />
          ) : (
            <div data-guide="timetable-grid">
              {view === 'weekly' ? (
                <TimetableGrid slots={timetable.timetableSlots} weekDays={timetable.weekDays} />
              ) : (
                <TimetableListView grouped={timetable.listView ?? []} />
              )}
            </div>
          )}

          <p className="mx-auto w-fit rounded-xl bg-[#F4F7FB] px-4 py-2 text-center text-sm font-semibold text-[#667085] dark:bg-slate-800 dark:text-slate-300">
            Timetable is subject to change. Please check regularly for updates.
          </p>
        </main>
        <aside data-guide="timetable-sidecards" className="space-y-5">
          <TodayScheduleCard schedule={timetable?.todaySchedule ?? []} />
          <ClassInformationCard info={timetable?.classInformation ?? { schoolName: child.schoolName }} />
        </aside>
      </div>
    </div>
  );
}

/**
 * The timetable of the child the parent is looking at.
 *
 * @returns The page.
 */
export default function Timetable() {
  return (
    <ActiveChildGate subject="timetable">
      {(child, active) => <TimetablePageView child={child} wards={active.wards} onSelectChild={active.select} />}
    </ActiveChildGate>
  );
}
