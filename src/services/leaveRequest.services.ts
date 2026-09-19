import { api } from '../lib/apiClient';
import type { CreateLeaveRequestPayload } from '../types/apiPayloads';

/**
 * Leave-request endpoints.
 *
 * `POST /leave-requests` refuses any caller whose role is not `parent`, and
 * then requires `isParentOf(caller, student)` — so the `child` in the payload
 * must be one of the caller's own children. The list and delete routes run the
 * same check. `PUT /leave-requests/:id/status` is staff-only; this app must
 * never call it, so it is deliberately absent from this module.
 */

/** Reasons the API accepts. The values are the human strings, not SCREAMING_CASE. */
export const LEAVE_TYPES = [
  'Health Issue',
  'Family Event',
  'Fees Issue',
  'Travel',
  'Emergency',
  'Other',
] as const satisfies readonly LeaveType[];

/** One reason a parent can give for a leave request (the DTO's enum). */
export type LeaveType = CreateLeaveRequestPayload['leaveType'];

/** Where a leave request has got to. Capitalised, as the API spells it. */
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

/**
 * Body of `POST /leave-requests` (`CreateLeaveRequestDto`), from the generated
 * contract. `child`, `startDate`, `endDate`, `leaveType` and `term` are
 * required and the API runs `forbidNonWhitelisted` — one extra field is a 400.
 */
export type { CreateLeaveRequestPayload } from '../types/apiPayloads';

/** A leave request as the API returns it. */
export interface LeaveRequest {
  _id: string;
  child: string | { _id?: string; firstName?: string; lastName?: string };
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  reason?: string;
  attachments?: string[];
  status: LeaveStatus;
  declineReason?: string;
  viewed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Submits a leave request for one of the parent's own children.
 *
 * @param payload - Exactly the fields `CreateLeaveRequestDto` declares.
 * @returns The created request.
 * @throws {ApiError} `VALIDATION_FAILED` with per-field details,
 *   `FORBIDDEN` when the child is not the caller's,
 *   `NOT_FOUND` when the child's class has no form teacher to route it to.
 */
export function createLeaveRequest(
  payload: CreateLeaveRequestPayload | FormData,
): Promise<LeaveRequest> {
  return api.post<LeaveRequest>('/leave-requests', payload);
}

/**
 * One leave request.
 *
 * @param id - The request's id.
 * @returns The request.
 * @throws {ApiError} `NOT_FOUND` when it is not the caller's.
 */
export function getLeaveRequestById(id: string): Promise<LeaveRequest> {
  return api.get<LeaveRequest>(`/leave-requests/${encodeURIComponent(id)}`);
}

/**
 * Every leave request raised for one child.
 *
 * @param childId - Student record id or user id of one of the caller's children.
 * @returns The requests.
 * @throws {ApiError} `NOT_FOUND` when the child is not the caller's.
 */
export function getLeaveRequestsByChild(childId: string): Promise<LeaveRequest[]> {
  if (!childId) throw new Error('A child must be selected.');
  return api.get<LeaveRequest[]>(`/leave-requests/student/${encodeURIComponent(childId)}`);
}

/**
 * Withdraws a leave request. The server allows this only while the request is
 * still `Pending`, so the UI must hide it for anything else.
 *
 * @param id - The request's id.
 * @returns True when it was deleted.
 * @throws {ApiError} `BAD_REQUEST` once the request has been decided,
 *   `NOT_FOUND` when it is not the caller's.
 */
export function deleteLeaveRequest(id: string): Promise<boolean> {
  return api.delete<boolean>(`/leave-requests/${encodeURIComponent(id)}`);
}
