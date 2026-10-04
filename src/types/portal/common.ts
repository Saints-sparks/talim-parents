/**
 * Shared shapes of the parent portal, over the backend's generated contract
 * (`src/types/api.d.ts`, refreshed with `npm run types:api`).
 *
 * Every alias below is a `Schema<'…Dto'>` from `../apiContract`, so a backend
 * change fails `npm run typecheck` instead of reaching a screen. The few
 * interfaces left hand-written are marked `BACKEND GAP`: the API returns them
 * (checked against the running API by `src/__live__/contract.live.test.ts`),
 * but its OpenAPI document does not describe them yet.
 */
import type { Schema } from '../apiContract';

/** A term as the learner-view routes return it (B1, B2, B5, B6). */
export type LearnerTerm = Schema<'LearnerTermDto'>;

/**
 * The term on a bill (C2) or a receipt (C5), and each of the receipts' terms.
 * BACKEND GAP: the API adds `session` (and the bill's `term`), but the
 * OpenAPI `TermRefDto` has only `id` and `name`.
 */
export interface TermLabel {
  id: string;
  name: string;
  /** "2026/2027". */
  session: string | null;
}

/**
 * A school, as the children list carries it (B13: `city` is the school's
 * state). BACKEND GAP: `GET /parents/me/children` documents no response.
 */
export interface SchoolRef {
  id: string;
  name: string;
  city?: string | null;
}

/** A class reference. */
export type ClassRef = Schema<'IdNameDto'>;

/** A competition rank: ties share a rank (A7). */
export type Position = Schema<'PositionDto'>;

/** One band of the school's grade scale (per school; default A70/B60/C50/D45/E40/F). */
export type GradeBand = Schema<'GradeBandDto'>;

/** How a parent is related to one linked child (A11). */
export type Relationship = Schema<'LinkChildDto'>['relationship'];

/** Pagination `meta` of `GET /notifications`, kept by the API client's strict unwrap. */
export interface PageMeta {
  total: number;
  page: number;
  lastPage: number;
  limit: number;
}

/** A paginated list with `meta` (`GET /notifications`). */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/**
 * Where a notification, an attention item or a deep link leads (§30 targets).
 * The API types `target` as an open object (`FeedItemDto.target`); this is
 * the subset the app routes on, checked at read time.
 */
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
