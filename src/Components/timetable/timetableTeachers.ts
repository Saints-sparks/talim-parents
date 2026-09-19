import type { ChildTimetable, TimetableSlot } from '../../services/parent.services';
import type { ParentChild } from '../../types/parent';

type TeacherRef = NonNullable<NonNullable<ParentChild['classIdLegacy']>['classTeacherId']>;

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * True when a teacher name is really "nobody": empty, or the API's own
 * "Unassigned teacher" placeholder.
 *
 * @param teacherName - The name on a slot.
 * @returns Whether to look for a better one.
 */
export const isUnassignedTeacher = (teacherName: string | undefined | null): boolean =>
  !teacherName || String(teacherName).trim().toLowerCase() === 'unassigned teacher';

/**
 * A teacher record (populated, or a bare name/id) as a display name. A bare id
 * is never shown: an unpopulated `classTeacherId` is an ObjectId, and printing
 * it would put a 24-character hash where a name belongs.
 *
 * @param teacher - The teacher reference from the class document.
 * @returns The name, or an empty string.
 */
export function formatTeacherName(teacher: TeacherRef | null | undefined): string {
  if (!teacher) return '';
  if (typeof teacher === 'string') return OBJECT_ID.test(teacher) ? '' : teacher;
  const person = teacher.userId ?? teacher;
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
}

/**
 * The class teacher's name: the timetable's own class information first,
 * otherwise whatever the class document says.
 *
 * @param timetable - The API's timetable.
 * @param child - The selected child.
 * @returns The name, or an empty string.
 */
export function getClassTeacherName(timetable: ChildTimetable, child: ParentChild | null | undefined): string {
  const fromInfo = timetable.classInformation?.classTeacher;
  if (fromInfo && !isUnassignedTeacher(fromInfo)) return fromInfo;
  return (
    formatTeacherName(timetable.child?.classIdLegacy?.classTeacherId) ||
    formatTeacherName(child?.classIdLegacy?.classTeacherId)
  );
}

/**
 * Puts the class teacher on any class slot the API left "Unassigned teacher".
 * Breaks are left alone.
 *
 * @param timetable - The API's timetable for the week.
 * @param child - The selected child.
 * @returns The same timetable with teacher names filled in.
 */
export function normalizeTimetableTeachers(timetable: ChildTimetable, child: ParentChild | null | undefined): ChildTimetable {
  const fallback = getClassTeacherName(timetable, child);
  const fill = (slot: TimetableSlot): TimetableSlot => ({
    ...slot,
    teacherName:
      slot.type === 'break'
        ? slot.teacherName
        : isUnassignedTeacher(slot.teacherName) && fallback
          ? fallback
          : slot.teacherName,
  });

  return {
    ...timetable,
    timetableSlots: (timetable.timetableSlots ?? []).map(fill),
    todaySchedule: (timetable.todaySchedule ?? []).map(fill),
    listView: (timetable.listView ?? []).map((day) => ({ ...day, classes: (day.classes ?? []).map(fill) })),
    classInformation: {
      ...timetable.classInformation,
      classTeacher: fallback || timetable.classInformation?.classTeacher,
    },
  };
}
