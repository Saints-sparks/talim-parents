import type { ChildTimetable, StudentLesson } from '../../../types/portal/learner';

/**
 * Indexes the week's lessons by day and period in one pass (a Map, so each
 * cell is a lookup, not a scan). A lesson without a period key is matched to
 * the period that starts when it does.
 *
 * @param timetable - The week (B2).
 * @returns `date|periodKey` to lesson.
 */
export function lessonIndex(timetable: ChildTimetable): Map<string, StudentLesson> {
  const byStart = new Map(timetable.periods.map((period) => [period.startTime, period.key]));
  const index = new Map<string, StudentLesson>();
  for (const lesson of timetable.lessons) {
    const key = lesson.periodKey ?? byStart.get(lesson.startTime);
    if (key) index.set(`${lesson.date}|${key}`, lesson);
  }
  return index;
}
