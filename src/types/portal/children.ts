/**
 * B13 children and A11 link codes.
 */
import type { Schema } from '../apiContract';
import type { ClassRef, Position, Relationship, SchoolRef } from './common';

/**
 * One linked child, from `GET /parents/me/children` (B13: every child in ONE
 * batched call, across schools). Only the B13 fields this app reads are
 * listed; the API keeps the older fields alongside.
 *
 * BACKEND GAP: the route documents no response schema, so this is
 * hand-written from the as-built notes and checked live by the contract test.
 */
export interface ChildSummary {
  /** The Student record id: what every child-scoped route and `X-Talim-Child` take. */
  id: string;
  name: string;
  admissionNumber: string | null;
  /** `null` when the school has not placed the child in a class yet. */
  class: ClassRef | null;
  school: SchoolRef;
  /** Percent, (present + late) / (present + late + absent); null before any register. */
  attendanceRate: number | null;
  /** Term percent from published scores; null before any. */
  average: number | null;
  /** The letter of `average` on the school's scale. */
  averageGrade: string | null;
  /** The grade level ("Grade 5"). `grade` carries the same, for older clients. */
  gradeLevel: string | null;
  position: Position | null;
  /** Naira still owed. */
  outstanding: number;
  isDefault: boolean;
  /** How this parent is related to the child; null for a link made before A11. */
  relationship: Relationship | null;
  avatarUrl: string | null;
}

/** Body of `POST /parents/me/children/link` (A11). */
export type LinkChildPayload = Schema<'LinkChildDto'>;

/**
 * What `POST /parents/me/children/link` answers: the link, plus `child`, the
 * card. BACKEND GAP: the route documents no response schema.
 */
export interface LinkChildResult {
  child: ChildSummary;
}
