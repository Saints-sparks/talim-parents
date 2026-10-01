import { api, buildQuery } from '../../lib/apiClient';
import type { ChildAttendance, ChildTimetable, ParentDashboard } from '../../types/portal/learner';
import type { AcknowledgeResult, ReportCard, ReportTerm } from '../../types/portal/reportCard';
import type { ChildLeave, LeavePayload, LeaveRequest } from '../../types/portal/leave';
import type { SchoolContact } from '../../types/portal/school';

/**
 * The learner view of one child (Part B): one aggregate request per screen.
 * Every function is child-scoped, so each passes `childId` in the request
 * config and the API client sends it as `X-Talim-Child` (A11).
 */

/**
 * The path prefix of one child's routes.
 *
 * @param childId - Student record id of a linked child.
 * @returns `/parents/me/children/<id>`.
 */
const childPath = (childId: string): string => `/parents/me/children/${encodeURIComponent(childId)}`;

/**
 * The dashboard aggregate (B1).
 *
 * @param childId - Student record id of a linked child.
 * @returns Today's lessons, the glance numbers, attention items, feed and fees.
 * @throws {ApiError} `NOT_FOUND` when the child is not linked to this parent.
 */
export function getChildDashboard(childId: string): Promise<ParentDashboard> {
  return api.get<ParentDashboard>(`${childPath(childId)}/dashboard`, { childId });
}

/**
 * One week of the child's timetable (B2).
 *
 * @param childId - Student record id of a linked child.
 * @param weekStart - Any date in the week (`YYYY-MM-DD`); the current week when omitted.
 * @returns The week, its periods, lessons and subject colours.
 * @throws {ApiError} `NOT_FOUND` when the child is not linked to this parent.
 */
export function getChildTimetable(childId: string, weekStart?: string): Promise<ChildTimetable> {
  return api.get<ChildTimetable>(`${childPath(childId)}/timetable${buildQuery({ weekStart })}`, { childId });
}

/**
 * The term's attendance numbers and one month's register marks (B6).
 *
 * @param childId - Student record id of a linked child.
 * @param month - `YYYY-MM`.
 * @returns The totals, the band and each day of the month.
 * @throws {ApiError} `NOT_FOUND` when the child is not linked to this parent.
 */
export function getChildAttendance(childId: string, month: string): Promise<ChildAttendance> {
  return api.get<ChildAttendance>(`${childPath(childId)}/attendance${buildQuery({ month })}`, { childId });
}

/**
 * The terms that have results for the child (B5).
 *
 * @param childId - Student record id of a linked child.
 * @returns The terms, newest first, with each one's results status.
 * @throws {ApiError} `NOT_FOUND` when the child is not linked to this parent.
 */
export function getReportTerms(childId: string): Promise<ReportTerm[]> {
  return api.get<ReportTerm[]>(`${childPath(childId)}/report-card/terms`, { childId });
}

/**
 * One term's report card (B5): this one call replaces the eight old
 * parent-results calls.
 *
 * @param childId - Student record id of a linked child.
 * @param termId - The term.
 * @returns The report: columns, rows, overall, scale, attendance and remarks.
 * @throws {ApiError} `NOT_FOUND` when the child or the term is not found.
 */
export function getReportCard(childId: string, termId: string): Promise<ReportCard> {
  return api.get<ReportCard>(`${childPath(childId)}/report-card${buildQuery({ termId })}`, { childId });
}

/**
 * Signs the report as the parent (B8). Allowed only once the term's results
 * are published.
 *
 * @param childId - Student record id of a linked child.
 * @param termId - The term being acknowledged.
 * @returns When it was acknowledged.
 * @throws {ApiError} `CONFLICT` (or 4xx) when the results are not published yet.
 */
export function acknowledgeReport(childId: string, termId: string): Promise<AcknowledgeResult> {
  return api.post<AcknowledgeResult>(`${childPath(childId)}/report-card/acknowledge`, { termId }, { childId });
}

/**
 * The child's leave requests this session (B9).
 *
 * @param childId - Student record id of a linked child.
 * @returns The requests, newest first, and the session count.
 * @throws {ApiError} `NOT_FOUND` when the child is not linked to this parent.
 */
export function getChildLeave(childId: string): Promise<ChildLeave> {
  return api.get<ChildLeave>(`${childPath(childId)}/leave`, { childId });
}

/**
 * Asks the school for leave (B9).
 *
 * @param childId - Student record id of a linked child.
 * @param payload - Type, dates and note.
 * @returns The new, pending request.
 * @throws {ApiError} `VALIDATION_FAILED` with field details.
 */
export function createLeave(childId: string, payload: LeavePayload): Promise<LeaveRequest> {
  return api.post<LeaveRequest>(`${childPath(childId)}/leave`, payload, { childId });
}

/**
 * Changes a pending leave request (B9).
 *
 * @param childId - Student record id of a linked child.
 * @param leaveId - The request.
 * @param payload - The new type, dates and note.
 * @returns The updated request.
 * @throws {ApiError} `CONFLICT` once the school has decided it.
 */
export function updateLeave(childId: string, leaveId: string, payload: LeavePayload): Promise<LeaveRequest> {
  return api.patch<LeaveRequest>(`${childPath(childId)}/leave/${encodeURIComponent(leaveId)}`, payload, { childId });
}

/**
 * Withdraws a pending leave request (B9).
 *
 * @param childId - Student record id of a linked child.
 * @param leaveId - The request.
 * @returns Resolves once it is gone.
 * @throws {ApiError} `CONFLICT` once the school has decided it.
 */
export async function deleteLeave(childId: string, leaveId: string): Promise<void> {
  await api.delete(`${childPath(childId)}/leave/${encodeURIComponent(leaveId)}`, { childId });
}

/**
 * How to reach the child's school office (B12).
 *
 * @param childId - Student record id of a linked child.
 * @returns Name, phone, email, address and office hours (each may be null).
 * @throws {ApiError} `NOT_FOUND` when the child is not linked to this parent.
 */
export function getChildSchool(childId: string): Promise<SchoolContact> {
  return api.get<SchoolContact>(`${childPath(childId)}/school`, { childId });
}
