import type {
  AppNotification,
  NotificationAttachment,
  NotificationCategoryKey,
  NotificationSourceKind,
  RawNotification,
  RelatedItem,
} from '../types/notifications';

/**
 * Turning what the notification routes return into what the UI shows.
 *
 * One feed per parent (A10, B11): each item becomes an `AppNotification`, with
 * the §30 target and label, the B11 child and the A11 school. Categories come from the
 * notification's `type`, which the server sets from a closed enum — never from
 * guessing at words in the title.
 */

/** Notification `type` (`NotificationType` in the API) to UI category. */
const TYPE_CATEGORIES: Readonly<Record<string, NotificationCategoryKey>> = {
  chat_message: 'messages',
  announcement: 'announcement',
  attendance_alert: 'attendance',
  fee_reminder: 'payments',
  fee_overdue: 'payments',
  payment_confirmed: 'payments',
  receipt_generated: 'payments',
  result_published: 'grading',
  leave_request_update: 'leave',
  leave_request: 'leave',
  grade_released: 'grading',
  timetable_update: 'academics',
  assessment_reminder: 'academics',
  class_assigned: 'academics',
  class_unassigned: 'academics',
  course_assigned: 'academics',
  course_unassigned: 'academics',
  assignment_due: 'resources',
  assignment_or_resource: 'resources',
  security_alert: 'account',
  login_alert: 'account',
  system_alert: 'other',
  system_notice: 'other',
  app_update: 'other',
};

/** `NotificationCategory` in the API, for items whose type is not in the map. */
const SERVER_CATEGORIES: ReadonlySet<string> = new Set([
  'announcement',
  'attendance',
  'academics',
  'grading',
  'resources',
  'messages',
  'account',
  'payments',
  'leave',
  'other',
]);

/**
 * The category of one item, decided by its type, then the server's own category.
 *
 * @param raw - The item as the API returned it.
 * @param kind - Which feed it came from.
 * @returns The category.
 */
function categoryOf(raw: RawNotification, kind: NotificationSourceKind): NotificationCategoryKey {
  const type = String(raw.type ?? '').toLowerCase();
  const fromType = TYPE_CATEGORIES[type];
  if (fromType) return fromType;

  const declared = String(raw.category ?? raw.metadata?.category ?? '');
  if (SERVER_CATEGORIES.has(declared)) return declared as NotificationCategoryKey;

  return kind === 'announcement' ? 'announcement' : 'other';
}

/**
 * The user id an id-or-object reference points at (`readBy` entries and
 * senders arrive populated or bare).
 *
 * @param value - A string id or a populated user.
 * @returns The id, or an empty string.
 */
function idOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const ref = value as { userId?: unknown; _id?: unknown; id?: unknown };
    return String(ref.userId ?? ref._id ?? ref.id ?? '');
  }
  return '';
}

/**
 * Whether this parent has read the item, whichever field the source used.
 *
 * @param raw - The raw notification or announcement.
 * @param userId - The signed-in parent.
 * @returns True when read.
 */
export function isReadBy(raw: RawNotification, userId: string): boolean {
  if (typeof raw.isRead === 'boolean') return raw.isRead;
  if (typeof raw.read === 'boolean') return raw.read;
  return Array.isArray(raw.readBy) && raw.readBy.some((reader) => idOf(reader) === userId);
}

/**
 * A name for a sender, whether populated, a bare string or missing.
 *
 * @param person - The sender reference.
 * @param fallback - Used when there is nothing better.
 * @returns A display name.
 */
function personName(person: unknown, fallback: string): string {
  if (!person || typeof person === 'string') return fallback;
  const p = person as { name?: string; firstName?: string; lastName?: string; email?: string };
  if (p.name) return p.name;
  const full = [p.firstName, p.lastName].filter(Boolean).join(' ');
  return full || p.email || fallback;
}

/**
 * True for URLs safe to put in an `href`: `http(s)` or a same-site path.
 * Anything else (`javascript:`, `data:`) is dropped rather than rendered.
 *
 * @param url - A URL from a notification.
 * @returns Whether it may be linked to.
 */
export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'));
}

/**
 * The attachments on an item, always as `{ url, name }` and only linkable ones.
 *
 * @param raw - The raw notification.
 * @returns The attachments, possibly empty.
 */
export function attachmentsOf(raw: RawNotification): NotificationAttachment[] {
  const all = [...(Array.isArray(raw.attachments) ? raw.attachments : []), ...(raw.attachment ? [raw.attachment] : [])];
  return all
    .map((entry): NotificationAttachment | null => {
      if (typeof entry === 'string') return { url: entry, name: entry.split('/').pop() || entry };
      if (entry && typeof entry === 'object') return entry as NotificationAttachment;
      return null;
    })
    .filter((entry): entry is NotificationAttachment => Boolean(entry?.url && isSafeUrl(entry.url)));
}

/**
 * The things an item is about — a child, class or course, and a link.
 *
 * @param raw - The item as the API returned it.
 * @returns The related items, possibly empty.
 */
function relatedOf(raw: RawNotification): RelatedItem[] {
  const metadata = (raw.metadata ?? {}) as Record<string, unknown>;
  const related: RelatedItem[] = [];
  for (const key of ['studentName', 'childName', 'className', 'courseName']) {
    const value = metadata[key];
    if (typeof value === 'string' && value) related.push({ label: value });
  }
  const link = metadata.href ?? metadata.url;
  if (typeof link === 'string' && isSafeUrl(link)) related.push({ label: 'Open related item', href: link });
  return related;
}

/**
 * Normalises one API item into the shape the UI renders.
 *
 * @param raw - The item as the API returned it.
 * @param kind - Which inbox it came from.
 * @param userId - The signed-in parent, for the read state.
 * @returns The normalised item.
 */
export function normalizeNotification(
  raw: RawNotification,
  kind: NotificationSourceKind,
  userId: string,
): AppNotification {
  const rawId = String(raw._id ?? raw.id ?? '');
  const isAnnouncement = kind === 'announcement';
  const source = raw.source ?? (raw.metadata as Record<string, unknown> | undefined)?.source;
  const schoolName = raw.schoolName || (raw.metadata as Record<string, unknown> | undefined)?.schoolName || 'School Admin';
  const sourceLabel =
    raw.sourceLabel ||
    (isAnnouncement
      ? 'Announcement'
      : source === 'talim'
        ? 'Talim Alert'
        : source === 'school'
          ? 'School Notification'
          : 'Notification');
  const sender = raw.senderId ?? raw.sender ?? raw.createdBy;

  return {
    id: `${kind}:${rawId}`,
    rawId,
    kind,
    sourceLabel,
    category: categoryOf(raw, kind),
    title: raw.title || (isAnnouncement ? 'School announcement' : 'Notification'),
    message: raw.message || raw.content || raw.body || 'No message provided.',
    createdAt: (isAnnouncement ? raw.publishedAt || raw.createdAt || raw.scheduledFor : raw.createdAt) || '',
    isRead: isReadBy(raw, userId),
    senderName: raw.senderName || raw.senderDisplay?.name || personName(sender, isAnnouncement ? String(schoolName) : sourceLabel),
    senderEmail: raw.senderEmail || raw.senderDisplay?.email || (sender && typeof sender === 'object' ? (sender as { email?: string }).email ?? '' : ''),
    attachments: attachmentsOf(raw),
    related: relatedOf(raw),
    metadata: raw.metadata ?? {},
    ...portalFieldsOf(raw),
  };
}

/**
 * The redesign's fields on a notification (§30 target and label, B11 child,
 * A11 school), read defensively: older rows have none of them. The list
 * (`GET /notifications`) keeps them in `metadata`; the dashboard feed
 * (`FeedItemDto`) lifts `target` and `actionLabel` to the top level.
 *
 * @param raw - The item as the API returned it.
 * @returns The target, label, child and school, each `null` when absent.
 */
function portalFieldsOf(raw: RawNotification): Pick<AppNotification, 'target' | 'actionLabel' | 'childId' | 'school'> {
  const metadata = (raw.metadata ?? {}) as Record<string, unknown>;
  const target = (raw.target ?? metadata.target) as AppNotification['target'] | undefined;
  const actionLabel = raw.actionLabel ?? metadata.actionLabel;
  const school = raw.school as AppNotification['school'] | undefined;
  return {
    target: target && typeof target === 'object' && typeof target.page === 'string' ? target : null,
    actionLabel: typeof actionLabel === 'string' ? actionLabel : null,
    childId: typeof metadata.childId === 'string' ? metadata.childId : null,
    school: school && typeof school === 'object' && typeof school.name === 'string' ? school : null,
  };
}

