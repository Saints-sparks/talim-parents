/**
 * The learner view seen by a parent, per child (Part B: B1, B2, B6), as the
 * generated contract describes it.
 */
import type { Schema } from '../apiContract';

/** A bell period. */
export type Period = Schema<'PeriodDto'>;

/** A timetabled lesson as a student or parent sees it (B2). `colourKey` is a course index. */
export type StudentLesson = Schema<'StudentLessonDto'>;

/** A lesson on the dashboard (B1): a {@link StudentLesson} plus where it stands now. */
export type TodayLesson = Schema<'TodayStudentLessonDto'>;

/** Where a lesson stands today. */
export type LessonState = TodayLesson['state'];

/** Something on the parent dashboard that needs a decision or a payment. */
export type AttentionItem = Schema<'ParentAttentionDto'>;

/** A subject's running total this term, for the dashboard bars. */
export type SubjectTotal = Schema<'SubjectTotalDto'>;

/** An assessment or calendar event in the next three weeks (B1). */
export type ComingUpItem = Schema<'ComingUpDto'>;

/** One unread notification on the dashboard (B1 `feed`). */
export type FeedItem = Schema<'FeedItemDto'>;

/** `GET /parents/me/children/:childId/dashboard` (B1, parent variant). */
export type ParentDashboard = Schema<'ParentDashboardDto'>;

/** One day header of the week view. */
export type TimetableDay = Schema<'WeekDayDto'>;

/** A subject of the child's timetable, with its colour (B2). */
export type TimetableSubject = Schema<'TimetableSubjectDto'>;

/** `GET /parents/me/children/:childId/timetable?weekStart=` (B2). */
export type ChildTimetable = Schema<'LearnerTimetableDto'>;

/** How one school day was marked (B6). */
export type AttendanceDayStatus = Schema<'AttendanceDayDto'>['status'];

/** `GET /parents/me/children/:childId/attendance?month=YYYY-MM` (B6). */
export type ChildAttendance = Schema<'LearnerAttendanceDto'>;
