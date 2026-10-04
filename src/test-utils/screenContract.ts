/**
 * What each parent screen reads from the API, as runtime rules, and how each
 * screen loads it: through the app's own services and API client, so the
 * envelope unwrap and the `X-Talim-Child` header are part of what is checked.
 *
 * Two tests run these checks:
 * - `src/test-utils/__tests__/screenContract.test.ts`, always, against the dev
 *   fixtures (the fixtures must keep matching the generated shapes);
 * - `src/__live__/contract.live.test.ts`, with `LIVE_API=1`, against a running
 *   API (see that file for how to run it).
 */
import { ApiError } from '../lib/apiError';
import { getChildren } from '../services/portal/children';
import {
  getChildAttendance,
  getChildDashboard,
  getChildLeave,
  getChildSchool,
  getChildTimetable,
  getReportCard,
  getReportTerms,
} from '../services/portal/learner';
import { getChatContacts } from '../services/portal/messages';
import { getNotificationCounts, getNotificationFeed } from '../services/portal/notifications';
import { getBankDetails, getChildProviders, getFamilyFees, getParentReceipts, getPaymentHistory } from '../services/portal/payments';
import { getChatPrivacy, getPasswordPolicy, getSessions } from '../services/portal/account';
import { getParentSettings, type ParentSettings } from '../services/settings.services';
import { CHILD_HEADER } from '../lib/apiClient';
import type { PaymentProvider } from '../types/payments';
import type { ChildSummary } from '../types/portal/children';
import type { ClassRef, GradeBand, LearnerTerm, PageMeta, PortalTarget, Position, SchoolRef, TermLabel } from '../types/portal/common';
import type {
  AttentionItem,
  ChildAttendance,
  ChildTimetable,
  ComingUpItem,
  FeedItem,
  ParentDashboard,
  Period,
  StudentLesson,
  SubjectTotal,
  TimetableDay,
  TimetableSubject,
  TodayLesson,
} from '../types/portal/learner';
import type { ChildLeave, LeaveRequest } from '../types/portal/leave';
import type { ChatContact } from '../types/portal/messages';
import type { CategoryCount, NotificationCounts, RawPortalNotification } from '../types/portal/notifications';
import type {
  BankDetails,
  ChildFees,
  FamilyFees,
  FeeItem,
  HistoryPage,
  ParentReceipt,
  PaymentHistoryRow,
  ReceiptList,
} from '../types/portal/payments';
import type { ReportCard, ReportColumn, ReportHighlight, ReportRow, ReportTerm } from '../types/portal/reportCard';
import type { AuthSession, ChatPrivacy, PasswordPolicy, SchoolContact } from '../types/portal/school';
import { arrayOf, nullable, oneOf, optional, shape, type Rule } from './shape';

// ── Building blocks ──────────────────────────────────────────────────────

const ID_NAME = shape<ClassRef>({ id: 'string', name: 'string' });
const POSITION = shape<Position>({ rank: 'number', of: 'number' });
const LEARNER_TERM = shape<LearnerTerm>({
  id: 'string',
  name: 'string',
  session: nullable('string'),
  startDate: 'string',
  endDate: 'string',
  totalWeeks: 'number',
  isCurrent: 'boolean',
});
const TERM_LABEL = shape<TermLabel>({ id: 'string', name: 'string', session: nullable('string') });
const PERIOD = shape<Period>({ key: 'string', label: 'string', startTime: 'string', endTime: 'string', isBreak: 'boolean' });
const COURSE = shape<StudentLesson['course']>({ id: 'string', code: 'string', title: 'string' });

const LESSON_FIELDS = {
  id: 'string',
  date: 'string',
  day: 'string',
  periodKey: nullable('string'),
  startTime: 'string',
  endTime: 'string',
  course: COURSE,
  subject: nullable(ID_NAME),
  class: ID_NAME,
  classRoomId: nullable('string'),
  room: nullable('string'),
  teacher: nullable(ID_NAME),
  topic: 'unknown',
  cancelled: 'unknown',
  courseShort: 'string',
  colourKey: 'number',
  offSchedule: 'boolean',
} as const satisfies { [K in keyof StudentLesson]?: Rule };

const LESSON = shape<StudentLesson>(LESSON_FIELDS);
const TODAY_LESSON = shape<TodayLesson>({ ...LESSON_FIELDS, state: oneOf('done', 'now', 'later'), minutesLeft: nullable('number') });

const TARGET = shape<PortalTarget>({ page: 'string' });
const FEED_ITEM = shape<FeedItem>({
  id: 'string',
  title: 'string',
  message: 'string',
  category: 'string',
  createdAt: 'string',
  isRead: 'boolean',
  senderName: nullable('string'),
  target: nullable(TARGET),
  actionLabel: nullable('string'),
  school: optional(nullable(ID_NAME)),
});

// ── Children and the dashboard (B13, B1) ─────────────────────────────────

/** `GET /parents/me/children`: the switcher, the child cards. */
export const CHILD_SUMMARY = shape<ChildSummary>({
  id: 'string',
  name: 'string',
  admissionNumber: nullable('string'),
  class: nullable(ID_NAME),
  school: shape<SchoolRef>({ id: 'string', name: 'string', city: optional(nullable('string')) }),
  attendanceRate: nullable('number'),
  average: nullable('number'),
  averageGrade: nullable('string'),
  gradeLevel: nullable('string'),
  position: nullable(POSITION),
  outstanding: 'number',
  isDefault: 'boolean',
  relationship: nullable(oneOf('MOTHER', 'FATHER', 'GUARDIAN', 'OTHER')),
  avatarUrl: nullable('string'),
});

/** `GET /parents/me/children/:childId/dashboard`. */
export const DASHBOARD = shape<ParentDashboard>({
  date: 'string',
  day: 'string',
  now: 'string',
  timezone: 'string',
  greeting: oneOf('morning', 'afternoon', 'evening'),
  class: ID_NAME,
  term: nullable(LEARNER_TERM),
  weekNumber: nullable('number'),
  schoolDay: shape<ParentDashboard['schoolDay']>({
    isSchoolDay: 'boolean',
    reason: oneOf(null, 'weekend', 'holiday', 'no_term'),
    holidayTitle: nullable('string'),
    endsEarlyAt: nullable('string'),
  }),
  periods: arrayOf(PERIOD),
  lessons: arrayOf(TODAY_LESSON),
  nowLessonId: nullable('string'),
  nextLessonId: nullable('string'),
  glance: shape<ParentDashboard['glance']>({
    average: nullable('number'),
    grade: nullable('string'),
    position: nullable(POSITION),
    movement: nullable('number'),
    attendance: shape<ParentDashboard['glance']['attendance']>({ rate: nullable('number'), present: 'number', schoolDays: 'number' }),
    unread: shape<ParentDashboard['glance']['unread']>({ count: 'number', topRoom: nullable(ID_NAME) }),
  }),
  subjectTotals: arrayOf(
    shape<SubjectTotal>({ courseId: 'string', title: 'string', short: 'string', percent: nullable('number'), classAverage: nullable('number'), colourKey: 'number' }),
  ),
  comingUp: arrayOf(
    shape<ComingUpItem>({ kind: oneOf('assessment', 'event'), id: 'string', title: 'string', courseTitle: nullable('string'), date: 'string', daysAway: 'number' }),
  ),
  feed: arrayOf(FEED_ITEM),
  counts: shape<ParentDashboard['counts']>({ unreadNotifications: 'number', unreadMessages: 'number' }),
  attention: arrayOf(
    shape<AttentionItem>({
      kind: oneOf('fees', 'attendance', 'leave', 'report'),
      title: 'string',
      meta: 'string',
      target: shape<AttentionItem['target']>({ page: oneOf('payments', 'attendance', 'leave', 'results'), termId: optional('string'), date: optional('string') }),
    }),
  ),
  fees: shape<ParentDashboard['fees']>({ outstanding: 'number', dueDate: nullable('string') }),
  passMark: 'number',
});

// ── Timetable, attendance, results (B2, B6, B5) ──────────────────────────

/** `GET /parents/me/children/:childId/timetable`. */
export const TIMETABLE = shape<ChildTimetable>({
  term: nullable(LEARNER_TERM),
  week: shape<ChildTimetable['week']>({
    number: nullable('number'),
    start: 'string',
    end: 'string',
    isCurrent: 'boolean',
    prevStart: 'string',
    nextStart: 'string',
    inTerm: 'boolean',
  }),
  days: arrayOf(
    shape<TimetableDay>({
      date: 'string',
      day: 'string',
      isToday: 'boolean',
      holiday: nullable(shape<NonNullable<TimetableDay['holiday']>>({ title: 'string' })),
      endsEarlyAt: nullable('string'),
      events: arrayOf(shape<TimetableDay['events'][number]>({ id: 'string', title: 'string', type: oneOf('holiday', 'event', 'early_close') })),
    }),
  ),
  periods: arrayOf(PERIOD),
  periodsSource: oneOf('school', 'derived'),
  lessons: arrayOf(LESSON),
  subjects: arrayOf(
    shape<TimetableSubject>({ courseId: 'string', title: 'string', short: 'string', colourKey: 'number', teacher: nullable(ID_NAME) }),
  ),
  timezone: 'string',
  now: 'string',
  today: 'string',
});

/** `GET /parents/me/children/:childId/attendance?month=` (with `days`). */
export const ATTENDANCE_MONTH = shape<ChildAttendance>({
  term: nullable(LEARNER_TERM),
  class: ID_NAME,
  rate: nullable('number'),
  band: oneOf('on_track', 'watch'),
  schoolDays: 'number',
  present: 'number',
  late: 'number',
  absent: 'number',
  onLeave: 'number',
  days: arrayOf(
    shape<NonNullable<ChildAttendance['days']>[number]>({
      date: 'string',
      status: oneOf('present', 'late', 'absent', 'on_leave', 'unmarked', 'holiday', 'weekend'),
    }),
  ),
});

/** One entry of `GET .../report-card/terms`. */
export const REPORT_TERM = shape<ReportTerm>({
  id: 'string',
  name: 'string',
  session: nullable('string'),
  status: oneOf('none', 'partial', 'published'),
  isCurrent: 'boolean',
  startDate: 'string',
  endDate: 'string',
});

const HIGHLIGHT = shape<ReportHighlight>({
  courseId: 'string',
  title: 'string',
  short: 'string',
  colourKey: 'number',
  percent: 'number',
  position: nullable(POSITION),
});

/** `GET /parents/me/children/:childId/report-card?termId=`. */
export const REPORT_CARD = shape<ReportCard>({
  status: oneOf('none', 'partial', 'published'),
  issuedAt: nullable('string'),
  school: shape<ReportCard['school']>({ name: 'string', logoUrl: nullable('string'), address: nullable('string'), phone: nullable('string'), email: nullable('string') }),
  student: shape<ReportCard['student']>({ name: 'string', admissionNumber: nullable('string'), class: ID_NAME }),
  term: LEARNER_TERM,
  session: nullable('string'),
  nextTermStart: nullable('string'),
  columns: arrayOf(shape<ReportColumn>({ id: 'string', name: 'string', maxScore: 'number' })),
  rows: arrayOf(
    shape<ReportRow>({
      course: shape<ReportRow['course']>({ id: 'string', code: 'string', title: 'string', short: 'string', colourKey: 'number' }),
      teacher: nullable(ID_NAME),
      scores: nullable(arrayOf(nullable('number'))),
      total: nullable('number'),
      percent: nullable('number'),
      grade: nullable('string'),
      position: nullable(POSITION),
      classAverage: nullable('number'),
    }),
  ),
  overall: shape<ReportCard['overall']>({ percent: nullable('number'), grade: nullable('string'), position: nullable(POSITION), previousPosition: nullable(POSITION) }),
  strongest: nullable(HIGHLIGHT),
  weakest: nullable(HIGHLIGHT),
  scale: arrayOf(shape<GradeBand>({ letter: 'string', min: 'number', remark: nullable('string') })),
  attendance: shape<ReportCard['attendance']>({ schoolDays: 'number', present: 'number', late: 'number', absent: 'number', excused: 'number' }),
  remarks: nullable(shape<NonNullable<ReportCard['remarks']>>({ classTeacher: nullable('string'), principal: nullable('string'), classTeacherName: nullable('string') })),
  acknowledgedAt: nullable('string'),
  passMark: 'number',
});

// ── Leave, school, messages, notifications (B9, B12, B10, B11) ───────────

/** `GET /parents/me/children/:childId/leave`. */
export const CHILD_LEAVE = shape<ChildLeave>({
  countThisSession: 'number',
  requests: arrayOf(
    shape<LeaveRequest>({
      id: 'string',
      type: oneOf('illness', 'medical', 'family_travel', 'religious', 'other'),
      startDate: 'string',
      endDate: 'string',
      days: 'number',
      note: nullable('string'),
      status: oneOf('pending', 'approved', 'declined'),
      decidedBy: nullable(shape<NonNullable<LeaveRequest['decidedBy']>>({ name: 'string' })),
      decidedAt: nullable('string'),
      declineReason: nullable('string'),
      createdAt: 'string',
    }),
  ),
});

/** `GET /parents/me/children/:childId/school`. */
export const SCHOOL_CONTACT = shape<SchoolContact>({
  name: 'string',
  phone: nullable('string'),
  email: nullable('string'),
  address: nullable('string'),
  officeHours: nullable(shape<NonNullable<SchoolContact['officeHours']>>({ start: 'string', end: 'string' })),
});

/** `GET /chat/contacts?childId=`. */
export const CONTACT = shape<ChatContact>({
  userId: 'string',
  name: 'string',
  role: oneOf('teacher', 'school_admin'),
  avatarUrl: nullable('string'),
  subtitle: 'string',
  group: oneOf('class_teacher', 'teacher', 'office'),
  phone: nullable('string'),
});

/** `GET /notifications?childId=` (the list keeps `_id` and `metadata`). */
export const NOTIFICATION_PAGE = shape<{ data: RawPortalNotification[]; meta: PageMeta }>({
  data: arrayOf(
    shape<RawPortalNotification>({
      _id: 'string',
      title: 'string',
      message: 'string',
      category: 'string',
      createdAt: 'string',
      isRead: 'boolean',
      school: optional(nullable(shape<SchoolRef>({ id: 'string', name: 'string' }))),
      metadata: optional(shape<NonNullable<RawPortalNotification['metadata']>>({ childId: optional('unknown'), target: optional(TARGET), actionLabel: optional('string') })),
    }),
  ),
  meta: shape<PageMeta>({ total: 'number', page: 'number', lastPage: 'number', limit: 'number' }),
});

const CATEGORY_COUNT = shape<CategoryCount>({ all: 'number', unread: 'number' });

/** `GET /notifications/counts?childId=`: every category present. */
export const COUNTS = shape<NotificationCounts>({
  all: 'number',
  unread: 'number',
  byCategory: shape<NotificationCounts['byCategory']>({
    announcement: CATEGORY_COUNT,
    attendance: CATEGORY_COUNT,
    academics: CATEGORY_COUNT,
    grading: CATEGORY_COUNT,
    resources: CATEGORY_COUNT,
    messages: CATEGORY_COUNT,
    account: CATEGORY_COUNT,
    payments: CATEGORY_COUNT,
    leave: CATEGORY_COUNT,
    other: CATEGORY_COUNT,
  }),
});

// ── Payments (C2–C7) ─────────────────────────────────────────────────────

const FEE_ITEM = shape<FeeItem>({
  id: 'string',
  label: 'string',
  category: 'string',
  dueDate: nullable('string'),
  amount: 'number',
  paid: 'number',
  balance: 'number',
  status: oneOf('paid', 'part_paid', 'overdue', 'due'),
  allowPartial: 'boolean',
  parts: arrayOf(shape<FeeItem['parts'][number]>({ label: 'string', amount: 'number' })),
  pendingPayment: 'boolean',
  termId: nullable('string'),
  lateFee: 'number',
});

/** `GET /payments/parent/fees`: every child's bill. */
export const FAMILY_FEES = shape<FamilyFees>({
  children: arrayOf(
    shape<ChildFees>({
      child: shape<ChildFees['child']>({ id: 'string', name: 'string', school: nullable(ID_NAME) }),
      outstanding: 'number',
      paid: 'number',
      billTotal: 'number',
      overdue: 'number',
      items: arrayOf(FEE_ITEM),
      minimumPartPayment: 'number',
      term: nullable(TERM_LABEL),
    }),
  ),
  totals: shape<FamilyFees['totals']>({ outstanding: 'number', paidThisSession: 'number', receipts: 'number', overdue: 'number' }),
});

/** `GET /payments/parent/providers` (filtered to the enabled ones). */
export const PROVIDERS = arrayOf(
  shape<PaymentProvider>({ providerName: oneOf('paystack', 'opay', 'stripe'), isEnabled: 'boolean', supportedChannels: arrayOf('string'), currency: 'string' }),
);

/** `GET /payments/parent/bank-details?childId=`; `null` when the school has no account (404). */
export const BANK_DETAILS = nullable(shape<BankDetails>({ bankName: 'string', accountName: 'string', accountNumber: 'string', school: nullable(ID_NAME) }));

/** `GET /payments/parent/history?childId=`. */
export const HISTORY_PAGE = shape<HistoryPage>({
  total: 'number',
  page: 'number',
  limit: 'number',
  data: arrayOf(
    shape<PaymentHistoryRow>({
      id: 'string',
      date: 'string',
      child: ID_NAME,
      items: arrayOf(shape<PaymentHistoryRow['items'][number]>({ feeAssignmentId: 'string', label: 'string', amount: nullable('number') })),
      amount: 'number',
      method: 'string',
      methodKind: oneOf('online', 'manual', 'bank_transfer'),
      reference: 'string',
      status: oneOf('pending', 'successful', 'failed', 'cancelled', 'refunded', 'partial'),
      receiptId: nullable('string'),
      bankTransfer: optional(
        nullable(shape<NonNullable<PaymentHistoryRow['bankTransfer']>>({ transferReference: optional('string'), rejectionReason: optional('string') })),
      ),
    }),
  ),
});

/** `GET /payments/parent/receipts?childId=`. */
export const RECEIPT_LIST = shape<ReceiptList>({
  total: 'number',
  page: 'number',
  limit: 'number',
  terms: arrayOf(TERM_LABEL),
  data: arrayOf(
    shape<ParentReceipt>({
      id: 'string',
      receiptNumber: 'string',
      totalPaid: 'number',
      subtotal: 'number',
      lateFee: 'number',
      discount: 'number',
      currency: 'string',
      paymentMethod: 'string',
      paymentProvider: 'string',
      transactionReference: 'string',
      paymentDate: 'string',
      issuedAt: 'string',
      status: oneOf('issued', 'voided'),
      school: nullable(shape<NonNullable<ParentReceipt['school']>>({ id: 'string', name: 'string', logo: 'string', address: 'string' })),
      child: ID_NAME,
      term: nullable(TERM_LABEL),
      items: arrayOf(shape<ParentReceipt['items'][number]>({ feeAssignmentId: nullable('string'), label: 'string', category: 'string', amount: 'number' })),
      downloadAllowed: 'boolean',
    }),
  ),
});

// ── The parent's account (Settings) ──────────────────────────────────────

/** `GET /parent/settings`: profile, the C7 choice and the tour stamp. */
export const SETTINGS = shape<ParentSettings>({
  profile: shape<ParentSettings['profile']>({ id: 'string', fullName: 'string', email: 'string', occupation: optional(nullable('string')), address: optional(nullable('string')) }),
  preferences: shape<ParentSettings['preferences']>({
    theme: oneOf('light', 'dark', 'system'),
    preferredProvider: nullable(oneOf('paystack', 'opay', 'stripe', 'bank_transfer')),
    guides: shape<NonNullable<ParentSettings['preferences']['guides']>>({ tourCompletedAt: nullable('string') }),
  }),
});

/** `GET /chat/preferences` (the Privacy tab's switches). */
export const CHAT_PRIVACY = shape<ChatPrivacy>({ showOnlineStatus: 'boolean', readReceipts: 'boolean', messagePreview: 'boolean' });

/** `GET /auth/sessions`. */
export const SESSIONS = arrayOf(
  shape<AuthSession>({
    id: 'string',
    device: nullable('string'),
    browser: nullable('string'),
    os: nullable('string'),
    ip: nullable('string'),
    lastUsedAt: 'string',
    createdAt: 'string',
    current: 'boolean',
  }),
);

/** `GET /auth/password-policy`. */
export const PASSWORD_POLICY = shape<PasswordPolicy>({
  minLength: 'number',
  requireUppercase: 'boolean',
  requireLowercase: 'boolean',
  requireNumber: 'boolean',
  requireSymbol: 'boolean',
  historyCount: 'number',
});

// ── The checks ───────────────────────────────────────────────────────────

/** One screen's data, loaded the way the screen loads it. */
export interface ScreenCheck {
  /** "Dashboard", "Payments · history"… */
  screen: string;
  rule: Rule;
  load: (childId: string) => Promise<unknown>;
}

/**
 * Null for a 404 (a state the screen shows, such as "no bank account"),
 * else the answer; any other error is rethrown.
 *
 * @param request - The call.
 * @returns The answer, or null on 404.
 */
async function orNullOn404<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** The month the attendance check asks for. */
const thisMonth = (): string => new Date().toISOString().slice(0, 7);

/** Checks run once for the family. */
export const FAMILY_CHECKS: ScreenCheck[] = [
  { screen: 'Child switcher (children)', rule: arrayOf(CHILD_SUMMARY), load: () => getChildren() },
  { screen: 'Payments (family fees)', rule: FAMILY_FEES, load: () => getFamilyFees() },
  { screen: 'Settings (parent settings)', rule: SETTINGS, load: () => getParentSettings() },
  { screen: 'Settings · privacy', rule: CHAT_PRIVACY, load: () => getChatPrivacy() },
  { screen: 'Settings · security (sessions)', rule: SESSIONS, load: () => getSessions() },
  { screen: 'Password rules', rule: PASSWORD_POLICY, load: () => getPasswordPolicy() },
];

/** Checks run for every linked child. */
export const CHILD_CHECKS: ScreenCheck[] = [
  { screen: 'Dashboard', rule: DASHBOARD, load: (id) => getChildDashboard(id) },
  { screen: 'Timetable', rule: TIMETABLE, load: (id) => getChildTimetable(id) },
  { screen: 'Attendance (month)', rule: ATTENDANCE_MONTH, load: (id) => getChildAttendance(id, thisMonth()) },
  { screen: 'Results (terms)', rule: arrayOf(REPORT_TERM), load: (id) => getReportTerms(id) },
  {
    screen: 'Results (report card)',
    // Null when the child has no report terms (a school without a current term).
    rule: nullable(REPORT_CARD),
    load: async (id) => {
      const terms = await getReportTerms(id);
      const term = terms.find((entry) => entry.isCurrent) ?? terms[0];
      return term ? getReportCard(id, term.id) : null;
    },
  },
  { screen: 'Leave', rule: CHILD_LEAVE, load: (id) => getChildLeave(id) },
  { screen: 'Settings · help (school contact)', rule: SCHOOL_CONTACT, load: (id) => getChildSchool(id) },
  { screen: 'Messages (contacts)', rule: arrayOf(CONTACT), load: (id) => getChatContacts(id) },
  { screen: 'Notifications (feed)', rule: NOTIFICATION_PAGE, load: (id) => getNotificationFeed({ childId: id, limit: 20 }) },
  { screen: 'Notifications (counts)', rule: COUNTS, load: (id) => getNotificationCounts(id) },
  { screen: 'Payments · checkout (providers)', rule: PROVIDERS, load: (id) => getChildProviders(id) },
  { screen: 'Payments · bank transfer (account)', rule: BANK_DETAILS, load: (id) => orNullOn404(getBankDetails(id)) },
  { screen: 'Payments · history', rule: HISTORY_PAGE, load: (id) => getPaymentHistory({ childId: id, page: 1, limit: 10 }) },
  { screen: 'Payments · receipts', rule: RECEIPT_LIST, load: (id) => getParentReceipts({ childId: id }) },
];

/** A request as a test saw it leave the client. */
export interface SeenRequest {
  path: string;
  query: string;
  headers: Record<string, string>;
}

/**
 * Requests whose child header disagrees with the child they are about: the
 * `:childId` in a `/parents/me/children/:childId/...` path, else the
 * `childId` query of a child-scoped route. A path-scoped request without the
 * header counts too.
 *
 * @param requests - What the client sent.
 * @returns A message per disagreement; empty when every request agrees.
 */
export function childHeaderMismatches(requests: readonly SeenRequest[]): string[] {
  const problems: string[] = [];
  for (const request of requests) {
    const header = Object.entries(request.headers).find(([name]) => name.toLowerCase() === CHILD_HEADER.toLowerCase())?.[1];
    const fromPath = /^\/parents\/me\/children\/([^/]+)\/.+/.exec(request.path)?.[1];
    const fromQuery = new URLSearchParams(request.query).get('childId');
    if (fromPath && header !== fromPath) problems.push(`${request.path}: ${CHILD_HEADER} is ${header ?? 'missing'}, path child is ${fromPath}`);
    else if (!fromPath && header && fromQuery && header !== fromQuery) problems.push(`${request.path}${request.query}: ${CHILD_HEADER} ${header} != childId ${fromQuery}`);
  }
  return problems;
}
