import { useMemo } from 'react';
import { Download } from 'lucide-react';
import ActiveChildGate from '../Components/parent/ActiveChildGate';
import ChildSwitcher from '../Components/parent/ChildSwitcher';
import AttendanceCalendarGrid from '../Components/attendance/AttendanceCalendarGrid';
import AttendanceControls from '../Components/attendance/AttendanceControls';
import AttendanceDetailPanel from '../Components/attendance/AttendanceDetailPanel';
import AttendanceLegend from '../Components/attendance/AttendanceLegend';
import AttendanceListView from '../Components/attendance/AttendanceListView';
import AttendanceSummaryCards from '../Components/attendance/AttendanceSummaryCards';
import RecentRecordsTable from '../Components/attendance/RecentRecordsTable';
import { downloadAttendanceCsv } from '../Components/attendance/attendanceCsv';
import { MONTHS, buildCalendarDays, resolveSelectedDay } from '../Components/attendance/attendanceDates';
import { ErrorState, LoadingState } from '../Components/StateComponents';
import { useMonthlyAttendance } from '../hooks/useAttendance';
import { useAttendanceMonth } from '../hooks/useAttendanceMonth';
import { childRecordId, type ParentChild } from '../types/parent';

/** Props for {@link AttendanceView}. */
interface AttendanceViewProps {
  child: ParentChild;
  wards: ParentChild[];
  onSelectChild: (child: ParentChild) => void;
}

/**
 * One child's attendance: a calendar/list toggle, a day detail panel, and a
 * CSV export of the month's records.
 *
 * @param props - Component props.
 * @param props.child - A child verified to be linked to the signed-in parent.
 * @param props.wards - Every linked child, for the switcher.
 * @param props.onSelectChild - Switches the child the whole app shows.
 * @returns The page body.
 */
function AttendanceView({ child, wards, onSelectChild }: AttendanceViewProps) {
  const studentId = childRecordId(child);
  const nav = useAttendanceMonth();
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useMonthlyAttendance(
    studentId,
    nav.month,
    nav.year,
  );

  const calendarDays = data?.calendarDays;
  const cells = useMemo(
    () => buildCalendarDays(nav.year, nav.month, calendarDays ?? []),
    [calendarDays, nav.month, nav.year],
  );
  const selectedDay = useMemo(
    () => resolveSelectedDay(calendarDays ?? [], nav.selectedDate),
    [calendarDays, nav.selectedDate],
  );
  const periodLabel = data?.period?.label ?? `${MONTHS[nav.month - 1]} ${nav.year}`;

  const handleDownload = (): void => {
    if (!data || !studentId) return;
    downloadAttendanceCsv(studentId, periodLabel, data.calendarDays ?? []);
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-5">
        <LoadingState count={4} className="h-28" label="Loading attendance" />
        <LoadingState count={1} className="h-[420px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load attendance" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0F172A] dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <div
          data-guide="attendance-header"
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#101828] dark:text-slate-100">Attendance</h1>
            <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
              Track your child&apos;s attendance and daily records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {wards.length > 1 && (
              <ChildSwitcher
                children={wards}
                selectedChild={child}
                onChange={(next) => next && onSelectChild(next)}
              />
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E0EA] bg-white px-5 text-sm font-bold text-[#0B2E4F] shadow-sm transition hover:bg-[#F4F8FF] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
            >
              Download report
              <Download className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <AttendanceSummaryCards summary={data?.summary} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="min-w-0 space-y-5">
            <section
              aria-busy={isPlaceholderData}
              className={`rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-opacity sm:p-5 dark:border-slate-800 dark:bg-slate-900 ${
                isPlaceholderData ? 'opacity-60' : ''
              }`}
            >
              <AttendanceControls
                viewMode={nav.viewMode}
                onViewModeChange={nav.setViewMode}
                month={nav.month}
                year={nav.year}
                onMoveMonth={nav.moveMonth}
                onGoToMonth={nav.goToMonth}
              />

              <div data-guide="attendance-records" className="mt-5">
                {nav.viewMode === 'calendar' ? (
                  <AttendanceCalendarGrid
                    cells={cells}
                    selectedDate={nav.selectedDate}
                    todayKey={nav.todayKey}
                    onSelect={nav.selectDate}
                  />
                ) : (
                  <AttendanceListView days={calendarDays ?? []} periodLabel={periodLabel} onSelect={nav.selectDate} />
                )}
              </div>

              <AttendanceLegend />
            </section>

            <RecentRecordsTable records={data?.recentRecords ?? []} onSelect={nav.selectDate} />
          </main>

          <AttendanceDetailPanel
            selectedDate={nav.selectedDate}
            selectedDay={selectedDay}
            summary={data?.summary}
            periodLabel={periodLabel}
            onMoveDay={nav.moveDay}
            onDownload={handleDownload}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Attendance for the child the parent is looking at.
 *
 * @returns The page.
 */
export default function Attendance() {
  return (
    <ActiveChildGate subject="attendance records">
      {(child, active) => <AttendanceView child={child} wards={active.wards} onSelectChild={active.select} />}
    </ActiveChildGate>
  );
}
