/**
 * B9 leave requests, as the generated contract describes them.
 */
import type { Schema } from '../apiContract';

/** One leave request. `Rejected` reads as `declined`. */
export type LeaveRequest = Schema<'LeaveRowDto'>;

/** The leave types (B9). Legacy values are mapped to these at read time server-side. */
export type LeaveType = LeaveRequest['type'];

/** Where a request stands. */
export type LeaveStatus = LeaveRequest['status'];

/** `GET /parents/me/children/:childId/leave` (B9). */
export type ChildLeave = Schema<'ChildLeaveDto'>;

/** Body of `POST .../leave` (and of `PATCH .../leave/:leaveId` while the request is pending). */
export type LeavePayload = Schema<'ParentLeaveCreateDto'>;

/** What `DELETE .../leave/:leaveId` answers. */
export type LeaveCancelled = Schema<'LeaveCancelledDto'>;
