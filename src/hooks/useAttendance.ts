import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getAttendanceByStudentId,
  getParentMonthlyAttendance,
  type AttendanceDashboard,
  type MonthlyAttendance,
} from '../services/attendance.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';

/**
 * One child's attendance summary and recent records.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @returns The query result; disabled until a child is chosen.
 */
export function useAttendanceDashboard(studentId: string | undefined): UseQueryResult<AttendanceDashboard> {
  return useQuery({
    queryKey: queryKeys.attendance.dashboard(studentId ?? 'none'),
    queryFn: () => getAttendanceByStudentId(studentId as string),
    enabled: Boolean(studentId),
    staleTime: staleTimes.fresh,
  });
}

/**
 * One child's attendance for a calendar month, with one day expanded.
 *
 * Refetches whenever the child, month, year or selected day changes — the
 * old imperative version fetched with `dashboard`-endpoint data regardless of
 * which month the parent had navigated to, so the calendar never actually
 * moved when Previous/Next was pressed.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param month - 1–12.
 * @param year - Four-digit year.
 * @param selectedDate - `YYYY-MM-DD` day to expand.
 * @returns The query result; disabled until a child is chosen.
 */
export function useMonthlyAttendance(
  studentId: string | undefined,
  month: number,
  year: number,
  selectedDate?: string,
): UseQueryResult<MonthlyAttendance> {
  return useQuery({
    queryKey: [...queryKeys.attendance.monthly(studentId ?? 'none', month, year), selectedDate] as const,
    queryFn: () => getParentMonthlyAttendance({ studentId: studentId as string, month, year, selectedDate }),
    enabled: Boolean(studentId),
    staleTime: staleTimes.fresh,
  });
}
