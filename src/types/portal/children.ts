/**
 * B13 children and A11 link codes. Hand-written; see `./common.ts` for how to
 * swap these for the generated contract.
 */
import type { ClassRef, Position, Relationship, SchoolRef } from './common';

/**
 * One linked child, from `GET /parents/me/children` (B13: every child in ONE
 * batched call, across schools).
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
  average: number | null;
  grade: string | null;
  position: Position | null;
  /** Naira still owed this term. */
  outstanding: number;
  isDefault: boolean;
  /** CONTRACT GAP: the link's relationship (A11 stores it; B13 does not list it). */
  relationship?: Relationship | null;
  /** CONTRACT GAP: the child's photo, when the school has one. */
  avatarUrl?: string | null;
}

/** Body of `POST /parents/me/children/link` (A11). */
export interface LinkChildPayload {
  /** "ABCD-1234", from the school office. */
  code: string;
  relationship: Relationship;
}

/**
 * What `POST /parents/me/children/link` answers. CONTRACT GAP: the contract
 * names the errors (404 wrong/expired, 409 used) but not the success body.
 */
export interface LinkChildResult {
  child: ChildSummary;
}
