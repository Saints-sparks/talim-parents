import { describe, expect, it } from 'vitest';
import { formatTeacherName, isUnassignedTeacher, normalizeTimetableTeachers } from '../timetableTeachers';
import type { ChildTimetable, TimetableSlot } from '../../../services/parent.services';
import type { ParentChild } from '../../../types/parent';

const CHILD: ParentChild = { childId: 'c1', firstName: 'Amara' };

/** A class slot, overridable per test. */
function slot(overrides: Partial<TimetableSlot> = {}): TimetableSlot {
  return {
    day: 'Monday',
    startTime: '08:00',
    endTime: '08:45',
    subjectName: 'Mathematics',
    teacherName: 'Unassigned teacher',
    room: 'JSS 1',
    type: 'class',
    ...overrides,
  };
}

/** A timetable around some slots, overridable per test. */
function timetable(slots: TimetableSlot[], classTeacher?: string, legacyTeacher?: ParentChild['classIdLegacy']): ChildTimetable {
  return {
    child: { ...CHILD, classIdLegacy: legacyTeacher },
    weekRange: { start: '2026-09-14', end: '2026-09-19' },
    weekDays: ['Monday'],
    timetableSlots: slots,
    todaySchedule: slots,
    listView: [{ day: 'Monday', date: '2026-09-14', classes: slots }],
    classInformation: { classTeacher, schoolName: 'Bright Star' },
  };
}

describe('isUnassignedTeacher', () => {
  it('treats empty and the API placeholder as nobody', () => {
    expect(isUnassignedTeacher('')).toBe(true);
    expect(isUnassignedTeacher(undefined)).toBe(true);
    expect(isUnassignedTeacher('  Unassigned Teacher ')).toBe(true);
    expect(isUnassignedTeacher('Mrs Bello')).toBe(false);
  });
});

describe('formatTeacherName', () => {
  it('reads a populated teacher through their user record or directly', () => {
    expect(formatTeacherName({ userId: { firstName: 'Ada', lastName: 'Bello' } })).toBe('Ada Bello');
    expect(formatTeacherName({ firstName: 'Ada', lastName: 'Bello' })).toBe('Ada Bello');
  });

  it('never prints a bare ObjectId as a name', () => {
    expect(formatTeacherName('65d0000000000000000000c1')).toBe('');
    expect(formatTeacherName('Mrs Bello')).toBe('Mrs Bello');
    expect(formatTeacherName(null)).toBe('');
  });
});

describe('normalizeTimetableTeachers', () => {
  it("puts the class teacher on slots the API left 'Unassigned teacher'", () => {
    const result = normalizeTimetableTeachers(timetable([slot()], 'Mrs Bello'), CHILD);
    expect(result.timetableSlots[0].teacherName).toBe('Mrs Bello');
    expect(result.todaySchedule[0].teacherName).toBe('Mrs Bello');
    expect(result.listView[0].classes[0].teacherName).toBe('Mrs Bello');
    expect(result.classInformation.classTeacher).toBe('Mrs Bello');
  });

  it('leaves a real subject teacher alone', () => {
    const result = normalizeTimetableTeachers(timetable([slot({ teacherName: 'Mr Okoro' })], 'Mrs Bello'), CHILD);
    expect(result.timetableSlots[0].teacherName).toBe('Mr Okoro');
  });

  it('leaves the break alone', () => {
    const breakSlot = slot({ day: 'all', type: 'break', title: 'Break Time', teacherName: undefined, subjectName: undefined });
    const result = normalizeTimetableTeachers(timetable([breakSlot], 'Mrs Bello'), CHILD);
    expect(result.timetableSlots[0].teacherName).toBeUndefined();
  });

  it('falls back to the class document when the timetable names no class teacher', () => {
    const legacy = { classTeacherId: { userId: { firstName: 'Ada', lastName: 'Bello' } } };
    const result = normalizeTimetableTeachers(timetable([slot()], undefined, legacy), CHILD);
    expect(result.timetableSlots[0].teacherName).toBe('Ada Bello');
  });

  it('keeps the API value when there is nothing better', () => {
    const result = normalizeTimetableTeachers(timetable([slot()], 'Unassigned teacher'), CHILD);
    expect(result.timetableSlots[0].teacherName).toBe('Unassigned teacher');
  });

  it('does not mutate its input', () => {
    const input = timetable([slot()], 'Mrs Bello');
    normalizeTimetableTeachers(input, CHILD);
    expect(input.timetableSlots[0].teacherName).toBe('Unassigned teacher');
  });
});
