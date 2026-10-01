/**
 * B9 leave requests. Hand-written; see `./common.ts` for how to swap these for
 * the generated contract.
 */

/** The leave types (B9). Legacy values are mapped to these at read time server-side. */
export type LeaveType = 'illness' | 'medical' | 'family_travel' | 'religious' | 'other';

/** Where a request stands. `Rejected` reads as `declined` (B9). */
export type LeaveStatus = 'pending' | 'approved' | 'declined';

/** One leave request. CONTRACT GAP: B9 names the routes, not the row shape. */
export interface LeaveRequest {
  id: string;
  type: LeaveType;
  /** `YYYY-MM-DD`. */
  startDate: string;
  /** `YYYY-MM-DD`; equal to `startDate` for one day. */
  endDate: string;
  /** School days covered. */
  days: number;
  note: string | null;
  status: LeaveStatus;
  /** Who approved or declined it. */
  decidedBy: { name: string } | null;
  decidedAt: string | null;
  createdAt: string;
}

/** `GET /parents/me/children/:childId/leave` (B9). */
export interface ChildLeave {
  requests: LeaveRequest[];
  countThisSession: number;
}

/** Body of `POST` and `PATCH .../leave` while the request is pending. */
export interface LeavePayload {
  type: LeaveType;
  startDate: string;
  endDate: string;
  note?: string;
}
