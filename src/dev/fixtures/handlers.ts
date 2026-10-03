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
const GRADE_SCALE = [
  { grade: 'A', min: 75, label: 'Excellent' },
  { grade: 'B', min: 65, label: 'Very good' },
  { grade: 'C', min: 55, label: 'Good' },
  { grade: 'D', min: 45, label: 'Fair' },
  { grade: 'F', min: 0, label: 'Needs work' },
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
  percent === null ? null : (GRADE_SCALE.find((band) => percent >= band.min)?.grade ?? 'F');

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
function feeItems(db: FixtureDb, child: SeedChild) {
  return Object.entries(child.feePlan).map(([feeKey, [amount]]) => {
    const fee = FEE_CATALOG[feeKey];
    const paid = paidOn(db, child, feeKey);
    const balance = amount - paid;
    const overdue = balance > 0 && fee.due < FIXTURE_TODAY;
    const status = balance <= 0 ? 'paid' : paid > 0 ? 'part_paid' : overdue ? 'overdue' : 'due';
    return {
      id: feeAssignmentId(child, feeKey),
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
function childFees(db: FixtureDb, child: SeedChild) {
  const items = feeItems(db, child);
  const school = SCHOOLS[child.school];
  return {
    child: { id: child.id, name: child.name, school: { id: school.id, name: school.name, city: school.city } },
    outstanding: items.reduce((sum, item) => sum + item.balance, 0),
    paid: items.reduce((sum, item) => sum + item.paid, 0),
    billTotal: items.reduce((sum, item) => sum + item.amount, 0),
    overdue: items.filter((item) => item.dueDate < FIXTURE_TODAY).reduce((sum, item) => sum + item.balance, 0),
    items: items.map(({ feeKey: _feeKey, ...item }) => item),
    minimumPartPayment: school.minimumPartPayment,
    term: { id: TERMS[0].id, name: TERMS[0].name, session: TERMS[0].session },
  };
}

/**
 * The B13 summary of one child.
 *
 * @param db - The fixture database.
 * @param child - The child.
 * @returns The child's B13 entry.
 */
function childSummary(db: FixtureDb, child: SeedChild) {
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
    grade: gradeOf(average),
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
function notificationView(row: FixtureDb['notifications'][number]) {
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
function lessonsFor(child: SeedChild, day: string) {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay() - 1;
  if (weekday < 0 || weekday > 4 || !child.className) return [];
  const scores = subjectScores(child);
  const byKey = new Map(scores.map((row) => [row.key, row]));
  const lessons = [];
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
      colourKey: key,
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
function dayStatus(child: SeedChild, day: string): string {
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
function reportCard(db: FixtureDb, child: SeedChild, termId: string) {
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
      course: { id: row.courseId, title: row.title, short: row.short, colourKey: row.key },
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
  const next = TERMS.find((candidate) => candidate.startDate > term.endDate && candidate.session === term.session) ?? (term.session === '2025 / 2026' ? TERMS[0] : null);
  const ackKey = `${child.id}|${termId}`;
  return {
    status,
    issuedAt: status === 'published' ? `${term.endDate}T12:00:00.000Z` : null,
    school: { name: school.name, logoUrl: null, address: school.address, phone: school.phone, email: school.email },
    student: { name: child.name, admissionNumber: child.admissionNumber, class: child.className ? { id: `cl-${child.key}`, name: child.className } : null },
    term: { id: term.id, name: term.name, session: term.session, startDate: term.startDate, endDate: term.endDate, isCurrent: term.isCurrent },
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
    strongest: sorted[0] ? { course: sorted[0].course, percent: sorted[0].percent, position: sorted[0].position } : null,
    weakest: sorted[sorted.length - 1] ? { course: sorted[sorted.length - 1].course, percent: sorted[sorted.length - 1].percent, position: sorted[sorted.length - 1].position } : null,
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
function historyRow(db: FixtureDb, txn: TxnRow) {
  const child = db.children.find((entry) => entry.id === txn.childId);
  return {
    id: txn.id,
    date: txn.date,
    child: { id: txn.childId, name: child?.name ?? '' },
    items: txn.items.map(({ label, amount }) => ({ label, amount })),
    amount: txn.amount,
    method: txn.method,
    reference: txn.reference,
    status: txn.status,
  };
}

/**
 * A receipt (C5) for a settled transaction.
 *
 * @param db - The fixture database.
 * @param txn - The transaction.
 * @returns The C5 receipt.
 */
function receiptOf(db: FixtureDb, txn: TxnRow) {
  const child = db.children.find((entry) => entry.id === txn.childId) as SeedChild;
  const school = SCHOOLS[child.school];
  const term = TERMS.find((entry) => entry.id === txn.termId);
  return {
    id: `rc-${txn.id}`,
    receiptNumber: txn.receiptNumber as string,
    termId: txn.termId,
    termName: term?.name ?? null,
    session: term?.session ?? null,
    child: { id: child.id, name: child.name, admissionNumber: child.admissionNumber, className: child.className },
    school: { name: school.name, logoUrl: null, address: school.address },
    items: txn.items.map(({ label, amount }) => ({ label, amount })),
    total: txn.amount,
    paidAt: txn.date,
    method: txn.method,
    reference: txn.reference,
    currency: 'NGN',
  };
}

/**
 * Pages a list the way the API does.
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
    preferences: { notifications: {}, theme: 'system', preferredProvider: db.preferredProvider },
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
    { method: 'PATCH', pattern: '/parent/settings/preferences', handler: (request) => {
      db.preferredProvider = String(body(request).preferredProvider ?? db.preferredProvider);
      return raw({ success: true, message: 'Preferences updated', preferredProvider: db.preferredProvider });
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
      const scores = kid.className ? subjectScores(kid) : [];
      const lessons = lessonsFor(kid, FIXTURE_TODAY).map((lesson) => {
        const nowTime = '10:30';
        const state = lesson.endTime <= nowTime ? 'done' : lesson.startTime <= nowTime ? 'now' : 'later';
        return { ...lesson, state, minutesLeft: state === 'now' ? 30 : null };
      });
      const fees = childFees(db, kid);
      const feed = forChild(db, kid.id).slice(0, 5).map(notificationView);
      const pendingLeave = (db.leave.get(kid.id) ?? []).find((row) => row.status === 'pending');
      const attention = [];
      if (fees.outstanding > 0) attention.push({ kind: 'fees', title: 'First term fees part paid', meta: `₦${fees.outstanding.toLocaleString('en-NG')} outstanding · due 30 September`, target: { page: 'payments' } });
      if (summary.attendanceRate !== null && summary.attendanceRate < 92) attention.push({ kind: 'attendance', title: `${kid.first}'s attendance is slipping`, meta: `${kid.absent} days missed this term · ${summary.attendanceRate}% present`, target: { page: 'attendance' } });
      if (pendingLeave) attention.push({ kind: 'leave', title: 'Leave request awaiting the school', meta: 'Medical appointment · 24 September', target: { page: 'leave' } });
      if (kid.className && !db.acknowledgements.has(`${kid.id}|${TERMS[3].id}`)) attention.push({ kind: 'report', title: 'Term report is ready', meta: `${TERMS[3].name} ${TERMS[3].session} · sign to acknowledge`, target: { page: 'results', termId: TERMS[3].id } });
      return ok({
        date: FIXTURE_TODAY,
        day: 'Friday',
        now: FIXTURE_NOW,
        timezone: 'Africa/Lagos',
        greeting: 'morning',
        class: summary.class,
        term: { id: TERMS[0].id, name: TERMS[0].name, session: TERMS[0].session, isCurrent: true },
        weekNumber: 3,
        schoolDay: { isSchoolDay: true, reason: null, holidayTitle: null, endsEarlyAt: null },
        periods: PERIODS,
        lessons,
        nowLessonId: lessons.find((lesson) => lesson.state === 'now')?.id ?? null,
        nextLessonId: lessons.find((lesson) => lesson.state === 'later')?.id ?? null,
        glance: {
          average: summary.average,
          grade: summary.grade,
          position: summary.position,
          movement: kid.previousRank && kid.rank ? kid.previousRank - kid.rank : null,
          attendance: { rate: summary.attendanceRate, present: kid.present, schoolDays: kid.days },
          unread: { count: 3, topRoom: { id: 'room-dm-class-teacher', name: TEACHERS[kid.school][kid.teacherIdx] } },
        },
        subjectTotals: scores.map((row) => ({ courseId: row.courseId, title: row.title, short: row.short, percent: row.total, classAverage: row.classAverage, colourKey: row.key })),
        passMark: PASS_MARK,
        comingUp: kid.className
          ? [
              { kind: 'assessment', id: 'as-1', title: 'Second CA', courseTitle: 'Advance Maths', date: '2026-09-25', daysAway: 7 },
              { kind: 'event', id: 'ev-1', title: "Parents' evening", courseTitle: null, date: '2026-10-02', daysAway: 14 },
            ]
          : [],
        feed,
        counts: { unreadNotifications: forChild(db, kid.id).filter((row) => !row.isRead).length, unreadMessages: 3 },
        attention,
        fees: { outstanding: fees.outstanding, dueDate: '2026-09-30' },
      });
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/timetable', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const start = mondayOf(request.query.get('weekStart') || FIXTURE_TODAY);
      const end = addDays(start, 4);
      const days = DAY_NAMES.map((day, i) => {
        const date = addDays(start, i);
        return { date, day, isToday: date === FIXTURE_TODAY, holiday: date === '2026-10-01' ? { title: 'Independence Day' } : null, endsEarlyAt: null, events: [] };
      });
      const lessons = kid.className ? days.flatMap((day) => (day.holiday ? [] : lessonsFor(kid, day.date))) : [];
      const termStart = TERMS[0].startDate;
      const weekNumber = start >= mondayOf(termStart) && start <= TERMS[0].endDate
        ? Math.floor((Date.parse(start) - Date.parse(mondayOf(termStart))) / (7 * 86_400_000)) + 1
        : null;
      return ok({
        timezone: 'Africa/Lagos',
        now: FIXTURE_NOW,
        today: FIXTURE_TODAY,
        term: { id: TERMS[0].id, name: TERMS[0].name, startDate: TERMS[0].startDate, endDate: TERMS[0].endDate, totalWeeks: 15 },
        week: { number: weekNumber, start, end, isCurrent: start === mondayOf(FIXTURE_TODAY), prevStart: addDays(start, -7), nextStart: addDays(start, 7), inTerm: weekNumber !== null },
        days,
        periods: PERIODS,
        periodsSource: 'school',
        lessons,
        subjects: kid.className ? SUBJECTS.map(([key, title, short]) => ({ courseId: `co-${kid.school}-${key}`, title, short, colourKey: key })) : [],
      });
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/attendance', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const month = request.query.get('month');
      const summary = {
        term: { id: TERMS[0].id, name: TERMS[0].name, session: TERMS[0].session, startDate: TERMS[0].startDate, endDate: TERMS[0].endDate, isCurrent: true },
        class: kid.className ? { id: `cl-${kid.key}`, name: kid.className } : null,
        schoolDays: kid.days,
        present: kid.present,
        late: kid.late,
        absent: kid.absent,
        onLeave: kid.leave,
        rate: rateOf(kid),
        band: (rateOf(kid) ?? 100) >= 92 ? 'on_track' : 'watch',
      };
      if (!month) return ok(summary);
      if (!/^\d{4}-\d{2}$/.test(month)) return fail(400, 'VALIDATION_FAILED', 'month must be YYYY-MM', [{ field: 'month', reason: 'format' }]);
      const [year, mon] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, '0')}`;
        return { date, status: dayStatus(kid, date) };
      });
      return ok({ ...summary, days });
    } },
    { method: 'GET', pattern: '/parents/me/children/:childId/report-card/terms', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      return ok(TERMS.map((term) => ({ id: term.id, name: term.name, session: term.session, status: term.status, isCurrent: term.isCurrent, endDate: term.endDate })));
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
        type: String(input.type),
        startDate: String(input.startDate),
        endDate: String(input.endDate),
        days: schoolDaysBetween(String(input.startDate), String(input.endDate)),
        note: input.note ? String(input.note) : null,
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
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
      if (row.status !== 'pending') return fail(409, 'CONFLICT', 'Only a pending request can be changed.');
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
      if (row.status !== 'pending') return fail(409, 'CONFLICT', 'Only a pending request can be withdrawn.');
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
      const contacts = kid.className
        ? [
            { userId: `us-${kid.school}-ct`, name: teachers[kid.teacherIdx], role: 'teacher', avatarUrl: null, subtitle: `Class teacher · ${kid.className}`, group: 'class_teacher', phone: '0803 555 0110' },
            ...SUBJECTS.slice(0, 4).map(([key, title], i) => ({ userId: `us-${kid.school}-${key}`, name: teachers[i], role: 'teacher', avatarUrl: null, subtitle: `${title} · teacher`, group: 'teacher', phone: i === 0 ? '0803 555 0112' : null })),
          ]
        : [];
      contacts.push({ userId: 'office', name: 'School office', role: 'school_admin', avatarUrl: null, subtitle: `School office · ${school.name}`, group: 'office', phone: null });
      return ok(contacts);
    } },
    { method: 'POST', pattern: '/chat/office', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      return ok({ _id: `room-office-${kid.school}`, roomId: `room-office-${kid.school}`, name: 'School office', type: 'office', callPhone: null }, undefined, 201);
    } },
    { method: 'POST', pattern: '/chat/rooms', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const other = String((body(request).participants as string[] | undefined)?.[0] ?? '');
      return ok({ _id: `room-dm-${other}`, roomId: `room-dm-${other}`, type: 'one_to_one', callPhone: other.endsWith('-ct') ? '0803 555 0110' : null }, undefined, 201);
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
      return ok(SCHOOLS[kid.school].bank);
    } },
    { method: 'POST', pattern: '/payments/parent/initialize', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const input = body(request) as { feeAssignmentIds?: string[]; amount?: number; provider?: string; idempotencyKey?: string };
      if (!input.idempotencyKey) return fail(400, 'VALIDATION_FAILED', 'idempotencyKey is required', [{ field: 'idempotencyKey', reason: 'required' }]);
      const existing = db.checkoutsByKey.get(input.idempotencyKey);
      if (existing) {
        const checkout = db.checkouts.get(existing) as NonNullable<ReturnType<typeof db.checkouts.get>>;
        return ok({ reference: checkout.reference, checkoutUrl: checkout.checkoutUrl, allocations: checkout.allocations });
      }
      const items = feeItems(db, kid).filter((item) => input.feeAssignmentIds?.includes(item.id) && item.balance > 0);
      if (!items.length || items.length !== (input.feeAssignmentIds?.length ?? 0)) return fail(400, 'BAD_REQUEST', 'A selected fee is already paid or not yours.');
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
      return ok({ reference, checkoutUrl: checkout.checkoutUrl, allocations });
    } },
    { method: 'GET', pattern: '/payments/parent/verify/:reference', handler: (request) => {
      const txn = settle(db, request.params.reference);
      if (!txn) return fail(404, 'NOT_FOUND', 'No payment with that reference.');
      const receipt = receiptOf(db, txn);
      return raw({
        success: true,
        status: 'successful',
        transaction: { _id: txn.id, internalReference: txn.reference, totalAmount: txn.amount, status: 'successful', studentId: txn.childId },
        receipt: { _id: receipt.id, receiptNumber: receipt.receiptNumber, totalPaid: receipt.total },
      });
    } },
    { method: 'POST', pattern: '/payments/parent/bank-transfer', handler: (request) => {
      const kid = child(request);
      if (kid instanceof Response) return kid;
      const input = body(request) as { feeAssignmentIds?: string[]; amount?: number; transferReference?: string; paidOn?: string };
      if (!input.transferReference?.trim()) return fail(400, 'VALIDATION_FAILED', 'Enter the transfer reference.', [{ field: 'transferReference', reason: 'required' }]);
      if (!input.paidOn) return fail(400, 'VALIDATION_FAILED', 'Enter the date you paid.', [{ field: 'paidOn', reason: 'required' }]);
      const items = feeItems(db, kid).filter((item) => input.feeAssignmentIds?.includes(item.id));
      db.counter += 1;
      const txn: TxnRow = {
        id: `tx-bank-${db.counter}`,
        childId: kid.id,
        date: `${input.paidOn}T12:00:00.000Z`,
        items: items.map((item) => ({ feeAssignmentId: item.id, label: item.label, amount: item.balance })),
        amount: Number(input.amount ?? 0),
        method: 'bank_transfer',
        reference: input.transferReference.trim(),
        receiptNumber: null,
        status: 'pending',
        termId: TERMS[0].id,
      };
      db.transactions.unshift(txn);
      return ok({ id: txn.id, status: 'pending', reference: txn.reference }, undefined, 201);
    } },
    { method: 'GET', pattern: '/payments/parent/history', handler: (request) => {
      const childId = request.query.get('childId');
      if (childId) {
        const kid = child(request);
        if (kid instanceof Response) return kid;
      }
      const termId = request.query.get('termId');
      const rows = db.transactions
        .filter((txn) => (!childId || txn.childId === childId) && (!termId || txn.termId === termId))
        .map((txn) => historyRow(db, txn));
      const paged = page(rows, request.query);
      return ok(paged.data, paged.meta);
    } },
    { method: 'GET', pattern: '/payments/parent/receipts', handler: (request) => {
      const childId = request.query.get('childId');
      if (childId) {
        const kid = child(request);
        if (kid instanceof Response) return kid;
      }
      const termId = request.query.get('termId');
      const receipts = db.transactions
        .filter((txn) => txn.status === 'successful' && txn.receiptNumber && (!childId || txn.childId === childId) && (!termId || txn.termId === termId))
        .map((txn) => receiptOf(db, txn));
      return ok({ data: receipts, allowParentDownload: true });
    } },
  ];
}
