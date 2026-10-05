/**
 * B13 children and A11 link codes.
 */
import type { Schema } from '../apiContract';

/**
 * One linked child, from `GET /parents/me/children` (B13: every child in ONE
 * batched call, across schools): the B13 fields of `ParentChildCardDto` this
 * app reads (the API keeps the older fields alongside). `id` is the Student
 * record id, what every child-scoped route and `X-Talim-Child` take; `class`
 * is null until the school places the child; `relationship` is null for a
 * link made before A11.
 */
export type ChildSummary = Pick<
  Schema<'ParentChildCardDto'>,
  | 'id'
  | 'name'
  | 'admissionNumber'
  | 'class'
  | 'school'
  | 'attendanceRate'
  | 'average'
  | 'averageGrade'
  | 'gradeLevel'
  | 'position'
  | 'outstanding'
  | 'isDefault'
  | 'relationship'
  | 'avatarUrl'
>;

/** Body of `POST /parents/me/children/link` (A11). */
export type LinkChildPayload = Schema<'LinkChildDto'>;

/**
 * What `POST /parents/me/children/link` answers: the link (`childId`, school,
 * relationship), plus `child`, the card, which is null when the server could
 * not build it. The link sheet copes with both.
 */
export type LinkChildResult = Omit<Schema<'LinkedChildResponseDto'>, 'child'> & { child: ChildSummary | null };
