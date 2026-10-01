import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  acknowledgeReport,
  createLeave,
  deleteLeave,
  getChildAttendance,
  getChildDashboard,
  getChildLeave,
  getChildSchool,
  getChildTimetable,
  getReportCard,
  getReportTerms,
  updateLeave,
} from '../../services/portal/learner';
import { queryKeys, staleTimes } from '../../lib/queryKeys';
import type { ChildAttendance, ChildTimetable, ParentDashboard } from '../../types/portal/learner';
import type { AcknowledgeResult, ReportCard, ReportTerm } from '../../types/portal/reportCard';
import type { ChildLeave, LeavePayload, LeaveRequest } from '../../types/portal/leave';
import type { SchoolContact } from '../../types/portal/school';

/**
 * Cached reads for one child (Part B). Every key starts with the child's id,
 * so switching child moves every screen onto that child's entries (and
 * fetches them); nothing is shared between children by accident.
 */

/**
 * The dashboard aggregate (B1).
 *
 * @param childId - The active child, or `undefined` while there is none.
 * @returns The query; disabled until a child is known.
 */
export function useChildDashboard(childId: string | undefined): UseQueryResult<ParentDashboard> {
  return useQuery({
    queryKey: queryKeys.child.dashboard(childId ?? 'none'),
    queryFn: () => getChildDashboard(childId as string),
    enabled: Boolean(childId),
    staleTime: staleTimes.fresh,
  });
}

/**
 * One week of the timetable (B2). The previous week stays on screen while the
 * next one loads, so paging does not flash a skeleton.
 *
 * @param childId - The active child.
 * @param weekStart - Any date in the week, or `undefined` for this week.
 * @returns The query.
 */
export function useChildTimetable(childId: string | undefined, weekStart: string | undefined): UseQueryResult<ChildTimetable> {
  return useQuery({
    queryKey: queryKeys.child.timetable(childId ?? 'none', weekStart),
    queryFn: () => getChildTimetable(childId as string, weekStart),
    enabled: Boolean(childId),
    staleTime: staleTimes.list,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === childId ? previous : undefined,
  });
}

/**
 * The term's attendance and one month's marks (B6).
 *
 * @param childId - The active child.
 * @param month - `YYYY-MM`.
 * @returns The query.
 */
export function useChildAttendance(childId: string | undefined, month: string): UseQueryResult<ChildAttendance> {
  return useQuery({
    queryKey: queryKeys.child.attendance(childId ?? 'none', month),
    queryFn: () => getChildAttendance(childId as string, month),
    enabled: Boolean(childId && month),
    staleTime: staleTimes.fresh,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === childId ? previous : undefined,
  });
}

/**
 * The terms that have results (B5), for the term picker.
 *
 * @param childId - The active child.
 * @returns The query.
 */
export function useReportTerms(childId: string | undefined): UseQueryResult<ReportTerm[]> {
  return useQuery({
    queryKey: queryKeys.child.reportTerms(childId ?? 'none'),
    queryFn: () => getReportTerms(childId as string),
    enabled: Boolean(childId),
    staleTime: staleTimes.reference,
  });
}

/**
 * One term's report card (B5): the one aggregate behind the Results screen.
 *
 * @param childId - The active child.
 * @param termId - The chosen term.
 * @returns The query; disabled until both are known.
 */
export function useReportCard(childId: string | undefined, termId: string | undefined): UseQueryResult<ReportCard> {
  return useQuery({
    queryKey: queryKeys.child.reportCard(childId ?? 'none', termId ?? 'none'),
    queryFn: () => getReportCard(childId as string, termId as string),
    enabled: Boolean(childId && termId),
    staleTime: staleTimes.list,
  });
}

/**
 * Signs the report as the parent (B8) and writes the stamp into the cached
 * report, so the button turns into "Download term report" at once.
 *
 * @param childId - The active child.
 * @returns The mutation, taking the term id.
 */
export function useAcknowledgeReport(childId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<AcknowledgeResult, unknown, string>({
    mutationFn: (termId) => acknowledgeReport(childId as string, termId),
    onSuccess: (result, termId) => {
      queryClient.setQueryData<ReportCard>(queryKeys.child.reportCard(childId ?? 'none', termId), (current) =>
        current ? { ...current, acknowledgedAt: result.acknowledgedAt } : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.child.dashboard(childId ?? 'none') });
    },
  });
}

/**
 * The child's leave requests (B9).
 *
 * @param childId - The active child.
 * @returns The query.
 */
export function useChildLeave(childId: string | undefined): UseQueryResult<ChildLeave> {
  return useQuery({
    queryKey: queryKeys.child.leave(childId ?? 'none'),
    queryFn: () => getChildLeave(childId as string),
    enabled: Boolean(childId),
    staleTime: staleTimes.fresh,
  });
}

/** What {@link useLeaveMutations} returns. */
export interface LeaveMutations {
  create: UseMutationResult<LeaveRequest, unknown, LeavePayload>;
  update: UseMutationResult<LeaveRequest, unknown, { id: string; payload: LeavePayload }>;
  remove: UseMutationResult<void, unknown, string>;
}

/**
 * Create, change and withdraw leave requests (B9). Each refreshes the list and
 * the dashboard's attention items.
 *
 * @param childId - The active child.
 * @returns The three mutations.
 */
export function useLeaveMutations(childId: string | undefined): LeaveMutations {
  const queryClient = useQueryClient();
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.child.leave(childId ?? 'none') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.child.dashboard(childId ?? 'none') });
  };
  return {
    create: useMutation<LeaveRequest, unknown, LeavePayload>({
      mutationFn: (payload) => createLeave(childId as string, payload),
      onSuccess: refresh,
    }),
    update: useMutation<LeaveRequest, unknown, { id: string; payload: LeavePayload }>({
      mutationFn: ({ id, payload }) => updateLeave(childId as string, id, payload),
      onSuccess: refresh,
    }),
    remove: useMutation<void, unknown, string>({
      mutationFn: (id) => deleteLeave(childId as string, id),
      onSuccess: refresh,
    }),
  };
}

/**
 * How to reach the child's school (B12).
 *
 * @param childId - The active child.
 * @param enabled - Load only when the sheet is open.
 * @returns The query.
 */
export function useChildSchool(childId: string | undefined, enabled = true): UseQueryResult<SchoolContact> {
  return useQuery({
    queryKey: queryKeys.child.school(childId ?? 'none'),
    queryFn: () => getChildSchool(childId as string),
    enabled: Boolean(childId) && enabled,
    staleTime: staleTimes.reference,
  });
}
