/**
 * The dev fixtures' route table: the Part B and C parent routes, plus the
 * account, auth, chat and notification routes the portal calls, answered from
 * the in-memory {@link FixtureDb}. Dev and test only.
 *
 * Child-scoped routes check `X-Talim-Child` more strictly than the server:
 * a missing header, or one that disagrees with the path's child, is a 400,
 * so a client that forgets the header fails loudly here instead of silently
 * reading the default child.
 */
import { CHILD_HEADER } from '../../lib/apiClient';
import type { Schema } from '../../types/apiContract';
import type { ChildSummary } from '../../types/portal/children';
import type { GradeBand, LearnerTerm } from '../../types/portal/common';
import type { AttendanceDayStatus, ChildAttendance, ChildTimetable, FeedItem, ParentDashboard, StudentLesson } from '../../types/portal/learner';
import type { LeaveType } from '../../types/portal/leave';
import type { ChatContact } from '../../types/portal/messages';
import type { RawPortalNotification } from '../../types/portal/notifications';
import type {
  BankDetails,
  BankTransferResponse,
  CheckoutResult,
  ChildFees,
  FeeItem,
  ParentReceipt,
  PaymentHistoryRow,
} from '../../types/portal/payments';
import type { ReportCard, ReportTerm } from '../../types/portal/reportCard';
import { feeAssignmentId, subjectScores, type FixtureDb, type LeaveRow, type TxnRow } from './db';
import { fail, ok, raw, type FixtureRequest, type FixtureRoute } from './router';
import {
  FEE_CATALOG,
  FIXTURE_NOW,
  FIXTURE_TODAY,
  LINK_CODES,
  LINKABLE_CHILD,
  PERIODS,
  SCHOOLS,
  SUBJECTS,
  TEACHERS,
  TERMS,
  WEEK_GRID,
  type SeedChild,
} from './seed';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const GRADE_SCALE: GradeBand[] = [
  { letter: 'A', min: 70, remark: 'Excellent' },
  { letter: 'B', min: 60, remark: 'Very good' },
  { letter: 'C', min: 50, remark: 'Good' },
  { letter: 'D', min: 45, remark: 'Fair' },
  { letter: 'E', min: 40, remark: 'Pass' },
  { letter: 'F', min: 0, remark: 'Fail' },
];
const PASS_MARK = 45;

/** September register marks per child (the design's absent, late and leave days). */
const SEPTEMBER_MARKS: Record<string, { absent: number[]; late: number[]; leave: number[] }> = {
  musa: { absent: [3, 16], late: [9], leave: [4, 7] },
  aisha: { absent: [1, 2, 8, 15], late: [14], leave: [16] },
  zainab: { absent: [10], late: [], leave: [23] },
  ibrahim: { absent: [5, 11, 12, 18], late: [2, 17], leave: [] },
};

/**
 * A date as `YYYY-MM-DD` in UTC.
 *
 * @param date - The date.
 * @returns The day.
 */
const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Adds days to a `YYYY-MM-DD`.
 *
 * @param day - A `YYYY-MM-DD` day.
 * @param n - How many days to add, or the number to round.
 * @returns The new `YYYY-MM-DD`.
 */
function addDays(day: string, n: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return isoDay(date);
}

/**
 * The Monday on or before a `YYYY-MM-DD` (Saturday and Sunday move to the next week).
 *
 * @param day - A `YYYY-MM-DD` day.
 * @returns That week's Monday.
 */
function mondayOf(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  const shift = weekday === 0 ? 1 : weekday === 6 ? 2 : 1 - weekday;
  return addDays(day, shift);
}

/**
 * The letter grade for a percent on the fixture scale.
 *
 * @param percent - The percent, or null.
 * @returns The letter, or null.
 */
const gradeOf = (percent: number | null): string | null =>
  percent === null ? null : (GRADE_SCALE.find((band) => percent >= band.min)?.letter ?? 'F');

/**
 * Rounds to one decimal.
 *
 * @param n - The number to round.
 * @returns The number to one decimal.
 */
const one = (n: number): number => Math.round(n * 10) / 10;

/**
 * A child's attendance rate (A7): (present + late) / (present + late + absent).
 *
 * @param child - The child.
 * @returns The percent to one decimal, or null before any register.
 */
function rateOf(child: SeedChild): number | null {
  const marked = child.present + child.late + child.absent;
  return marked ? one(((child.present + child.late) / marked) * 100) : null;
}

/**
 * A fixture term as the learner-view routes return it.
 *
 * @param term - The seed term.
 * @returns The `LearnerTermDto`.
 */
function learnerTerm(term: (typeof TERMS)[number]): LearnerTerm {
  const weeks = Math.ceil((Date.parse(term.endDate) - Date.parse(term.startDate)) / (7 * 86_400_000)) + 1;
  return { id: term.id, name: term.name, session: term.session, startDate: term.startDate, endDate: term.endDate, totalWeeks: Math.min(30, weeks), isCurrent: term.isCurrent };
}

/**
 * Whether the child's school has a current term (the `no-term` scenario has none).
 *
 * @param db - The fixture database.
 * @returns False when the school has no current term.
 */
const hasTerm = (db: FixtureDb): boolean => db.scenario !== 'no-term';

/**
 * The grade level of a class name: "Jss1 A" is in "Jss1".
 *
 * @param className - The class, or null.
 * @returns The level, or null.
 */
const gradeLevelOf = (className: string | null): string | null => (className ? className.replace(/\s+\S+$/, '') : null);

/**
 * The child a child-scoped request is about, or the error to answer with.
 *
 * @param db - The fixture database.
 * @param request - The request.
 * @returns The child, or the 400/404 response.
 */
function resolveChild(db: FixtureDb, request: FixtureRequest): SeedChild | Response {
  const header = request.headers[CHILD_HEADER] ?? request.headers[CHILD_HEADER.toLowerCase()];
  if (!header) return fail(400, 'CHILD_HEADER_REQUIRED', `${CHILD_HEADER} is required on child-scoped routes (fixture check).`);
  const fromPath = request.params.childId ?? request.query.get('childId');
  if (fromPath && fromPath !== header) {
    return fail(400, 'CHILD_HEADER_MISMATCH', `${CHILD_HEADER} (${header}) does not match the child in the request (${fromPath}).`);
  }
  const child = db.children.find((entry) => entry.id === header);
  return child ?? fail(404, 'NOT_FOUND', 'That child is not linked to this account.');
}

/**
 * Paid so far on one fee, seed plus fixture payments.
 *
 * @param db - The fixture database.
 * @param child - The child.
 * @param feeKey - The fee's catalogue key.
 * @returns Naira paid on that fee.
 */
function paidOn(db: FixtureDb, child: SeedChild, feeKey: string): number {
  const [amount, seedPaid] = child.feePlan[feeKey];
  return Math.min(amount, seedPaid + (db.extraPaid.get(child.id)?.[feeKey] ?? 0));
}

/**
 * One child's fee items (C2).
 *
 * @param db - The fixture database.
 * @param child - The child.
 * @returns The items with paid, balance and status.
 */
function feeItems(db: FixtureDb, child: SeedChild): (FeeItem & { feeKey: string; dueDate: string })[] {
  return Object.entries(child.feePlan).map(([feeKey, [amount]]) => {
    const fee = FEE_CATALOG[feeKey];
    const id = feeAssignmentId(child, feeKey);
    const paid = paidOn(db, child, feeKey);
    const balance = amount - paid;
    const overdue = balance > 0 && fee.due < FIXTURE_TODAY;
    const status = balance <= 0 ? 'paid' : paid > 0 ? 'part_paid' : overdue ? 'overdue' : 'due';
    // A pending bank transfer (or an unsettled checkout) holds the fee until it is decided.
    const pendingPayment =
      db.transactions.some((txn) => txn.status === 'pending' && txn.items.some((item) => item.feeAssignmentId === id)) ||
      [...db.checkouts.values()].some((checkout) => !checkout.settled && checkout.allocations.some((allocation) => allocation.feeAssignmentId === id));
    return {
      id,
      feeKey,
      label: fee.label,
      category: fee.category,
      dueDate: fee.due,
      amount,
      paid,
      balance,
      status,
      allowPartial: fee.allowPartial,
      parts: fee.parts.map(([label, share]) => ({ label, amount: Math.round(amount * share) })),
      pendingPayment: balance > 0 && pendingPayment,
      termId: TERMS[0].id,
      lateFee: 0,
    };
  });
}

/**
 * One child's bill (C2).
 *
 * @param db - The fixture database.
 * @param child - The child.
 * @returns The child's C2 entry.
 */
function childFees(db: FixtureDb, child: SeedChild): ChildFees {
  const items = feeItems(db, child);
  const school = SCHOOLS[child.school];
  return {
    child: { id: child.id, name: child.name, school: { id: school.id, name: school.name } },
    outstanding: items.reduce((sum, item) => sum + item.balance, 0),
    paid: items.reduce((sum, item) => sum + item.paid, 0),
    billTotal: items.reduce((sum, item) => sum + item.amount, 0),
    overdue: items.filter((item) => item.dueDate < FIXTURE_TODAY).reduce((sum, item) => sum + item.balance, 0),
    items: items.map(({ feeKey: _feeKey, ...item }) => item),
    minimumPartPayment: hasTerm(db) ? school.minimumPartPayment : 0,
    term: hasTerm(db) ? { id: TERMS[0].id, name: TERMS[0].name, session: TERMS[0].session } : null,
  };
}

/**
 * The B13 summary of one child.
 *
 * @param db - The fixture database.
 * @param child - The child.
 * @returns The child's B13 entry.
 */
function childSummary(db: FixtureDb, child: SeedChild): ChildSummary & { grade: string | null } {
  const school = SCHOOLS[child.school];
  const scores = subjectScores(child);
  const average = child.className ? one(scores.reduce((sum, row) => sum + row.total, 0) / scores.length) : null;
  return {
    id: child.id,
    name: child.name,
    admissionNumber: child.admissionNumber,
    class: child.className ? { id: `cl-${child.key}`, name: child.className } : null,
    school: { id: school.id, name: school.name, city: school.city },
    attendanceRate: child.className ? rateOf(child) : null,
    average,
    averageGrade: gradeOf(average),
    gradeLevel: gradeLevelOf(child.className),
    // The API keeps `grade` as the grade level, for older clients.
    grade: gradeLevelOf(child.className),
    position: child.className && child.rank ? { rank: child.rank, of: child.of } : null,
    outstanding: feeItems(db, child).reduce((sum, item) => sum + item.balance, 0),
    isDefault: child.isDefault,
    relationship: child.relationship,
    avatarUrl: null,
  };
}

/**
 * A notification row as the API lists it.
 *
 * @param row - The notification row.
 * @returns The notification as the list route returns it.
 */
function notificationView(row: FixtureDb['notifications'][number]): RawPortalNotification {
  const school = SCHOOLS[row.schoolKey];
  return {
    _id: row._id,
    title: row.title,
    message: row.message,
    category: row.category,
    type: row.type,
    createdAt: row.createdAt,
    isRead: row.isRead,
    senderName: row.senderName,
    school: { id: school.id, name: school.name },
    metadata: { ...(row.childId ? { childId: row.childId } : {}), target: row.target, actionLabel: row.actionLabel },
  };
}

/**
 * A notification as the dashboard feed carries it (B1 `FeedItemDto`): `id`,
 * and `target` and `actionLabel` lifted out of `metadata`.
 *
 * @param row - The notification row.
 * @returns The feed item.
 */
function feedItemView(row: FixtureDb['notifications'][number]): FeedItem {
  const school = SCHOOLS[row.schoolKey];
  return {
    id: row._id,
    title: row.title,
    message: row.message,
    category: row.category,
    createdAt: row.createdAt,
    isRead: row.isRead,
    senderName: row.senderName,
    target: row.target,
    actionLabel: row.actionLabel,
    school: { id: school.id, name: school.name },
    metadata: row.childId ? { childId: row.childId } : {},
  };
}

/**
 * The notifications a child filter keeps: that child's, plus their school's notices.
 *
 * @param db - The fixture database.
 * @param childId - The child, or null for every child.
 * @returns The rows that pass the filter.
 */
function forChild(db: FixtureDb, childId: string | null) {
  if (!childId) return db.notifications;
  const child = db.children.find((entry) => entry.id === childId);
  return db.notifications.filter((row) => row.childId === childId || (row.childId === null && row.schoolKey === child?.school));
}

/**
 * Today's lessons and the week's lessons for one child.
 *
 * @param child - The child.
 * @param day - A `YYYY-MM-DD` day.
 * @returns The day's lessons, by period.
 */
function lessonsFor(child: SeedChild, day: string): StudentLesson[] {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay() - 1;
  if (weekday < 0 || weekday > 4 || !child.className) return [];
  const scores = subjectScores(child);
  const byKey = new Map(scores.map((row) => [row.key, row]));
  const lessons: StudentLesson[] = [];
  for (let p = 0; p < PERIODS.length; p += 1) {
    const key = WEEK_GRID[p][weekday];
    if (key === 'break') continue;
    const subject = byKey.get(key);
    if (!subject) continue;
    const period = PERIODS[p];
    lessons.push({
      id: `ls-${child.key}-${day}-${period.key}`,
      date: day,
      day: DAY_NAMES[weekday],
      periodKey: period.key,
      startTime: period.startTime,
      endTime: period.endTime,
      course: { id: subject.courseId, code: subject.short.toUpperCase().slice(0, 3), title: subject.title },
      subject: { id: `sb-${key}`, name: subject.title },
      class: { id: `cl-${child.key}`, name: child.className },
      classRoomId: null,
      room: `Room ${p + 1}`,
      topic: null,
      cancelled: null,
      teacher: { id: `tc-${child.school}-${key}`, name: subject.teacher },
      courseShort: subject.short,
      colourKey: subject.colourKey,
      offSchedule: false,
    });
  }
  return lessons;
}

/**
 * The register mark of one school day.
 *
 * @param child - The child.
 * @param day - A `YYYY-MM-DD` day.
 * @returns The mark.
 */
function dayStatus(child: SeedChild, day: string): AttendanceDayStatus {
  const date = new Date(`${day}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return 'weekend';
  if (day === '2026-10-01') return 'holiday';
  if (day > FIXTURE_TODAY || day < TERMS[0].startDate) return 'unmarked';
  const marks = SEPTEMBER_MARKS[child.key] ?? { absent: [], late: [], leave: [] };
  const dom = date.getUTCDate();
  if (day.startsWith('2026-09')) {
    if (marks.leave.includes(dom)) return 'on_leave';
    if (marks.absent.includes(dom)) return 'absent';
    if (marks.late.includes(dom)) return 'late';
  }
  return 'present';
}

/**
 * The report card of one child and term (B5).
 *
 * @param db - The fixture database.
 * @param child - The child.
 * @param termId - The term.
 * @returns The B5 body.
 */
function reportCard(db: FixtureDb, child: SeedChild, termId: string): ReportCard {
  const index = TERMS.findIndex((term) => term.id === termId);
  const term = TERMS[index];
  const school = SCHOOLS[child.school];
  const sessionIndex = ['2026 / 2027', '2025 / 2026'].indexOf(term.session);
  const termIndex = ['First term', 'Second term', 'Third term'].indexOf(term.name);
  const shift = -4 * Math.max(0, sessionIndex) + termIndex * 2;
  const status = term.status;
  const columns = [
    { id: 'ca1', name: '1st CA', maxScore: 20 },
    { id: 'ca2', name: '2nd CA', maxScore: 20 },
    { id: 'exam', name: 'Exam', maxScore: 60 },
  ];
  const scores = status === 'none' ? [] : subjectScores(child, shift);
  const rows = scores.map((row, i) => {
    // A live term: exams are still being published for half the subjects.
    const examPending = status === 'partial' && i % 2 === 1;
    const cells = examPending ? [row.scores[0], row.scores[1], null] : row.scores;
    const total = cells.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const max = examPending ? 40 : 100;
    const percent = one((total / max) * 100);
    return {
      course: { id: row.courseId, code: row.short.toUpperCase().slice(0, 3), title: row.title, short: row.short, colourKey: row.colourKey },
      teacher: { id: `tc-${child.school}-${row.key}`, name: row.teacher },
      scores: cells,
      total,
      percent,
      grade: gradeOf(percent),
      position: { rank: row.rank, of: child.of },
      classAverage: row.classAverage,
    };
  });
  const percents = rows.map((row) => row.percent);
  const overallPercent = percents.length ? one(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
  const sorted = [...rows].sort((a, b) => b.percent - a.percent);
  const highlight = (row: (typeof rows)[number] | undefined) =>
    row
      ? { courseId: row.course.id, title: row.course.title, short: row.course.short, colourKey: row.course.colourKey, percent: row.percent, position: row.position }
      : null;
  const next = TERMS.find((candidate) => candidate.startDate > term.endDate && candidate.session === term.session) ?? (term.session === '2025 / 2026' ? TERMS[0] : null);
  const ackKey = `${child.id}|${termId}`;
  return {
    status,
    issuedAt: status === 'published' ? `${term.endDate}T12:00:00.000Z` : null,
    school: { name: school.name, logoUrl: null, address: school.address, phone: school.phone, email: school.email },
    student: { name: child.name, admissionNumber: child.admissionNumber, class: { id: `cl-${child.key}`, name: child.className ?? '' } },
    term: learnerTerm(term),
    session: term.session,
    nextTermStart: next?.startDate ?? null,
    columns,
    rows,
    overall: {
      percent: overallPercent,
      grade: gradeOf(overallPercent),
      position: rows.length ? { rank: child.rank, of: child.of } : null,
      previousPosition: child.previousRank ? { rank: child.previousRank, of: child.of } : null,
    },
    strongest: highlight(sorted[0]),
    weakest: highlight(sorted[sorted.length - 1]),
    scale: GRADE_SCALE,
    passMark: PASS_MARK,
    attendance: { schoolDays: child.days, present: child.present, late: child.late, absent: child.absent, excused: child.leave },
    remarks: status === 'published' ? { classTeacher: child.comment, principal: 'A good term. Keep it up.', classTeacherName: TEACHERS[child.school][child.teacherIdx] } : null,
    acknowledgedAt: db.acknowledgements.get(ackKey) ?? null,
  };
}

/**
 * A transaction as the history lists it (C6).
 *
 * @param db - The fixture database.
 * @param txn - The transaction.
 * @returns The C6 row.
 */
function historyRow(db: FixtureDb, txn: TxnRow): PaymentHistoryRow {
  const child = db.children.find((entry) => entry.id === txn.childId);
  return {
    id: txn.id,
    _id: txn.id,
    date: txn.date,
    child: { id: txn.childId, name: child?.name ?? '' },
    items: txn.items.map(({ feeAssignmentId: fee, label, amount }) => ({ feeAssignmentId: fee, label, amount })),
    amount: txn.amount,
    method: txn.method,
    methodKind: txn.method === 'bank_transfer' ? 'bank_transfer' : 'online',
    reference: txn.reference,
    status: txn.status,
    receiptId: txn.receiptNumber ? `rc-${txn.id}` : null,
    studentId: txn.childId,
    internalReference: txn.reference,
    totalAmount: txn.amount,
    currency: 'NGN',
    createdAt: txn.date,
    ...(txn.method !== 'bank_transfer' ? { providerName: txn.method } : {}),
  };
}

/**
 * A receipt (C5) for a settled transaction.
 *
 * @param db - The fixture database.
 * @param txn - The transaction.
 * @returns The C5 receipt.
 */
function receiptOf(db: FixtureDb, txn: TxnRow): ParentReceipt {
  const child = db.children.find((entry) => entry.id === txn.childId) as SeedChild;
  const school = SCHOOLS[child.school];
  const term = TERMS.find((entry) => entry.id === txn.termId);
  const id = `rc-${txn.id}`;
  const online = txn.method !== 'bank_transfer';
  const items = txn.items.map(({ feeAssignmentId: fee, label, amount }) => ({ feeAssignmentId: fee, label, category: FEE_CATALOG[fee.replace(`fa-${child.key}-`, '')]?.category ?? 'Fees', amount }));
  return {
    id,
    _id: id,
    schoolId: school.id,
    parentId: db.profile.id,
    studentId: child.id,
    transactionId: txn.id,
    termId: txn.termId,
    receiptNumber: txn.receiptNumber as string,
    feeItems: items.map((item) => ({ feeName: item.label, category: item.category, description: '', amount: item.amount })),
    subtotal: txn.amount,
    lateFee: 0,
    discount: 0,
    totalPaid: txn.amount,
    currency: 'NGN',
    paymentMethod: online ? 'card' : 'bank_transfer',
    paymentProvider: online ? txn.method : '',
    transactionReference: txn.transferReference ?? txn.reference,
    paymentDate: txn.date,
    receiptPdfUrl: '',
    verificationCode: '',
    verificationQrUrl: '',
    status: 'issued',
    issuedAt: txn.date,
    createdAt: txn.date,
    updatedAt: txn.date,
    school: { id: school.id, name: school.name, logo: '', address: school.address },
    child: { id: child.id, name: child.name },
    term: term ? { id: term.id, name: term.name, session: term.session } : null,
    items,
    downloadAllowed: db.receiptDownloads,
  };
}

/**
 * Pages a list the way the notifications route does (`{ data, meta }`).
 *
 * @param items - The rows.
 * @param query - The query string (page, limit).
 * @returns One page and its `meta`.
 */
function page<T>(items: T[], query: URLSearchParams) {
  const limit = Math.max(1, Number(query.get('limit') ?? 20));
  const current = Math.max(1, Number(query.get('page') ?? 1));
  const lastPage = Math.max(1, Math.ceil(items.length / limit));
  return { data: items.slice((current - 1) * limit, current * limit), meta: { total: items.length, page: current, lastPage, limit } };
}

/**
 * Pages a list the way the payments routes do (`{ data, total, page, limit }`,
 * no `meta`; the limit is capped at 100).
 *
 * @param items - The rows.
 * @param query - The query string (page, limit).
 * @returns One page with its numbers.
 */
function flatPage<T>(items: T[], query: URLSearchParams): { data: T[]; total: number; page: number; limit: number } {
  const limit = Math.min(100, Math.max(1, Number(query.get('limit') ?? 20)));
  const current = Math.max(1, Number(query.get('page') ?? 1));
  return { data: items.slice((current - 1) * limit, current * limit), total: items.length, page: current, limit };
}

/**
 * The settings body (`GET /parent/settings`).
 *
 * @param db - The fixture database.
 * @returns The settings body.
 */
function settingsView(db: FixtureDb) {
  const { profile } = db;
  return {
    profile: {
      id: profile.id,
      fullName: `${profile.firstName} ${profile.lastName}`,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      avatar: '',
      role: 'parent',
      isEmailVerified: true,
      isPhoneVerified: true,
      occupation: profile.occupation,
      address: profile.address,
    },
    children: [],
    preferences: { notifications: {}, theme: 'system', preferredProvider: db.preferredProvider, guides: { tourCompletedAt: db.tourCompletedAt } },
    security: { twoFactorEnabled: false, emailOtpEnabled: false, lastPasswordChangedAt: '2026-06-02T10:00:00.000Z' },
  };
}

/**
 * The signed-in parent as introspect returns them.
 *
 * @param db - The fixture database.
 * @returns The introspected user.
 */
function userView(db: FixtureDb) {
  const first = db.children[0];
  return {
    userId: db.profile.id,
    _id: db.profile.id,
    email: db.profile.email,
    role: 'parent',
    firstName: db.profile.firstName,
    lastName: db.profile.lastName,
    phoneNumber: db.profile.phoneNumber,
    userAvatar: '',
    schoolId: first ? SCHOOLS[first.school].id : undefined,
    mustChangePassword: false,
  };
}

/**
 * Applies a settled checkout to the bill and issues the receipt, as verify
 * and the webhook do. Settling twice changes nothing.
 *
 * @param db - The fixture database.
 * @param reference - The checkout's reference.
 * @returns The settled transaction, or null for an unknown reference.
 */
function settle(db: FixtureDb, reference: string): TxnRow | null {
  const checkout = db.checkouts.get(reference);
  if (!checkout) return null;
  const child = db.children.find((entry) => entry.id === checkout.childId) as SeedChild;
  if (!checkout.settled) {
    checkout.settled = true;
    const extra = { ...(db.extraPaid.get(child.id) ?? {}) };
    const items: TxnRow['items'] = [];
    for (const allocation of checkout.allocations) {
      const feeKey = allocation.feeAssignmentId.replace(`fa-${child.key}-`, '');
      extra[feeKey] = (extra[feeKey] ?? 0) + allocation.amount;
      items.push({ feeAssignmentId: allocation.feeAssignmentId, label: FEE_CATALOG[feeKey]?.label ?? feeKey, amount: allocation.amount });
    }
    db.extraPaid.set(child.id, extra);
    db.counter += 1;
    db.transactions.unshift({
      id: `tx-fixture-${db.counter}`,
      childId: child.id,
      date: new Date().toISOString(),
      items,
      amount: checkout.amount,
      method: checkout.provider,
      reference,
      receiptNumber: `${SCHOOLS[child.school].receiptPrefix}-2026-${String(db.counter).padStart(6, '0')}`,
      status: 'successful',
      termId: TERMS[0].id,
    });
  }
  return db.transactions.find((txn) => txn.reference === reference) ?? null;
}

/**
 * Validates a leave body; answers the 400 when it is wrong.
 *
 * @param body - The request body.
 * @returns The 400 response, or null when the body is fine.
 */
function leaveError(body: Record<string, unknown>): Response | null {
  const types = ['illness', 'medical', 'family_travel', 'religious', 'other'];
  const details: { field: string; reason: string }[] = [];
  if (!types.includes(String(body.type))) details.push({ field: 'type', reason: 'must be one of the leave types' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.startDate))) details.push({ field: 'startDate', reason: 'must be a date' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.endDate))) details.push({ field: 'endDate', reason: 'must be a date' });
  if (!details.length && String(body.endDate) < String(body.startDate)) details.push({ field: 'endDate', reason: 'must be on or after the start date' });
  return details.length ? fail(400, 'VALIDATION_FAILED', 'Some fields need attention.', details) : null;
}

/**
 * School days between two dates, inclusive.
 *
 * @param start - The first day.
 * @param end - The last day.
 * @returns The number of weekdays, at least one.
 */
function schoolDaysBetween(start: string, end: string): number {
  let count = 0;
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return Math.max(1, count);
}

/**
 * Builds the route table over one database.
 *
 * @param db - The fixtures' state.
 * @returns The routes, literal paths before parameterised ones.
 */
export function buildRoutes(db: FixtureDb): FixtureRoute[] {
  const child = (request: FixtureRequest): SeedChild | Response => resolveChild(db, request);
  const body = (request: FixtureRequest): Record<string, unknown> => (request.body ?? {}) as Record<string, unknown>;

  return [
    // ── Auth ──────────────────────────────────────────────────────────────
    { method: 'POST', pattern: '/auth/login', handler: (request) =>
      body(request).password === 'wrong-password'
        ? fail(401, 'UNAUTHENTICATED', 'Invalid credentials')
        : raw({ access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token' }) },
    { method: 'POST', pattern: '/auth/introspect', handler: () => raw({ active: true, user: userView(db) }) },
    { method: 'POST', pattern: '/auth/refresh', handler: () => raw({ access_token: 'fixture-access-token' }) },
    { method: 'POST', pattern: '/auth/logout', handler: () => ok({ message: 'Signed out' }) },
    { method: 'POST', pattern: '/auth/forgot-password', handler: () => ok({ message: 'If that email has an account, a code is on its way.' }) },
    { method: 'POST', pattern: '/auth/verify-reset-code', handler: (request) =>
      body(request).token === '123456' ? ok({ valid: true }) : fail(400, 'VALIDATION_FAILED', 'That code is wrong or has expired.', [{ field: 'token', reason: 'invalid' }]) },
    { method: 'POST', pattern: '/auth/reset-password', handler: () => ok({ message: 'Password reset. Sign in with your new password.' }) },
    { method: 'GET', pattern: '/auth/password-policy', handler: () =>
      ok({ minLength: 8, maxLength: 128, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSymbol: true, symbols: '!@#$%^&*()_+-=[]{};:,.?', historyCount: 1 }) },
    { method: 'GET', pattern: '/auth/sessions', handler: () => ok(db.sessions) },
    { method: 'POST', pattern: '/auth/sessions/revoke-others', handler: () => {
      const revoked = db.sessions.filter((s) => !s.current).length;
      db.sessions = db.sessions.filter((s) => s.current);
      return ok({ revoked });
    } },
    { method: 'DELETE', pattern: '/auth/sessions/:id', handler: (request) => {
      const found = db.sessions.find((s) => s.id === request.params.id);
      if (!found) return fail(404, 'NOT_FOUND', 'Session not found');
      db.sessions = db.sessions.filter((s) => s.id !== found.id);
      return ok({ id: found.id, revoked: true, current: found.current });
    } },

    // ── Parent account ────────────────────────────────────────────────────
    { method: 'GET', pattern: '/parent/settings', handler: () => ok(settingsView(db)) },
    { method: 'PATCH', pattern: '/parent/settings/profile', handler: (request) => {
      const { fullName, occupation, address } = body(request) as { fullName?: string; occupation?: string; address?: string };
      if (fullName !== undefined) {
        const [first, ...rest] = fullName.trim().split(/\s+/);
        db.profile.firstName = first;
        db.profile.lastName = rest.join(' ') || first;
      }
      if (occupation !== undefined) db.profile.occupation = occupation;
      if (address !== undefined) db.profile.address = address;
      return raw({ success: true, message: 'Profile updated', profile: settingsView(db).profile });
    } },
    { method: 'PATCH', pattern: '/parent/settings/payment-method', handler: (request) => {
      const value = body(request).preferredProvider;
      const allowed = ['paystack', 'opay', 'stripe', 'bank_transfer'];
      if (value !== null && !allowed.includes(String(value))) {
        return fail(400, 'VALIDATION_FAILED', 'Some fields need attention.', [{ field: 'preferredProvider', reason: 'must be one of the providers' }]);
      }
      db.preferredProvider = value as FixtureDb['preferredProvider'];
      return raw({ success: true, message: 'Preferred payment method updated', preferredProvider: db.preferredProvider });
    } },
    { method: 'PATCH', pattern: '/parent/settings/preferences', handler: (request) => {
      // Like the API: only `guides` is accepted here (forbidNonWhitelisted).
      const input = body(request);
      const extra = Object.keys(input).filter((key) => key !== 'guides');
      if (extra.length) return fail(400, 'VALIDATION_FAILED', 'Some fields need attention.', extra.map((field) => ({ field, reason: `property ${field} should not exist` })));
      const guides = (input.guides ?? {}) as { tourCompleted?: boolean };
      if (guides.tourCompleted === true) db.tourCompletedAt = new Date().toISOString();
      if (guides.tourCompleted === false) db.tourCompletedAt = null;
      return raw({ success: true, message: 'Preferences updated', guides: { tourCompletedAt: db.tourCompletedAt } });
    } },
    { method: 'PATCH', pattern: '/parent/settings/password', handler: (request) =>
      body(request).currentPassword === 'wrong-password'
        ? fail(401, 'UNAUTHENTICATED', 'Your current password is not right.')
        : raw({ success: true, message: 'Password changed', access_token: 'fixture-access-token-2' }) },
    { method: 'POST', pattern: '/parent/settings/phone/send-otp', handler: () => raw({ success: true, message: 'Code sent to your email.' }) },
    { method: 'POST', pattern: '/parent/settings/phone/verify-otp', handler: (request) => {
      if (body(request).otp !== '123456') return fail(400, 'VALIDATION_FAILED', 'That code is wrong or has expired.', [{ field: 'otp', reason: 'invalid' }]);
      db.profile.phoneNumber = String(body(request).newPhoneNumber);
      return raw({ success: true, message: 'Phone number updated.' });
    } },
    { method: 'PATCH', pattern: '/parent/settings/theme', handler: () => raw({ success: true, message: 'Theme saved' }) },
    { method: 'GET', pattern: '/notifications/preferences', handler: () => ok(db.notificationPrefs) },
    { method: 'PATCH', pattern: '/notifications/preferences', handler: (request) => {
      db.notificationPrefs = { ...db.notificationPrefs, ...body(request) } as FixtureDb['notificationPrefs'];
      return ok(db.notificationPrefs);
    } },
    { method: 'GET', pattern: '/chat/preferences', handler: () => ok(db.chatPrivacy) },
    { method: 'PATCH', pattern: '/chat/preferences', handler: (request) => {
      db.chatPrivacy = { ...db.chatPrivacy, ...body(request) } as FixtureDb['chatPrivacy'];
      return ok(db.chatPrivacy);
    } },
    { method: 'POST', pattern: '/support/tickets', handler: (request) => {
      const description = String(body(request).description ?? '');
      if (description.trim().length < 10) return fail(400, 'VALIDATION_FAILED', 'Tell us a little more (at least 10 characters).', [{ field: 'description', reason: 'too short' }]);
      db.counter += 1;
      return ok({ reference: `TS-${String(41200 + db.counter).slice(-5)}`, createdAt: new Date().toISOString() }, undefined, 201);
    } },

    // ── Children (B13, A11) ───────────────────────────────────────────────
    { method: 'GET', pattern: '/parents/me/children', handler: () => ok(db.children.map((entry) => childSummary(db, entry))) },
    { method: 'POST', pattern: '/parents/me/children/link', handler: (request) => {
      const code = String(body(request).code ?? '').trim().toUpperCase();
      if (code === LINK_CODES.used) return fail(409, 'CONFLICT', 'This code has already been used.');
      if (code !== LINK_CODES.valid) return fail(404, 'NOT_FOUND', 'That code is wrong or has expired.');
      if (db.children.some((entry) => entry.id === LINKABLE_CHILD.id)) return fail(409, 'CONFLICT', 'This code has already been used.');
      const linked = { ...LINKABLE_CHILD, relationship: (body(request).relationship as SeedChild['relationship']) ?? 'OTHER' };
      db.children.push(linked);
      return ok({ child: childSummary(db, linked) }, undefined, 201);
    } },
    { method: 'PATCH', pattern: '/parents/me/default-child/:childId', handler: (request) => {
      for (const entry of db.children) entry.isDefault = entry.id === request.params.childId;
      return ok({ childId: request.params.childId, message: 'Default child updated' });
    } },

    // ── Learner view (B1, B2, B5, B6, B8, B9, B12) ────────────────────────
    { method: 'GET', pattern: '/parents/me/children/:childId/dashboard', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const summary = childSummary(db, kid);
      const inTerm = hasTerm(db);
      const scores = kid.className && inTerm ? subjectScores(kid) : [];
      const lessons = (inTerm ? lessonsFor(kid, FIXTURE_TODAY) : []).map((lesson) => {
        const nowTime = '10:30';
        const state = lesson.endTime <= nowTime ? 'done' : lesson.startTime <= nowTime ? 'now' : 'later';
        return { ...lesson, state, minutesLeft: state === 'now' ? 30 : null } as const;
      });
      const fees = childFees(db, kid);
      const feed = forChild(db, kid.id).filter((row) => !row.isRead).slice(0, 5).map(feedItemView);
      const pendingLeave = (db.leave.get(kid.id) ?? []).find((row) => row.status === 'pending');
      const attention: ParentDashboard['attention'] = [];
      if (fees.outstanding > 0) attention.push({ kind: 'fees', title: 'First term fees part paid', meta: `₦${fees.outstanding.toLocaleString('en-NG')} outstanding · due 30 September`, target: { page: 'payments' } });
      if (summary.attendanceRate !== null && summary.attendanceRate < 92) attention.push({ kind: 'attendance', title: `${kid.first}'s attendance is slipping`, meta: `${kid.absent} days missed this term · ${summary.attendanceRate}% present`, target: { page: 'attendance' } });
      if (pendingLeave) attention.push({ kind: 'leave', title: 'Leave request awaiting the school', meta: 'Medical appointment · 24 September', target: { page: 'leave' } });
      if (kid.className && !db.acknowledgements.has(`${kid.id}|${TERMS[3].id}`)) attention.push({ kind: 'report', title: 'Term report is ready', meta: `${TERMS[3].name} ${TERMS[3].session} · sign to acknowledge`, target: { page: 'results', termId: TERMS[3].id } });
      const dashboard: ParentDashboard = {
        date: FIXTURE_TODAY,
        day: 'Friday',
        now: FIXTURE_NOW,
        timezone: 'Africa/Lagos',
        greeting: 'morning',
        class: summary.class ?? { id: '', name: '' },
        term: inTerm ? learnerTerm(TERMS[0]) : null,
        weekNumber: inTerm ? 3 : null,
        schoolDay: inTerm
          ? { isSchoolDay: true, reason: null, holidayTitle: null, endsEarlyAt: null }
          : { isSchoolDay: false, reason: 'no_term', holidayTitle: null, endsEarlyAt: null },
        periods: inTerm ? [...PERIODS] : [],
        lessons,
        nowLessonId: lessons.find((lesson) => lesson.state === 'now')?.id ?? null,
        nextLessonId: lessons.find((lesson) => lesson.state === 'later')?.id ?? null,
        glance: {
          average: inTerm ? summary.average : null,
          grade: inTerm ? summary.averageGrade : null,
          position: inTerm ? summary.position : null,
          movement: inTerm && kid.previousRank && kid.rank ? kid.previousRank - kid.rank : null,
          attendance: { rate: inTerm ? summary.attendanceRate : null, present: inTerm ? kid.present : 0, schoolDays: inTerm ? kid.days : 0 },
          unread: { count: 3, topRoom: { id: 'room-dm-class-teacher', name: TEACHERS[kid.school][kid.teacherIdx] } },
        },
        subjectTotals: scores.map((row) => ({ courseId: row.courseId, title: row.title, short: row.short, percent: row.total, classAverage: row.classAverage, colourKey: row.colourKey })),
        passMark: PASS_MARK,
        comingUp: kid.className && inTerm
          ? [
              { kind: 'assessment', id: 'as-1', title: 'Second CA', courseTitle: 'Advance Maths', date: '2026-09-25', daysAway: 7 },
              { kind: 'event', eventType: 'event', id: 'ev-1', title: "Parents' evening", courseTitle: null, date: '2026-10-02', daysAway: 14 },
            ]
          : [],
        feed,
        counts: { unreadNotifications: forChild(db, kid.id).filter((row) => !row.isRead).length, unreadMessages: 3 },
        attention,
        fees: { outstanding: fees.outstanding, dueDate: fees.outstanding > 0 ? '2026-09-30' : null },
      };
      return ok(dashboard);
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/timetable', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const inTerm = hasTerm(db);
      const start = mondayOf(request.query.get('weekStart') || FIXTURE_TODAY);
      const end = addDays(start, 6);
      const days = DAY_NAMES.map((day, i) => {
        const date = addDays(start, i);
        return { date, day, isToday: date === FIXTURE_TODAY, holiday: date === '2026-10-01' ? { title: 'Independence Day' } : null, endsEarlyAt: null, events: [] };
      });
      const lessons = kid.className && inTerm ? days.flatMap((day) => (day.holiday ? [] : lessonsFor(kid, day.date))) : [];
      const termStart = TERMS[0].startDate;
      const weekNumber = inTerm && start >= mondayOf(termStart) && start <= TERMS[0].endDate
        ? Math.floor((Date.parse(start) - Date.parse(mondayOf(termStart))) / (7 * 86_400_000)) + 1
        : null;
      const timetable: ChildTimetable = {
        timezone: 'Africa/Lagos',
        now: FIXTURE_NOW,
        today: FIXTURE_TODAY,
        term: inTerm ? learnerTerm(TERMS[0]) : null,
        week: { number: weekNumber, start, end, isCurrent: start === mondayOf(FIXTURE_TODAY), prevStart: addDays(start, -7), nextStart: addDays(start, 7), inTerm: weekNumber !== null },
        days,
        periods: inTerm ? [...PERIODS] : [],
        periodsSource: inTerm ? 'school' : 'derived',
        lessons,
        subjects: kid.className && inTerm
          ? SUBJECTS.map(([key, title, short], index) => ({ courseId: `co-${kid.school}-${key}`, title, short, colourKey: index, teacher: { id: `tc-${kid.school}-${key}`, name: TEACHERS[kid.school][index] } }))
          : [],
      };
      return ok(timetable);
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/attendance', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const month = request.query.get('month');
      const inTerm = hasTerm(db);
      const rate = inTerm ? rateOf(kid) : null;
      const summary: ChildAttendance = {
        term: inTerm ? learnerTerm(TERMS[0]) : null,
        class: { id: `cl-${kid.key}`, name: kid.className ?? '' },
        schoolDays: inTerm ? kid.days : 0,
        present: inTerm ? kid.present : 0,
        late: inTerm ? kid.late : 0,
        absent: inTerm ? kid.absent : 0,
        onLeave: inTerm ? kid.leave : 0,
        rate,
        band: (rate ?? 100) >= 92 ? 'on_track' : 'watch',
      };
      if (!month) return ok(summary);
      if (!/^\d{4}-\d{2}$/.test(month)) return fail(400, 'VALIDATION_FAILED', 'month must be YYYY-MM', [{ field: 'month', reason: 'format' }]);
      const [year, mon] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, '0')}`;
        const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        return { date, status: inTerm ? dayStatus(kid, date) : weekday === 0 || weekday === 6 ? 'weekend' : 'unmarked' } as const;
      });
      return ok({ ...summary, days });
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/report-card/terms', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      // A school with no current term has no report terms (as the API answers for Hillview).
      const terms: ReportTerm[] = hasTerm(db)
        ? TERMS.map((term) => ({ id: term.id, name: term.name, session: term.session, status: term.status, isCurrent: term.isCurrent, startDate: term.startDate, endDate: term.endDate }))
        : [];
      return ok(terms);
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/report-card', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const termId = request.query.get('termId') ?? TERMS[0].id;
      if (!TERMS.some((term) => term.id === termId)) return fail(404, 'NOT_FOUND', 'Term not found');
      return ok(reportCard(db, kid, termId));
    } },
    { method: 'POST', pattern: '/parents/me/children/:childId/report-card/acknowledge', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const termId = String(body(request).termId ?? '');
      const term = TERMS.find((entry) => entry.id === termId);
      if (!term) return fail(404, 'NOT_FOUND', 'Term not found');
      if (term.status !== 'published') return fail(409, 'RESULTS_NOT_PUBLISHED', 'You can sign once the school publishes the report.');
      const key = `${kid.id}|${termId}`;
      const at = db.acknowledgements.get(key) ?? new Date().toISOString();
      db.acknowledgements.set(key, at);
      return ok({ acknowledgedAt: at });
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/leave', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const requests = db.leave.get(kid.id) ?? [];
      return ok({ requests, countThisSession: requests.length });
    } },
    { method: 'POST', pattern: '/parents/me/children/:childId/leave', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const input = body(request);
      const invalid = leaveError(input);
      if (invalid) return invalid;
      db.counter += 1;
      const row: LeaveRow = {
        id: `68l-fixture-${db.counter}`,
        type: String(input.type) as LeaveType,
        startDate: String(input.startDate),
        endDate: String(input.endDate),
        days: schoolDaysBetween(String(input.startDate), String(input.endDate)),
        note: input.note ? String(input.note) : null,
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
        declineReason: null,
        createdAt: new Date().toISOString(),
      };
      db.leave.set(kid.id, [row, ...(db.leave.get(kid.id) ?? [])]);
      return ok(row, undefined, 201);
    } },
    { method: 'PATCH', pattern: '/parents/me/children/:childId/leave/:leaveId', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const rows = db.leave.get(kid.id) ?? [];
      const row = rows.find((entry) => entry.id === request.params.leaveId);
      if (!row) return fail(404, 'NOT_FOUND', 'Leave request not found');
      if (row.status !== 'pending') return fail(400, 'BAD_REQUEST', 'Only a pending request can be changed.');
      const input = { ...row, ...body(request) };
      const invalid = leaveError(input);
      if (invalid) return invalid;
      Object.assign(row, input, { days: schoolDaysBetween(String(input.startDate), String(input.endDate)) });
      return ok(row);
    } },
    { method: 'DELETE', pattern: '/parents/me/children/:childId/leave/:leaveId', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const rows = db.leave.get(kid.id) ?? [];
      const row = rows.find((entry) => entry.id === request.params.leaveId);
      if (!row) return fail(404, 'NOT_FOUND', 'Leave request not found');
      if (row.status !== 'pending') return fail(400, 'BAD_REQUEST', 'Only a pending request can be withdrawn.');
      db.leave.set(kid.id, rows.filter((entry) => entry.id !== row.id));
      return ok({ id: row.id, deleted: true });
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/school', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const school = SCHOOLS[kid.school];
      return ok({ name: school.name, phone: school.phone, email: school.email, address: school.address, officeHours: school.officeHours });
    } },

    // ── Messages (B10) ────────────────────────────────────────────────────
    { method: 'GET', pattern: '/chat/contacts', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const school = SCHOOLS[kid.school];
      const teachers = TEACHERS[kid.school];
      /**
       * One contact, with the older name fields the API keeps alongside.
       *
       * @param entry - The new fields.
       * @returns The contact.
       */
      const contact = (entry: Pick<ChatContact, 'userId' | 'name' | 'role' | 'subtitle' | 'group' | 'phone'>): ChatContact => {
        const [firstName, ...rest] = entry.name.split(' ');
        return { ...entry, avatarUrl: null, userAvatar: null, firstName: entry.group === 'office' ? entry.name : firstName, lastName: entry.group === 'office' ? '' : rest.join(' ') };
      };
      // Teachers' numbers are not shared with parents (`phone: null`), as the API answers.
      const contacts: ChatContact[] = kid.className
        ? [
            contact({ userId: `us-${kid.school}-ct`, name: teachers[kid.teacherIdx], role: 'teacher', subtitle: `Class teacher · ${kid.className}`, group: 'class_teacher', phone: null }),
            ...SUBJECTS.slice(0, 4).map(([key, title], i) => contact({ userId: `us-${kid.school}-${key}`, name: teachers[i], role: 'teacher', subtitle: `${title} · teacher`, group: 'teacher', phone: null })),
          ]
        : [];
      contacts.push(contact({ userId: 'office', name: 'School office', role: 'school_admin', subtitle: `School office · ${school.name}`, group: 'office', phone: null }));
      return ok(contacts);
    } },
    { method: 'POST', pattern: '/chat/office', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const id = `room-office-${kid.school}`;
      const room: Schema<'ChatRoomViewDto'> = {
        _id: id,
        roomId: id,
        name: 'School office',
        type: 'office',
        ownerRole: 'parent',
        category: 'office',
        description: null,
        admins: [],
        callPhone: null,
        participants: [],
        lastMessage: null,
        unreadCount: 0,
        subtitle: `School office · ${SCHOOLS[kid.school].short}`,
      };
      return ok(room, undefined, 201);
    } },
    { method: 'POST', pattern: '/chat/rooms', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      // Like the API: a direct message names both people, the caller included.
      const participants = (body(request).participants as string[] | undefined) ?? [];
      if (participants.length !== 2 || !participants.includes(db.profile.id)) {
        return fail(400, 'BAD_REQUEST', 'A direct message needs exactly two participants, you and the teacher.');
      }
      const other = participants.find((id) => id !== db.profile.id) as string;
      const now = new Date().toISOString();
      const room: Schema<'ChatRoomResponseDto'> = { _id: `room-dm-${other}`, type: 'one_to_one', participants, createdAt: now, updatedAt: now, reused: false };
      return ok(room, undefined, 201);
    } },

    // ── Notifications (B11) ───────────────────────────────────────────────
    { method: 'GET', pattern: '/notifications/counts', handler: (request) => {
      const rows = forChild(db, request.query.get('childId'));
      const byCategory: Record<string, { all: number; unread: number }> = {};
      for (const category of ['announcement', 'attendance', 'academics', 'grading', 'resources', 'messages', 'account', 'payments', 'leave', 'other']) {
        byCategory[category] = { all: 0, unread: 0 };
      }
      for (const row of rows) {
        const entry = byCategory[row.category] ?? byCategory.other;
        entry.all += 1;
        if (!row.isRead) entry.unread += 1;
      }
      return ok({ all: rows.length, unread: rows.filter((row) => !row.isRead).length, byCategory });
    } },
    { method: 'PATCH', pattern: '/notifications/read-all', handler: () => {
      let updated = 0;
      for (const row of db.notifications) {
        if (!row.isRead) {
          row.isRead = true;
          updated += 1;
        }
      }
      return ok({ updated, message: 'All notifications marked as read' });
    } },
    { method: 'GET', pattern: '/notifications', handler: (request) => {
      let rows = forChild(db, request.query.get('childId'));
      const category = request.query.get('category');
      if (category) rows = rows.filter((row) => row.category === category);
      if (request.query.get('unread') === 'true') rows = rows.filter((row) => !row.isRead);
      const paged = page(rows.map(notificationView), request.query);
      return ok(paged.data, paged.meta);
    } },
    { method: 'PUT', pattern: '/notifications/:id/read', handler: (request) => {
      const row = db.notifications.find((entry) => entry._id === request.params.id);
      if (!row) return fail(404, 'NOT_FOUND', 'Notification not found');
      row.isRead = true;
      return ok(notificationView(row));
    } },

    // ── Payments (C2–C7) ──────────────────────────────────────────────────
    { method: 'GET', pattern: '/payments/parent/fees', handler: () => {
      const children = db.children.map((entry) => childFees(db, entry));
      return ok({
        children,
        totals: {
          outstanding: children.reduce((sum, entry) => sum + entry.outstanding, 0),
          paidThisSession: children.reduce((sum, entry) => sum + entry.paid, 0),
          receipts: db.transactions.filter((txn) => txn.status === 'successful').length,
          overdue: children.reduce((sum, entry) => sum + entry.overdue, 0),
        },
      });
    } },
    { method: 'GET', pattern: '/payments/parent/providers', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      return raw({
        success: true,
        providers: SCHOOLS[kid.school].providers.map((providerName) => ({ providerName, isEnabled: true, environment: 'test', supportedChannels: ['card', 'bank_transfer', 'ussd'], currency: 'NGN' })),
      });
    } },
    { method: 'GET', pattern: '/payments/parent/bank-details', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      if (db.noBankAccount) return fail(404, 'NOT_FOUND', 'This school has not set up a bank account for transfers yet.');
      const school = SCHOOLS[kid.school];
      const details: BankDetails = { ...school.bank, school: { id: school.id, name: school.name } };
      return ok(details);
    } },
    { method: 'POST', pattern: '/payments/parent/initialize', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const input = body(request) as { feeAssignmentIds?: string[]; amount?: number; provider?: string; idempotencyKey?: string };
      if (!input.idempotencyKey) return fail(400, 'VALIDATION_FAILED', 'idempotencyKey is required', [{ field: 'idempotencyKey', reason: 'required' }]);
      const existing = db.checkoutsByKey.get(input.idempotencyKey);
      /**
       * The C3 answer for one checkout.
       *
       * @param checkout - The stored checkout.
       * @param replayed - Whether an earlier request with the same key made it.
       * @returns The response body.
       */
      const answer = (checkout: NonNullable<ReturnType<typeof db.checkouts.get>>, replayed: boolean): CheckoutResult => ({
        reference: checkout.reference,
        checkoutUrl: checkout.checkoutUrl,
        allocations: checkout.allocations,
        status: 'pending',
        replayed,
        transactionId: `tx-${checkout.reference}`,
        internalReference: checkout.reference,
        amount: checkout.amount,
        subtotal: checkout.amount,
        lateFee: 0,
        platformFee: 0,
        schoolAmount: checkout.amount,
        currency: 'NGN',
        provider: checkout.provider,
      });
      if (existing) return ok(answer(db.checkouts.get(existing) as NonNullable<ReturnType<typeof db.checkouts.get>>, true));
      const items = feeItems(db, kid).filter((item) => input.feeAssignmentIds?.includes(item.id) && item.balance > 0);
      if (!items.length || items.length !== (input.feeAssignmentIds?.length ?? 0)) return fail(409, 'CONFLICT', 'A selected fee is already paid or not yours.');
      if (items.some((item) => item.pendingPayment)) return fail(409, 'CONFLICT', 'A payment for one of these fees is already in progress.');
      const total = items.reduce((sum, item) => sum + item.balance, 0);
      const amount = input.amount ?? total;
      if (amount > total) return fail(400, 'VALIDATION_FAILED', 'The amount is more than the balance.', [{ field: 'amount', reason: 'too large' }]);
      if (amount < total) {
        if (items.some((item) => !item.allowPartial)) return fail(400, 'PART_PAYMENT_NOT_ALLOWED', 'One of these fees must be paid in full.');
        const minimum = Math.min(SCHOOLS[kid.school].minimumPartPayment, total);
        if (amount < minimum) return fail(400, 'VALIDATION_FAILED', `The minimum part payment is ₦${minimum.toLocaleString('en-NG')}.`, [{ field: 'amount', reason: 'below minimum' }]);
      }
      const allocations: { feeAssignmentId: string; amount: number }[] = [];
      let left = amount;
      for (const item of [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
        if (left <= 0) break;
        const take = Math.min(left, item.balance);
        allocations.push({ feeAssignmentId: item.id, amount: take });
        left -= take;
      }
      db.counter += 1;
      const reference = `TLM-FX-${db.counter}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const checkout = { reference, childId: kid.id, provider: (input.provider ?? 'paystack') as 'paystack', allocations, amount, checkoutUrl: `${origin}/payments/verify?reference=${reference}`, settled: false };
      db.checkouts.set(reference, checkout);
      db.checkoutsByKey.set(input.idempotencyKey, reference);
      return ok(answer(checkout, false), undefined, 201);
    } },
    { method: 'GET', pattern: '/payments/parent/verify/:reference', handler: (request) => {
      const txn = settle(db, request.params.reference);
      if (!txn) return fail(404, 'NOT_FOUND', 'No payment with that reference.');
      const receipt = receiptOf(db, txn);
      return raw({
        success: true,
        status: 'successful',
        transaction: { _id: txn.id, internalReference: txn.reference, totalAmount: txn.amount, status: 'successful', studentId: txn.childId },
        receipt: { _id: receipt.id, receiptNumber: receipt.receiptNumber, totalPaid: receipt.totalPaid },
      });
    } },
    { method: 'POST', pattern: '/payments/parent/bank-transfer', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const input = body(request) as { feeAssignmentIds?: string[]; amount?: number; transferReference?: string; paidOn?: string };
      if (!input.transferReference?.trim()) return fail(400, 'VALIDATION_FAILED', 'Enter the transfer reference.', [{ field: 'transferReference', reason: 'required' }]);
      if (!input.paidOn) return fail(400, 'VALIDATION_FAILED', 'Enter the date you paid.', [{ field: 'paidOn', reason: 'required' }]);
      // The screen defaults the date to the real today, so the check uses the real clock too.
      if (input.paidOn.slice(0, 10) > isoDay(new Date())) return fail(400, 'BAD_REQUEST', 'The transfer date cannot be in the future.');
      const items = feeItems(db, kid).filter((item) => input.feeAssignmentIds?.includes(item.id) && item.balance > 0);
      if (!items.length || items.length !== (input.feeAssignmentIds?.length ?? 0)) return fail(409, 'CONFLICT', 'A selected fee is already paid or not yours.');
      if (items.some((item) => item.pendingPayment)) return fail(409, 'CONFLICT', 'A payment for one of these fees is already in progress.');
      // The C3 rules apply to a transfer too: in full, unless every fee allows part payment and the minimum is met.
      const total = items.reduce((sum, item) => sum + item.balance, 0);
      const amount = Number(input.amount ?? 0);
      if (amount > total) return fail(400, 'BAD_REQUEST', 'The amount is more than what is owed.');
      if (amount < total) {
        if (items.some((item) => !item.allowPartial)) return fail(400, 'BAD_REQUEST', 'One of these fees must be paid in full.');
        const minimum = Math.min(SCHOOLS[kid.school].minimumPartPayment, total);
        if (amount < minimum) return fail(400, 'BAD_REQUEST', `The smallest part payment is ₦${minimum.toLocaleString('en-NG')}.00.`);
      }
      const allocations: { feeAssignmentId: string; amount: number }[] = [];
      let left = amount;
      for (const item of [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
        if (left <= 0) break;
        const take = Math.min(left, item.balance);
        allocations.push({ feeAssignmentId: item.id, amount: take });
        left -= take;
      }
      db.counter += 1;
      const reference = `TXN-2026-FX${String(db.counter).padStart(14, '0')}`;
      const txn: TxnRow = {
        id: `tx-bank-${db.counter}`,
        childId: kid.id,
        date: `${input.paidOn.slice(0, 10)}T00:00:00.000Z`,
        items: allocations.map((allocation) => ({ ...allocation, label: items.find((item) => item.id === allocation.feeAssignmentId)?.label ?? '' })),
        amount,
        method: 'bank_transfer',
        reference,
        transferReference: input.transferReference.trim(),
        receiptNumber: null,
        status: 'pending',
        termId: TERMS[0].id,
      };
      db.transactions.unshift(txn);
      const response: BankTransferResponse = {
        success: true,
        transfer: { id: txn.id, reference, status: 'pending', amount, transferReference: txn.transferReference as string, paidOn: txn.date, allocations },
      };
      return raw(response, 201);
    } },
    // Family-wide (C5, C6): `childId` is a filter, not a child header; another family's child is a 404.
    { method: 'GET', pattern: '/payments/parent/history', handler: (request) => {
      const childId = request.query.get('childId');
      if (childId && !db.children.some((entry) => entry.id === childId)) return fail(404, 'NOT_FOUND', 'That child is not linked to this account.');
      const termId = request.query.get('termId');
      const rows = db.transactions
        .filter((txn) => (!childId || txn.childId === childId) && (!termId || txn.termId === termId))
        .map((txn) => historyRow(db, txn));
      return ok(flatPage(rows, request.query));
    } },
    { method: 'GET', pattern: '/payments/parent/receipts', handler: (request) => {
      const childId = request.query.get('childId');
      if (childId && !db.children.some((entry) => entry.id === childId)) return fail(404, 'NOT_FOUND', 'That child is not linked to this account.');
      const termId = request.query.get('termId');
      const settled = db.transactions.filter((txn) => txn.status === 'successful' && txn.receiptNumber && (!childId || txn.childId === childId));
      const receipts = settled.filter((txn) => !termId || txn.termId === termId).map((txn) => receiptOf(db, txn));
      // The terms the (filtered) receipts are in, newest first.
      const terms = TERMS.filter((term) => settled.some((txn) => txn.termId === term.id))
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((term) => ({ id: term.id, name: term.name, session: term.session }));
      return ok({ ...flatPage(receipts, request.query), terms });
    } },
  ];
}
