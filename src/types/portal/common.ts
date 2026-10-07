/**
 * Shared shapes of the parent portal, over the backend's generated contract
 * (`src/types/api.d.ts`, refreshed with `npm run types:api`).
 *
 * Every alias below is a `Schema<'…Dto'>` from `../apiContract`, so a backend
 * change fails `npm run typecheck` instead of reaching a screen. A type is
 * written by hand only where the generated one is looser than what the app
 * must handle, and says why ("HAND-WRITTEN: …").
 */
import type { Schema } from '../apiContract';

/** A term as the learner-view routes return it (B1, B2, B5, B6). */
export type LearnerTerm = Schema<'LearnerTermDto'>;

/** The term on a bill (C2) or a receipt (C5), and each of the receipts' terms, with its session ("2026/2027"). */
export type TermLabel = Schema<'SessionTermRefDto'>;

/** A school, as the children list carries it (B13: `city` is the school's state). */
export type SchoolRef = Schema<'ChildCardSchoolDto'>;

/** The school a notification came from (A11: lists span every child's school). */
export type NotificationSchool = Schema<'NotificationSchoolDto'>;

/** A class reference. */
export type ClassRef = Schema<'IdNameDto'>;

/** A competition rank: ties share a rank (A7). */
export type Position = Schema<'PositionDto'>;

/** One band of the school's grade scale (per school; default A70/B60/C50/D45/E40/F). */
export type GradeBand = Schema<'GradeBandDto'>;

/** How a parent is related to one linked child (A11). */
export type Relationship = Schema<'LinkChildDto'>['relationship'];

/** Pagination `meta` of `GET /notifications`, kept by the API client's strict unwrap. */
export type PageMeta = Schema<'NotificationPageMetaDto'>;

/** A paginated list with `meta` (`GET /notifications`). */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/**
 * Where a notification, an attention item or a deep link leads (§30 targets):
 * the API's `NotificationTargetDto`. HAND-WRITTEN wider `page`: notifications
 * stored before the API fixed its page list, and raw `metadata.target`, may
 * name others ('dashboard', 'notifications'), which `pathForTarget` still routes.
 * v1.5's support target is `{ page: 'support', ticketId }`.
 */
export type PortalTarget = Omit<Schema<'NotificationTargetDto'>, 'page'> & { page: string };
