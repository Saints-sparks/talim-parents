import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useAttendance } from "../hooks/useAttendance";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";
import SkeletonLoader from "../Components/SkeletonLoader";
import LoadError from "../Components/loadError";

const STATUS_META = {
  present: {
    label: "Present",
    color: "text-emerald-700",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50",
    badge: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-100",
    icon: CheckCircle2,
  },
  absent: {
    label: "Absent",
    color: "text-red-700",
    dot: "bg-red-500",
    soft: "bg-red-50",
    badge: "bg-red-50 text-red-700",
    border: "border-red-100",
    icon: XCircle,
  },
  late: {
    label: "Late",
    color: "text-orange-700",
    dot: "bg-orange-500",
    soft: "bg-orange-50",
    badge: "bg-orange-50 text-orange-700",
    border: "border-orange-100",
    icon: Clock3,
  },
  noClass: {
    label: "No Class",
    color: "text-slate-600",
    dot: "bg-slate-400",
    soft: "bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
    border: "border-slate-100",
    icon: CircleMinus,
  },
  noRecord: {
    label: "No Record",
    color: "text-slate-600",
    dot: "bg-slate-300",
    soft: "bg-slate-50",
    badge: "bg-slate-100 text-slate-600",
    border: "border-slate-100",
    icon: Info,
  },
};

const SUMMARY_CARDS = [
  { key: "present", title: "Present" },
  { key: "absent", title: "Absent" },
  { key: "late", title: "Late" },
  { key: "noClass", title: "No Class" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (value) => String(value).padStart(2, "0");
const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatReadableDate = (date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

const buildCalendarDays = (year, month, records = []) => {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingDays = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const cells = [];

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
};

const getStudentId = (student) => student?._id || student?.id || student?.studentId;

function Attendance() {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [viewMode, setViewMode] = useState("calendar");
  const { selectedStudent } = useSelectedStudent();
  const { attendanceData, loading, error, getMonthlyAttendance } = useAttendance();

  const studentId = getStudentId(selectedStudent);

  useEffect(() => {
    if (!studentId) return;
    getMonthlyAttendance({ studentId, month, year, selectedDate });
  }, [getMonthlyAttendance, month, selectedDate, studentId, year]);

  const calendarDays = useMemo(
    () => buildCalendarDays(year, month, attendanceData?.calendarDays || []),
    [attendanceData?.calendarDays, month, year]
  );

  const selectedDay = attendanceData?.selectedDay;
  const summary = attendanceData?.summary || {};
  const periodLabel = attendanceData?.period?.label || `${MONTHS[month - 1]} ${year}`;
  const selectedDayMeta = STATUS_META[selectedDay?.status] || STATUS_META.noRecord;
  const SelectedIcon = selectedDayMeta.icon;

  const moveMonth = (direction) => {
    const next = new Date(year, month - 1 + direction, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
    setSelectedDate(toDateKey(next));
  };

  const handleDownload = () => {
    if (!attendanceData) return;
    const rows = [
      ["Date", "Day", "Status", "Time", "Notes"],
      ...(attendanceData.recentRecords || []).map((record) => [
        record.date,
        record.day,
        record.statusLabel,
        record.time || "-",
        record.notes || "-",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${studentId}-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedStudent) {
    return (
      <div className="min-h-[70vh] rounded-2xl border border-[#E6ECF3] bg-white p-8">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-[#003366]" />
          <h1 className="text-2xl font-bold text-[#0F172A]">Select a child</h1>
          <p className="mt-2 text-sm text-[#667085]">
            Choose a linked child from the header to view attendance records.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <LoadError message={`Error loading attendance data: ${error}`} onRetry={() => getMonthlyAttendance({ studentId, month, year, selectedDate })} />;
  }

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#101828]">Attendance</h1>
            <p className="mt-1 text-sm text-[#667085]">
              Track your child&apos;s attendance and daily records.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!attendanceData}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E0EA] bg-white px-5 text-sm font-bold text-[#0B2E4F] shadow-sm transition hover:bg-[#F4F8FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download Report
            <Download className="h-4 w-4" />
          </button>
        </div>

        {loading && !attendanceData ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SkeletonLoader type="card" count={4} />
            </div>
            <SkeletonLoader type="custom" height="520px" className="rounded-2xl" />
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {SUMMARY_CARDS.map(({ key, title }) => {
                const meta = STATUS_META[key];
                const Icon = meta.icon;
                const data = summary[key] || { count: 0, percentage: 0 };
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.soft} ${meta.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-[#344054]">{title}</p>
                    <div className="mt-1 flex items-end justify-between gap-3">
                      <span className="text-3xl font-bold text-[#101828]">{data.count}</span>
                      <span className={`text-sm font-bold ${meta.color}`}>
                        {data.percentage ? `${data.percentage}%` : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <main className="space-y-5">
                <section className="rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5">
                  <div className="flex flex-col gap-4 border-b border-[#EEF2F6] pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="inline-flex rounded-xl bg-[#F4F7FB] p-1">
                      {["calendar", "list"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setViewMode(mode)}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                            viewMode === mode
                              ? "bg-white text-[#003366] shadow-sm"
                              : "text-[#667085] hover:text-[#003366]"
                          }`}
                        >
                          {mode === "calendar" ? "Calendar View" : "List View"}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => moveMonth(-1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D7E0EA] text-[#344054] hover:bg-[#F4F8FF]"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <label className="relative">
                        <select
                          value={month}
                          onChange={(event) => setMonth(Number(event.target.value))}
                          className="h-10 appearance-none rounded-xl border border-[#D7E0EA] bg-white px-4 pr-9 text-sm font-bold text-[#101828] outline-none hover:bg-[#F8FAFD]"
                        >
                          {MONTHS.map((name, index) => (
                            <option key={name} value={index + 1}>{name}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#667085]" />
                      </label>
                      <input
                        type="number"
                        value={year}
                        onChange={(event) => setYear(Number(event.target.value))}
                        className="h-10 w-24 rounded-xl border border-[#D7E0EA] px-3 text-sm font-bold outline-none hover:bg-[#F8FAFD]"
                      />
                      <button
                        type="button"
                        onClick={() => moveMonth(1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D7E0EA] text-[#344054] hover:bg-[#F4F8FF]"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    {viewMode === "calendar" ? (
                      <>
                        <div className="grid grid-cols-7 border-l border-t border-[#E6ECF3] text-center text-xs font-bold text-[#667085]">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <div key={day} className="border-b border-r border-[#E6ECF3] py-3">
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 border-l border-[#E6ECF3]">
                          {calendarDays.map(({ date, dateKey, outsideMonth, record }) => {
                            const meta = STATUS_META[record?.status] || null;
                            const isSelected = selectedDate === dateKey;
                            const isToday = dateKey === toDateKey(today);
                            return (
                              <button
                                key={dateKey}
                                type="button"
                                onClick={() => setSelectedDate(dateKey)}
                                className={`min-h-[86px] border-b border-r border-[#E6ECF3] p-2 text-left transition hover:bg-[#F4F8FF] sm:min-h-[106px] ${
                                  isSelected ? "bg-[#F0F7FF] ring-2 ring-inset ring-[#8FC5FF]" : "bg-white"
                                } ${outsideMonth ? "text-[#98A2B3]" : "text-[#101828]"}`}
                              >
                                <span
                                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg text-sm font-bold ${
                                    isToday ? "bg-[#003366] text-white" : isSelected ? "bg-white text-[#003366]" : ""
                                  }`}
                                >
                                  {date.getDate()}
                                </span>
                                {meta && !outsideMonth && (
                                  <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#475467]">
                                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                                    <span className="hidden sm:inline">{meta.label}</span>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="divide-y divide-[#EEF2F6] rounded-2xl border border-[#E6ECF3]">
                        {(attendanceData?.calendarDays || []).length > 0 ? (
                          attendanceData.calendarDays.map((record) => {
                            const meta = STATUS_META[record.status] || STATUS_META.noRecord;
                            return (
                              <button
                                key={record.id || record.date}
                                type="button"
                                onClick={() => setSelectedDate(record.date)}
                                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[#F4F8FF]"
                              >
                                <span>
                                  <span className="block text-sm font-bold text-[#101828]">{record.date}</span>
                                  <span className="text-xs text-[#667085]">{record.day}</span>
                                </span>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.badge}`}>
                                  {record.statusLabel}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-sm text-[#667085]">
                            No attendance records posted for {periodLabel}.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-[#667085]">
                    {["present", "absent", "late", "noClass"].map((status) => (
                      <span key={status} className="inline-flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${STATUS_META[status].dot}`} />
                        {STATUS_META[status].label}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5">
                  <h2 className="text-base font-bold text-[#101828]">Recent Attendance Records</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#EEF2F6] text-xs uppercase tracking-wide text-[#667085]">
                          <th className="px-3 py-3">Date</th>
                          <th className="px-3 py-3">Day</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Time</th>
                          <th className="px-3 py-3">Notes/Reason</th>
                          <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF2F6]">
                        {(attendanceData?.recentRecords || []).map((record) => {
                          const meta = STATUS_META[record.status] || STATUS_META.noRecord;
                          return (
                            <tr key={record.id || record.date} className="transition hover:bg-[#F8FBFF]">
                              <td className="whitespace-nowrap px-3 py-4 font-semibold text-[#344054]">{record.date}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-[#667085]">{record.day}</td>
                              <td className="px-3 py-4">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.badge}`}>
                                  {record.statusLabel}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-[#667085]">{record.time || "-"}</td>
                              <td className="min-w-[220px] px-3 py-4 text-[#667085]">{record.notes || "-"}</td>
                              <td className="px-3 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDate(record.date)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#003366] hover:bg-[#F0F7FF]"
                                  aria-label="View attendance record"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {(attendanceData?.recentRecords || []).length === 0 && (
                      <div className="p-8 text-center text-sm text-[#667085]">
                        Attendance records will appear here once the school posts them.
                      </div>
                    )}
                  </div>
                </section>
              </main>

              <aside className="xl:sticky xl:top-24 xl:self-start">
                <div className="rounded-2xl border border-[#E6ECF3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-[#101828]">
                      {selectedDate ? formatReadableDate(new Date(`${selectedDate}T00:00:00`)) : "Selected day"}
                    </h2>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => {
                        const next = new Date(`${selectedDate}T00:00:00`);
                        next.setDate(next.getDate() - 1);
                        setSelectedDate(toDateKey(next));
                      }} className="h-8 w-8 rounded-lg border border-[#E6ECF3] hover:bg-[#F4F8FF]">
                        <ChevronLeft className="mx-auto h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => {
                        const next = new Date(`${selectedDate}T00:00:00`);
                        next.setDate(next.getDate() + 1);
                        setSelectedDate(toDateKey(next));
                      }} className="h-8 w-8 rounded-lg border border-[#E6ECF3] hover:bg-[#F4F8FF]">
                        <ChevronRight className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className={`mt-5 rounded-2xl border p-4 ${selectedDayMeta.soft} ${selectedDayMeta.border}`}>
                    <div className={`flex items-center gap-3 ${selectedDayMeta.color}`}>
                      <SelectedIcon className="h-6 w-6" />
                      <span className="font-bold">{selectedDay?.statusLabel || selectedDayMeta.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#475467]">
                      {selectedDay?.notes || "No attendance detail is available for this day."}
                    </p>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-[#101828]">Attendance Overview</h3>
                    <div className="mt-4 space-y-3">
                      {["present", "absent", "late", "noClass"].map((status) => {
                        const meta = STATUS_META[status];
                        const data = summary[status] || { count: 0, percentage: 0 };
                        return (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <span className="inline-flex items-center gap-2 text-[#475467]">
                              <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
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

                  <div className="mt-6 border-t border-[#EEF2F6] pt-5">
                    <div className="flex items-center justify-between text-sm">
                      <h3 className="font-bold text-[#101828]">Monthly Trend</h3>
                      <span className="text-xs font-bold text-[#003366]">{periodLabel}</span>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EEF2F6]">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(summary.attendanceRate || 0, 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-[#667085]">
                      <span>{summary.present?.count || 0} of {summary.totalSchoolDays || 0} school days</span>
                      <span>{summary.attendanceRate || 0}%</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D7E0EA] bg-white text-sm font-bold text-[#003366] hover:bg-[#F4F8FF]"
                  >
                    View Detailed Report
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <div className="mt-4 rounded-xl bg-[#F0F7FF] p-4 text-xs leading-5 text-[#475467]">
                    <Info className="mb-2 h-4 w-4 text-[#003366]" />
                    Percentage is calculated from attendance records posted by the school for the selected month.
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Attendance;
