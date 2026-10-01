/**
 * The learner view seen by a parent, per child (Part B: B1, B2, B6). Hand-written;
 * see `./common.ts` for how to swap these for the generated contract.
 */
import type { ClassRef, Position, PortalTarget, TermRef } from './common';
import type { RawPortalNotification } from './notifications';

/** A bell period (`/timetable/me` shape, teachers round 1). */
export interface Period {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

/** A timetabled lesson as a student or parent sees it (B: `StudentLesson`). */
export interface StudentLesson {
  id: string;
  date: string;
  day: string;
  periodKey: string | null;
  startTime: string;
  endTime: string;
  course: { id: string; code: string | null; title: string };
  subject: { id: string; name: string } | null;
  class: ClassRef;
  classRoomId: string | null;
  room: string | null;
  topic: { week: number; topic: string; objectives?: string | null; taughtAt: string | null } | null;
  cancelled: { reason: string } | null;
  teacher: { id: string; name: string } | null;
  courseShort: string | null;
  /** CONTRACT GAP on B1 lessons (B2 carries it in `subjects`): the subject colour. */
  colourKey?: string | null;
}

/** Where a lesson stands today. */
export type LessonState = 'done' | 'now' | 'later';

/** Something on the parent dashboard that needs a decision or a payment. */
export interface AttentionItem {
  kind: 'fees' | 'attendance' | 'leave' | 'report';
  title: string;
  meta: string;
  target: PortalTarget;
}

/** A subject's running total this term, for the dashboard bars. */
export interface SubjectTotal {
  courseId: string;
  title: string;
  short: string;
  percent: number | null;
  classAverage: number | null;
  /** CONTRACT GAP: B2 gives `colourKey` per subject; B1 does not. */
  colourKey?: string | null;
}

/**
 * `GET /parents/me/children/:childId/dashboard` (B1, parent variant).
 */
export interface ParentDashboard {
  date: string;
  day: string;
  now: string;
  timezone: string;
  greeting: 'morning' | 'afternoon' | 'evening';
  class: ClassRef | null;
  term: TermRef | null;
  weekNumber: number | null;
  schoolDay: {
    isSchoolDay: boolean;
    reason: null | 'weekend' | 'holiday' | 'no_term';
    holidayTitle: string | null;
    endsEarlyAt: string | null;
  };
  periods: Period[];
  lessons: (StudentLesson & { state: LessonState; minutesLeft: number | null })[];
  nowLessonId: string | null;
  nextLessonId: string | null;
  glance: {
    average: number | null;
    grade: string | null;
    position: Position | null;
    /** Rank change vs. the previous published term; positive is up. */
    movement: number | null;
    attendance: { rate: number | null; present: number; schoolDays: number };
    unread: { count: number; topRoom: { id: string; name: string } | null };
  };
  subjectTotals: SubjectTotal[];
  passMark: number;
  comingUp: {
    kind: 'assessment' | 'event';
    id: string;
    title: string;
    courseTitle: string | null;
    date: string;
    daysAway: number;
  }[];
  /** The last five notifications. */
  feed: RawPortalNotification[];
  counts: { unreadNotifications: number; unreadMessages: number };
  attention: AttentionItem[];
  fees: { outstanding: number; dueDate: string | null };
}

/** One day header of the week view. */
export interface TimetableDay {
  date: string;
  day: string;
  isToday: boolean;
  holiday: { title: string } | null;
  endsEarlyAt: string | null;
  events: { id: string; title: string; type: string }[];
}

/** A subject of the child's timetable, with its colour (B2). */
export interface TimetableSubject {
  courseId: string;
  title: string;
  short: string;
  colourKey: string | null;
}

/** `GET /parents/me/children/:childId/timetable?weekStart=` (B2). */
export interface ChildTimetable {
  timezone: string;
  now: string;
  today: string;
  term: { id: string; name: string; startDate: string; endDate: string; totalWeeks: number } | null;
  week: {
    number: number | null;
    start: string;
    end: string;
    isCurrent: boolean;
    prevStart: string;
    nextStart: string;
    inTerm: boolean;
  };
  days: TimetableDay[];
  periods: Period[];
  periodsSource: 'school' | 'derived';
  lessons: StudentLesson[];
  subjects: TimetableSubject[];
}

/** How one school day was marked (B6). */
export type AttendanceDayStatus = 'present' | 'late' | 'absent' | 'on_leave' | 'unmarked' | 'holiday' | 'weekend';

/** `GET /parents/me/children/:childId/attendance?month=YYYY-MM` (B6). */
export interface ChildAttendance {
  term: TermRef | null;
  class: ClassRef | null;
  schoolDays: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  rate: number | null;
  /** `on_track` at 92% or more. */
  band: 'on_track' | 'watch';
  /** Returned when `month` is given. */
  days?: { date: string; status: AttendanceDayStatus }[];
}
