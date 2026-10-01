/**
 * The dev fixtures' in-memory database: one family, built from the design's
 * seed, that the handlers read and change (leave requests, acknowledgements,
 * payments, read state). Dev and test only.
 */
import {
  CHILDREN,
  FEE_CATALOG,
  FIXTURE_TODAY,
  LEAVE,
  PARENT,
  SCHOOLS,
  SUBJECTS,
  TEACHERS,
  TERMS,
  type SeedChild,
} from './seed';

/** Which family the fixtures serve. */
export type FixtureScenario =
  /** Four children at two schools (the design). */
  | 'family'
  /** One child, one school. */
  | 'single'
  /** No linked children yet. */
  | 'empty'
  /** One child the school has not placed in a class. */
  | 'no-class';

/** A leave request row. */
export interface LeaveRow {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  note: string | null;
  status: 'pending' | 'approved' | 'declined';
  decidedBy: { name: string } | null;
  decidedAt: string | null;
  createdAt: string;
}

/** A settled or pending payment. */
export interface TxnRow {
  id: string;
  childId: string;
  date: string;
  items: { feeAssignmentId: string; label: string; amount: number }[];
  amount: number;
  method: 'paystack' | 'opay' | 'stripe' | 'bank_transfer';
  reference: string;
  receiptNumber: string | null;
  status: 'successful' | 'pending' | 'failed';
  termId: string;
}

/** A checkout started with `initialize`, waiting for verify. */
export interface CheckoutRow {
  reference: string;
  childId: string;
  provider: 'paystack' | 'opay' | 'stripe';
  allocations: { feeAssignmentId: string; amount: number }[];
  amount: number;
  checkoutUrl: string;
  settled: boolean;
}

/** One notification row. */
export interface NotificationRow {
  _id: string;
  title: string;
  message: string;
  category: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  childId: string | null;
  schoolKey: string;
  senderName: string;
  target: { page: string };
  actionLabel: string;
}

/** The fixtures' whole state. */
export interface FixtureDb {
  scenario: FixtureScenario;
  children: SeedChild[];
  leave: Map<string, LeaveRow[]>;
  acknowledgements: Map<string, string>;
  /** childId → fee id → extra naira paid through the fixtures. */
  extraPaid: Map<string, Record<string, number>>;
  transactions: TxnRow[];
  checkouts: Map<string, CheckoutRow>;
  checkoutsByKey: Map<string, string>;
  notifications: NotificationRow[];
  profile: typeof PARENT;
  preferredProvider: string | null;
  notificationPrefs: Record<string, boolean | string>;
  chatPrivacy: { showOnlineStatus: boolean; readReceipts: boolean; messagePreview: boolean };
  sessions: { id: string; device: string | null; browser: string | null; os: string | null; ip: string | null; lastUsedAt: string; createdAt: string; current: boolean }[];
  counter: number;
}

/** The fee assignment id of one child's fee. */
export const feeAssignmentId = (child: SeedChild, feeKey: string): string => `fa-${child.key}-${feeKey}`;

/**
 * The children a scenario starts with.
 *
 * @param scenario - Which family.
 * @returns Copies of the seed children.
 */
function childrenFor(scenario: FixtureScenario): SeedChild[] {
  if (scenario === 'empty') return [];
  if (scenario === 'single') return [{ ...CHILDREN[0] }];
  if (scenario === 'no-class') return [{ ...CHILDREN[0], className: null }];
  return CHILDREN.map((child) => ({ ...child }));
}

/**
 * The design's earlier payments, per child, as transactions with receipts.
 *
 * @param children - The family.
 * @returns The seed transactions, newest first.
 */
function seedTransactions(children: SeedChild[]): TxnRow[] {
  const termId = TERMS[0].id;
  const rows: TxnRow[] = [];
  let n = 70;
  for (const child of children) {
    const school = SCHOOLS[child.school];
    for (const [feeKey, [, paid]] of Object.entries(child.feePlan)) {
      if (paid <= 0) continue;
      n += 1;
      const fee = FEE_CATALOG[feeKey];
      const day = String(10 + (n % 18)).padStart(2, '0');
      rows.push({
        id: `tx-${child.key}-${feeKey}`,
        childId: child.id,
        date: `2026-08-${day}T10:00:00.000Z`,
        items: [{ feeAssignmentId: feeAssignmentId(child, feeKey), label: fee.label, amount: paid }],
        amount: paid,
        method: n % 3 === 0 ? 'bank_transfer' : n % 3 === 1 ? 'paystack' : 'opay',
        reference: `TLM-SEED-${n}`,
        receiptNumber: `${school.receiptPrefix}-2026-${String(n).padStart(6, '0')}`,
        status: 'successful',
        termId,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * The design's notifications, one set per child, plus a school-wide notice.
 *
 * @param children - The family.
 * @returns The rows, newest first.
 */
function seedNotifications(children: SeedChild[]): NotificationRow[] {
  const rows: NotificationRow[] = [];
  let n = 0;
  const id = (): string => `69n${String((n += 1)).padStart(21, '0')}`;
  for (const child of children) {
    const teacher = TEACHERS[child.school][child.teacherIdx];
    const school = SCHOOLS[child.school];
    rows.push(
      { _id: id(), title: 'Fee reminder: first term', message: `The balance for ${child.name} is due on 30 September. Bank transfer and card are both accepted.`, category: 'payments', type: 'fee_reminder', createdAt: `${FIXTURE_TODAY}T08:00:00.000Z`, isRead: false, childId: child.id, schoolKey: child.school, senderName: school.name, target: { page: 'payments' }, actionLabel: 'Open Payments' },
      { _id: id(), title: `Results published for ${child.className ?? 'the class'}`, message: `First term totals are now visible for all 12 subjects. ${child.first} placed ${child.rank} in a class of ${child.of}.`, category: 'grading', type: 'result_published', createdAt: `${FIXTURE_TODAY}T07:30:00.000Z`, isRead: false, childId: child.id, schoolKey: child.school, senderName: teacher, target: { page: 'results' }, actionLabel: 'Open Results' },
      { _id: id(), title: `${child.first} was marked absent`, message: `The register for Wednesday 16 September shows ${child.first} as absent. If this is an error, message the class teacher.`, category: 'attendance', type: 'attendance_alert', createdAt: '2026-09-18T09:00:00.000Z', isRead: true, childId: child.id, schoolKey: child.school, senderName: 'Attendance office', target: { page: 'attendance' }, actionLabel: 'Open Attendance' },
      { _id: id(), title: 'Leave request approved', message: `The family travel request for 4 – 7 September was approved by ${teacher}.`, category: 'leave', type: 'leave_request_update', createdAt: '2026-09-03T12:00:00.000Z', isRead: true, childId: child.id, schoolKey: child.school, senderName: teacher, target: { page: 'leave' }, actionLabel: 'Open Leave requests' },
    );
  }
  for (const schoolKey of new Set(children.map((child) => child.school))) {
    rows.push({ _id: id(), title: "Parents' evening, 2 October", message: 'Meetings run from 15:00 to 18:00 in the main hall. Slots are fifteen minutes and are booked through the school office.', category: 'announcement', type: 'announcement', createdAt: '2026-09-14T08:00:00.000Z', isRead: false, childId: null, schoolKey, senderName: SCHOOLS[schoolKey].name, target: { page: 'messages' }, actionLabel: 'Open Messages' });
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Builds a fresh fixture database.
 *
 * @param scenario - Which family to serve.
 * @returns The database.
 */
export function createFixtureDb(scenario: FixtureScenario = 'family'): FixtureDb {
  const children = childrenFor(scenario);
  const leave = new Map<string, LeaveRow[]>();
  for (const child of children) {
    const teacher = TEACHERS[child.school][child.teacherIdx];
    leave.set(
      child.id,
      LEAVE.map((row) => ({
        ...row,
        id: `${row.id.slice(0, -2)}${child.key.slice(0, 2)}`,
        status: row.status,
        decidedBy: row.status === 'pending' ? null : { name: teacher },
        decidedAt: row.status === 'pending' ? null : row.createdAt,
      })),
    );
  }

  return {
    scenario,
    children,
    leave,
    acknowledgements: new Map(),
    extraPaid: new Map(),
    transactions: seedTransactions(children),
    checkouts: new Map(),
    checkoutsByKey: new Map(),
    notifications: seedNotifications(children),
    profile: { ...PARENT },
    preferredProvider: 'paystack',
    notificationPrefs: {
      pushEnabled: true, webPushEnabled: true, emailEnabled: true, messagesEnabled: true,
      announcementsEnabled: true, attendanceEnabled: true, feesEnabled: true, resultsEnabled: true,
      gradingEnabled: true, timetableEnabled: true, resourcesEnabled: true, leaveRequestsEnabled: true,
      securityEnabled: true, systemEnabled: true, quietHoursEnabled: false, quietHoursStart: '21:00', quietHoursEnd: '06:00',
    },
    chatPrivacy: { showOnlineStatus: true, readReceipts: true, messagePreview: true },
    sessions: [
      { id: 'sess-1', device: 'MacBook', browser: 'Chrome', os: 'macOS', ip: '102.89.1.10', lastUsedAt: `${FIXTURE_TODAY}T09:00:00.000Z`, createdAt: '2026-09-10T09:00:00.000Z', current: true },
      { id: 'sess-2', device: 'iPhone', browser: 'Safari', os: 'iOS', ip: '102.89.1.44', lastUsedAt: '2026-09-17T19:20:00.000Z', createdAt: '2026-09-01T08:00:00.000Z', current: false },
    ],
    counter: 900,
  };
}

/** Subject rows for one child, with that child's shifted scores. */
export function subjectScores(child: SeedChild, termShift = 0) {
  return SUBJECTS.map(([key, title, short, base, rank, classAverage], index) => {
    const total = Math.max(38, Math.min(96, base + child.shift + termShift));
    const ca1 = Math.min(20, Math.round(total * 0.21));
    const ca2 = Math.min(20, Math.round(total * 0.19));
    return {
      key,
      courseId: `co-${child.school}-${key}`,
      title,
      short,
      teacher: TEACHERS[child.school][index],
      total,
      scores: [ca1, ca2, total - ca1 - ca2],
      rank,
      classAverage,
    };
  });
}
