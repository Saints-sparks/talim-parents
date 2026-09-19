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
 * One child's attendance for a calendar month.
 *
 * Fetched once per child and month: the day the parent has open in the detail
 * panel is picked out of `calendarDays` on the client (the API's `selectedDay`
 * is exactly that lookup), so clicking through days costs no request and never
 * flashes the page into a skeleton. Moving to another month keeps the previous
 * month on screen — dimmed by `isPlaceholderData` — until the new one lands,
 * but never carries another child's data across a child switch.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param month - 1–12.
 * @param year - Four-digit year.
 * @returns The query result; disabled until a child is chosen.
 */
export function useMonthlyAttendance(
  studentId: string | undefined,
  month: number,
  year: number,
): UseQueryResult<MonthlyAttendance> {
  return useQuery({
    queryKey: queryKeys.attendance.monthly(studentId ?? 'none', month, year),
    queryFn: () => getParentMonthlyAttendance({ studentId: studentId as string, month, year }),
    enabled: Boolean(studentId),
    staleTime: staleTimes.fresh,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === (studentId ?? 'none') ? previous : undefined,
  });
}
