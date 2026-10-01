/**
 * Shared shapes of the parent-portal redesign contract.
 *
 * HAND-WRITTEN from `talimBE-V2/docs/redesign-portals-students-parents.md`
 * (Parts B and C), because the backend for these routes is being built in
 * parallel and is not in `src/types/api.d.ts` yet. When it lands:
 *
 *   1. run `npm run types:api` to refresh the generated contract;
 *   2. replace each interface in `src/types/portal/` with a `Schema<'…Dto'>`
 *      or `ResponseBody<'/route'>` alias from `src/types/apiContract.ts`;
 *   3. run `npm run typecheck` — every screen that drifted fails there.
 *
 * Fields the contract does not name but the screens need are marked
 * `CONTRACT GAP` and are optional, so the UI degrades when they are absent.
 */

/** A term as the learner-view routes return it. */
export interface TermRef {
  id: string;
  name: string;
  /** "2026 / 2027". */
  session: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** CONTRACT GAP: whether this is the school's current term (B5 "live" state). */
  isCurrent?: boolean;
}

/** A school, as the multi-school lists carry it (A11). */
export interface SchoolRef {
  id: string;
  name: string;
  city?: string | null;
}

/** A class reference. */
export interface ClassRef {
  id: string;
  name: string;
}

/** A competition rank: ties share a rank (A7). */
export interface Position {
  rank: number;
  of: number;
}

/**
 * One band of the school's grade scale (Round 3: per-school, editable, default
 * A70/B60/C50/D45/E40/F). CONTRACT GAP: the contract names `scale` but not its
 * item shape; this is the shape the screens read.
 */
export interface GradeBand {
  grade: string;
  /** Lowest percent that earns this grade. */
  min: number;
  /** "Excellent", "Very good"… */
  label?: string | null;
}

/** How a parent is related to one linked child (A11). */
export type Relationship = 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';

/** Pagination `meta`, kept by the API client's strict unwrap. */
export interface PageMeta {
  total: number;
  page: number;
  lastPage: number;
  limit: number;
}

/** A paginated list: `{ data, meta }` with or without the envelope. */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Where a notification, an attention item or a deep link leads (§30 targets). */
export interface PortalTarget {
  page:
    | 'dashboard'
    | 'attendance'
    | 'timetable'
    | 'results'
    | 'grading'
    | 'leave'
    | 'messages'
    | 'notifications'
    | 'payments'
    | 'announcements'
    | 'resources'
    | 'settings';
  roomId?: string;
  termId?: string;
  date?: string;
  [key: string]: unknown;
}
