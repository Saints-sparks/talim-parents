/**
 * Parent-facing domain types.
 *
 * Mirrors `toChildDto` in `talimBE-V2/src/modules/user/service/parents.service.ts`.
 * Note the two ids a child carries — they are not interchangeable:
 *
 * - `childId` is the **Student record** `_id`. Payments, results and the
 *   monthly attendance calendar are all keyed on this one.
 * - `childUserId` is the child's **User** `_id`. Chat and leave requests
 *   resolve either, but some routes only accept the record id.
 *
 * Passing the wrong one produces a 404 that looks like missing data, so always
 * take the id from {@link childRecordId}.
 */

/** The nested user document the API populates onto a child. */
export interface ChildUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  userAvatar?: string;
}

/**
 * The class document `toChildDto` attaches as `classIdLegacy`. Only the part
 * the timetable's class-teacher fallback reads is typed; `classTeacherId` is a
 * populated teacher record on some routes and a bare id on others.
 */
export interface LegacyClass {
  name?: string;
  classTeacherId?: string | { userId?: ChildUser; firstName?: string; lastName?: string } | null;
}

/** One child linked to the signed-in parent. */
export interface ParentChild {
  /** Student record id — what every child-scoped endpoint expects. */
  childId?: string;
  /** The child's User id. */
  childUserId?: string;
  /** Present on children normalised from older shapes; same value as `childId`. */
  _id?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  classId?: string;
  className?: string;
  grade?: string;
  schoolId?: string;
  schoolName?: string;
  isActive?: boolean;
  isDefault?: boolean;
  attendancePercentage?: number;
  currentGradeSummary?: string;
  subjectsCount?: number;
  teachersCount?: number;
  userId?: ChildUser;
  classIdLegacy?: LegacyClass;
}

/**
 * The Student record id for a child, whichever shape the child arrived in.
 *
 * @param child - The child, or nothing.
 * @returns The record id, or `undefined` when no child is selected.
 */
export function childRecordId(child: ParentChild | null | undefined): string | undefined {
  return child?.childId ?? child?._id ?? undefined;
}

/**
 * A child's display name, falling back to the populated user document.
 *
 * @param child - The child, or nothing.
 * @returns The full name, or an empty string.
 */
export function childFullName(child: ParentChild | null | undefined): string {
  if (!child) return '';
  const first = child.firstName ?? child.userId?.firstName ?? '';
  const last = child.lastName ?? child.userId?.lastName ?? '';
  return `${first} ${last}`.trim();
}
