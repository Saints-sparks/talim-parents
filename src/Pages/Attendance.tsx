import { useMemo, useState, type ComponentType } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  Clock3,
  Download,
  Eye,
  Info,
  XCircle,
} from 'lucide-react';
import { useMonthlyAttendance } from '../hooks/useAttendance';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { ErrorState, LoadingState } from '../Components/StateComponents';
import { childRecordId } from '../types/parent';
import type { AttendanceCalendarDay } from '../services/attendance.services';

/** Presentation for one attendance status. */
interface StatusMeta {
  label: string;
  color: string;
  dot: string;
  soft: string;
  badge: string;
  border: string;
  icon: ComponentType<{ className?: string }>;
}

const STATUS_META: Record<string, StatusMeta> = {
  present: {
    label: 'Present',
    color: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    icon: CheckCircle2,
  },
  absent: {
    label: 'Absent',
    color: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
    soft: 'bg-red-50 dark:bg-red-950/40',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    border: 'border-red-100 dark:border-red-900/50',
    icon: XCircle,
  },
  late: {
    label: 'Late',
    color: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
    soft: 'bg-orange-50 dark:bg-orange-950/40',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    border: 'border-orange-100 dark:border-orange-900/50',
    icon: Clock3,
  },
  noClass: {
    label: 'No Class',
    color: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400',
    soft: 'bg-slate-50 dark:bg-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    border: 'border-slate-100 dark:border-slate-800',
    icon: CircleMinus,
  },
  noRecord: {
    label: 'No Record',
    color: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-300',
    soft: 'bg-slate-50 dark:bg-slate-800',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    border: 'border-slate-100 dark:border-slate-800',
    icon: Info,
  },
};

const SUMMARY_CARDS: Array<{ key: 'present' | 'absent' | 'late' | 'noClass'; title: string }> = [
  { key: 'present', title: 'Present' },
  { key: 'absent', title: 'Absent' },
  { key: 'late', title: 'Late' },
  { key: 'noClass', title: 'No Class' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Zero-pads a number to two digits.
 *
 * @param value - The number.
 * @returns The padded string.
 */
const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Formats a date as `YYYY-MM-DD`, in local time — the key the API's
 * `calendarDays` are indexed by.
 *
 * @param date - The date.
 * @returns The date key.
 */
const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Formats a date key as a long, readable date.
 *
 * @param date - The date.
 * @returns e.g. "Monday, March 3, 2026".
 */
const formatReadableDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);

/** One cell of the calendar grid. */
interface CalendarCell {
  date: Date;
  dateKey: string;
  outsideMonth: boolean;
  record?: AttendanceCalendarDay;
}

/**
 * Builds a Monday-first calendar grid for a month, mapping each day onto its
 * attendance record.
 *
 * @param year - Four-digit year.
 * @param month - 1–12.
 * @param records - The month's calendar days from the API.
 * @returns One cell per grid square, padded to full weeks.
 */
function buildCalendarDays(year: number, month: number, records: AttendanceCalendarDay[] = []): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingDays = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const cells: CalendarCell[] = [];

  for (let i = leadingDays; i > 0; i -= 1) {
    const date = new Date(year, month - 1, 1 - i);
    cells.push({ date, dateKey: toDateKey(date), outsideMonth: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const dateKey = toDateKey(date);
    cells.push({ date, dateKey, outsideMonth: false, record: recordMap.get(dateKey) });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const date = new Date(last);
    date.setDate(last.getDate() + 1);
    cells.push({ date, dateKey: toDateKey(date), outsideMonth: true });
  }

  return cells;
}

/**
 * Builds and downloads a CSV of the month's recent attendance records.
 *
 * @param studentId - Whose report this is, for the filename.
 * @param periodLabel - The period, for the filename.
 * @param records - The rows to export.
 */
function downloadAttendanceCsv(
  studentId: string,
  periodLabel: string,
  records: AttendanceCalendarDay[],
): void {
  const rows = [
    ['Date', 'Day', 'Status', 'Time', 'Notes'],
    ...records.map((record) => [
      record.date,
      String(record.day),
      record.statusLabel,
      record.time || '-',
      record.notes || '-',
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-${studentId}-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * One child's attendance: a calendar/list toggle, a day detail panel, and a
 * CSV export of the month's records.
 *
 * @returns The page.
 */
export default function Attendance() {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const { selectedStudent } = useSelectedStudent();

  const studentId = childRecordId(selectedStudent);
  const { data: attendanceData, isPending, isError, error, refetch } = useMonthlyAttendance(
    studentId,
    month,
    year,
    selectedDate,
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(year, month, attendanceData?.calendarDays ?? []),
    [attendanceData?.calendarDays, month, year],
  );

  const selectedDay = attendanceData?.selectedDay;
  const summary = attendanceData?.summary;
  const periodLabel = attendanceData?.period?.label ?? `${MONTHS[month - 1]} ${year}`;
  const selectedDayMeta = STATUS_META[selectedDay?.status ?? 'noRecord'] ?? STATUS_META.noRecord;
  const SelectedIcon = selectedDayMeta.icon;

  /**
   * Moves the calendar to a neighbouring month and re-anchors the selected day.
   *
   * @param direction - `-1` for the previous month, `1` for the next.
   */
  const moveMonth = (direction: 1 | -1): void => {
    const next = new Date(year, month - 1 + direction, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
    setSelectedDate(toDateKey(next));
  };

  /**
   * Moves the selected day by one, wrapping into a neighbouring month if needed.
   *
   * @param direction - `-1` for the previous day, `1` for the next.
   */
  const moveDay = (direction: 1 | -1): void => {
    const next = new Date(`${selectedDate}T00:00:00`);
    next.setDate(next.getDate() + direction);
    setSelectedDate(toDateKey(next));
    if (next.getMonth() + 1 !== month || next.getFullYear() !== year) {
      setMonth(next.getMonth() + 1);
      setYear(next.getFullYear());
    }
  };

  const handleDownload = (): void => {
    if (!attendanceData || !studentId) return;
    downloadAttendanceCsv(studentId, periodLabel, attendanceData.recentRecords ?? []);
  };

  if (!selectedStudent) {
    return (
      <div className="min-h-[70vh] rounded-2xl border border-[#E6ECF3] bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-[#003366] dark:text-blue-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">Select a child</h1>
          <p className="mt-2 text-sm text-[#667085] dark:text-slate-400">
            Choose a linked child from the header to view attendance records.
          </p>
        </div>
      </div>
    );
  }

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
          <button
            type="button"
            onClick={handleDownload}
            disabled={!attendanceData}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E0EA] bg-white px-5 text-sm font-bold text-[#0B2E4F] shadow-sm transition hover:bg-[#F4F8FF] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            Download report
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <section data-guide="attendance-summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_CARDS.map(({ key, title }) => {
            const meta = STATUS_META[key];
            const Icon = meta.icon;
            const data = summary?.[key] ?? { count: 0, percentage: 0 };
            return (
              <div
                key={key}
                className="rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.soft} ${meta.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-semibold text-[#344054] dark:text-slate-300">{title}</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <span className="text-3xl font-bold text-[#101828] dark:text-slate-100">{data.count}</span>
                  <span className={`text-sm font-bold ${meta.color}`}>
                    {data.percentage ? `${data.percentage}%` : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="space-y-5">
            <section className="rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div
                data-guide="attendance-controls"
                className="flex flex-col gap-4 border-b border-[#EEF2F6] pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800"
              >
                <div className="inline-flex rounded-xl bg-[#F4F7FB] p-1 dark:bg-slate-800">
                  {(['calendar', 'list'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      aria-current={viewMode === mode ? 'true' : undefined}
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
                  <button
                    type="button"
                    onClick={() => moveMonth(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D7E0EA] text-[#344054] hover:bg-[#F4F8FF] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <label className="relative">
                    <span className="sr-only">Month</span>
                    <select
                      value={month}
                      onChange={(event) => setMonth(Number(event.target.value))}
                      className="h-10 appearance-none rounded-xl border border-[#D7E0EA] bg-white px-4 pr-9 text-sm font-bold text-[#101828] outline-none hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      {MONTHS.map((name, index) => (
                        <option key={name} value={index + 1}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#667085] dark:text-slate-400" aria-hidden="true" />
                  </label>
                  <label className="relative">
                    <span className="sr-only">Year</span>
                    <input
                      type="number"
                      value={year}
                      onChange={(event) => setYear(Number(event.target.value) || year)}
                      className="h-10 w-24 rounded-xl border border-[#D7E0EA] px-3 text-sm font-bold outline-none hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => moveMonth(1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D7E0EA] text-[#344054] hover:bg-[#F4F8FF] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div data-guide="attendance-records" className="mt-5">
                {viewMode === 'calendar' ? (
                  <>
                    <div className="grid grid-cols-7 border-l border-t border-[#E6ECF3] text-center text-xs font-bold text-[#667085] dark:border-slate-800 dark:text-slate-400">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="border-b border-r border-[#E6ECF3] py-3 dark:border-slate-800">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 border-l border-[#E6ECF3] dark:border-slate-800">
                      {calendarDays.map(({ date, dateKey, outsideMonth, record }) => {
                        const meta = record ? STATUS_META[record.status] : null;
                        const isSelected = selectedDate === dateKey;
                        const isToday = dateKey === toDateKey(today);
                        return (
                          <button
                            key={dateKey}
                            type="button"
                            onClick={() => setSelectedDate(dateKey)}
                            aria-current={isSelected ? 'date' : undefined}
                            className={`min-h-[86px] border-b border-r border-[#E6ECF3] p-2 text-left transition hover:bg-[#F4F8FF] sm:min-h-[106px] dark:border-slate-800 dark:hover:bg-slate-800/60 ${
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
                              <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#475467] dark:text-slate-400">
                                <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                                <span className="hidden sm:inline">{meta.label}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="divide-y divide-[#EEF2F6] rounded-2xl border border-[#E6ECF3] dark:divide-slate-800 dark:border-slate-800">
                    {(attendanceData?.calendarDays ?? []).length > 0 ? (
                      (attendanceData?.calendarDays ?? []).map((record) => {
                        const meta = STATUS_META[record.status] ?? STATUS_META.noRecord;
                        return (
                          <button
                            key={record.id ?? record.date}
                            type="button"
                            onClick={() => setSelectedDate(record.date)}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[#F4F8FF] dark:hover:bg-slate-800/60"
                          >
                            <span>
                              <span className="block text-sm font-bold text-[#101828] dark:text-slate-100">{record.date}</span>
                              <span className="text-xs text-[#667085] dark:text-slate-400">{record.day}</span>
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.badge}`}>
                              {record.statusLabel}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-sm text-[#667085] dark:text-slate-400">
                        No attendance records posted for {periodLabel}.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-[#667085] dark:text-slate-400">
                {(['present', 'absent', 'late', 'noClass'] as const).map((status) => (
                  <span key={status} className="inline-flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${STATUS_META[status].dot}`} aria-hidden="true" />
                    {STATUS_META[status].label}
                  </span>
                ))}
              </div>
            </section>

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
                    {(attendanceData?.recentRecords ?? []).map((record) => {
                      const meta = STATUS_META[record.status] ?? STATUS_META.noRecord;
                      return (
                        <tr key={record.id ?? record.date} className="transition hover:bg-[#F8FBFF] dark:hover:bg-slate-800/40">
                          <td className="whitespace-nowrap px-3 py-4 font-semibold text-[#344054] dark:text-slate-300">{record.date}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-[#667085] dark:text-slate-400">{record.day}</td>
                          <td className="px-3 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.badge}`}>
                              {record.statusLabel}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-[#667085] dark:text-slate-400">{record.time ?? '-'}</td>
                          <td className="min-w-[220px] px-3 py-4 text-[#667085] dark:text-slate-400">{record.notes ?? '-'}</td>
                          <td className="px-3 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedDate(record.date)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#003366] hover:bg-[#F0F7FF] dark:text-blue-300 dark:hover:bg-slate-800"
                              aria-label={`View attendance for ${record.date}`}
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(attendanceData?.recentRecords ?? []).length === 0 && (
                  <div className="p-8 text-center text-sm text-[#667085] dark:text-slate-400">
                    Attendance records will appear here once the school posts them.
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside data-guide="attendance-detail" className="xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#101828] dark:text-slate-100">
                  {formatReadableDate(new Date(`${selectedDate}T00:00:00`))}
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveDay(-1)}
                    className="h-8 w-8 rounded-lg border border-[#E6ECF3] hover:bg-[#F4F8FF] dark:border-slate-700 dark:hover:bg-slate-800"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="mx-auto h-4 w-4 dark:text-slate-300" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDay(1)}
                    className="h-8 w-8 rounded-lg border border-[#E6ECF3] hover:bg-[#F4F8FF] dark:border-slate-700 dark:hover:bg-slate-800"
                    aria-label="Next day"
                  >
                    <ChevronRight className="mx-auto h-4 w-4 dark:text-slate-300" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className={`mt-5 rounded-2xl border p-4 ${selectedDayMeta.soft} ${selectedDayMeta.border}`}>
                <div className={`flex items-center gap-3 ${selectedDayMeta.color}`}>
                  <SelectedIcon className="h-6 w-6" />
                  <span className="font-bold">{selectedDay?.statusLabel ?? selectedDayMeta.label}</span>
                </div>
                <p className="mt-2 text-sm text-[#475467] dark:text-slate-400">
                  {selectedDay?.notes || 'No attendance detail is available for this day.'}
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-bold text-[#101828] dark:text-slate-100">Attendance overview</h3>
                <div className="mt-4 space-y-3">
                  {(['present', 'absent', 'late', 'noClass'] as const).map((status) => {
                    const meta = STATUS_META[status];
                    const data = summary?.[status] ?? { count: 0, percentage: 0 };
                    return (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2 text-[#475467] dark:text-slate-400">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                          {meta.label}
                        </span>
                        <span className={`font-bold ${meta.color}`}>
                          {data.count} ({data.percentage || 0}%)
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
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EEF2F6] dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(summary?.attendanceRate ?? 0, 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs text-[#667085] dark:text-slate-400">
                  <span>
                    {summary?.present?.count ?? 0} of {summary?.totalSchoolDays ?? 0} school days
                  </span>
                  <span>{summary?.attendanceRate ?? 0}%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownload}
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
        </div>
      </div>
    </div>
  );
}
