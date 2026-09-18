import { api, buildQuery } from '../lib/apiClient';

/**
 * Attendance endpoints.
 *
 * Both routes are scoped by `StudentAccessService.canViewStudent`, whose
 * parent branch requires `isParentOf(caller, student)` and refuses a child in
 * another school — so a child id the client sends that is not this parent's is
 * answered 404, never with another family's data.
 *
 * Note the two routes resolve `:studentId` differently in the backend:
 * `dashboard` accepts the Student record id **or** the child's user id, while
 * `monthly` accepts the record id only. Always pass `childRecordId(child)`.
 */

/** One attendance record on the dashboard. */
export interface AttendanceRecord {
  date: string;
  status: string;
  notes?: string;
  [key: string]: unknown;
}

/** What `GET /attendance/dashboard/:studentId` returns. */
export interface AttendanceDashboard {
  studentId: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  /** A percentage string such as `"85.00%"`, not a number. */
  attendancePercentage: string;
  records: AttendanceRecord[];
}

/** One day in the monthly calendar. */
export interface AttendanceCalendarDay {
  id?: string;
  date: string;
  day: number | string;
  status: 'present' | 'absent' | 'late' | 'noClass' | 'noRecord';
  statusLabel: string;
  time: string | null;
  notes: string;
  recordedBy?: { id: string; name: string };
}

/** A present/absent/late/noClass tally. */
export interface AttendanceTally {
  count: number;
  percentage: number;
}

/** What `GET /attendance/student/:studentId/monthly` returns. */
export interface MonthlyAttendance {
  student: { id: string; firstName: string; lastName: string; avatar?: string; grade?: string; className?: string };
  period: { month: number; year: number; label: string; startDate: string; endDate: string };
  summary: {
    present: AttendanceTally;
    absent: AttendanceTally;
    late: AttendanceTally;
    noClass: AttendanceTally;
    attendanceRate: number;
    totalRecorded: number;
    totalSchoolDays: number;
  };
  calendarDays: AttendanceCalendarDay[];
  selectedDay: AttendanceCalendarDay;
  recentRecords: AttendanceCalendarDay[];
  generatedAt: string;
}

/** Arguments for the monthly attendance call. */
export interface MonthlyAttendanceQuery {
  /** Student record id of a child linked to this parent. */
  studentId: string;
  /** 1–12. */
  month: number;
  /** Four-digit year. */
  year: number;
  /** `YYYY-MM-DD`; defaults to today server-side. */
  selectedDate?: string;
}

/**
 * One child's attendance summary and recent records.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @returns The dashboard.
 * @throws {ApiError} `NOT_FOUND` when the child is not this parent's.
 */
export function getAttendanceByStudentId(studentId: string): Promise<AttendanceDashboard> {
  if (!studentId) throw new Error('A child must be selected.');
  return api.get<AttendanceDashboard>(`/attendance/dashboard/${encodeURIComponent(studentId)}`);
}

/**
 * One child's attendance for a calendar month.
 *
 * @param query - Child, month, year and the day to expand.
 * @returns The month's calendar, summary and recent records.
 * @throws {ApiError} `NOT_FOUND` when the child is not this parent's,
 *   `BAD_REQUEST` when the month, year or date is out of range.
 */
export function getParentMonthlyAttendance({
  studentId,
  month,
  year,
  selectedDate,
}: MonthlyAttendanceQuery): Promise<MonthlyAttendance> {
  if (!studentId) throw new Error('A child must be selected.');
  if (!month || !year) throw new Error('A month and year are required.');
  return api.get<MonthlyAttendance>(
    `/attendance/student/${encodeURIComponent(studentId)}/monthly${buildQuery({
      month,
      year,
      selectedDate,
    })}`,
  );
}
