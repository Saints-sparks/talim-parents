import type {
  AppNotification,
  NotificationAttachment,
  NotificationCategoryKey,
  NotificationSourceKind,
  PaginatedNotifications,
  RawNotification,
  RelatedItem,
} from '../types/notifications';

/**
 * Turning what the notification routes return into what the UI shows.
 *
 * The API has two inboxes (per-user notifications, school announcements); this
 * file folds both into one `AppNotification` shape. Categories come from the
 * notification's `type`, which the server sets from a closed enum — never from
 * guessing at words in the title.
 */

/** The categories a parent can filter by, in the order the UI lists them. */
export const CATEGORY_KEYS: readonly NotificationCategoryKey[] = [
  'announcement',
  'attendance',
  'academics',
  'grading',
  'payments',
  'messages',
  'resources',
  'account',
  'other',
];

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
  'other',
]);

/** The category of one item, decided by its type, then the server's own category. */
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

/** The things an item is about — a child, class or course, and a link. */
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

/** Whether a notification is the feed's copy of an announcement shown from the other inbox. */
export function isAnnouncementCopy(raw: RawNotification): boolean {
  const meta = (raw.metadata ?? {}) as Record<string, unknown>;
  const source = raw.source ?? meta.source;
  const category = raw.category ?? meta.category;
  const type = String(raw.type ?? '').toLowerCase();
  return source === 'school' && (category === 'announcement' || type.includes('announcement') || Boolean(meta.announcementId));
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
  };
}

/**
 * The items on a page, tolerating a bare array.
 *
 * @param page - One list response.
 * @returns The raw items.
 */
export function itemsOf(page: PaginatedNotifications | RawNotification[] | undefined): RawNotification[] {
  if (!page) return [];
  if (Array.isArray(page)) return page;
  return Array.isArray(page.data) ? page.data : [];
}

/**
 * Newest first; items without a usable date sink to the bottom.
 *
 * @param items - Normalised notifications.
 * @returns A new, sorted array.
 */
export function sortNewest(items: readonly AppNotification[]): AppNotification[] {
  const time = (value: string): number => {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return [...items].sort((a, b) => time(b.createdAt) - time(a.createdAt));
}

/** Counts shown on the tabs. */
export type NotificationCounts = Record<NotificationCategoryKey | 'all' | 'unread', number>;

/**
 * How many items are in each tab.
 *
 * @param items - Normalised notifications.
 * @returns A count per category, plus `all` and `unread`.
 */
export function countNotifications(items: readonly AppNotification[]): NotificationCounts {
  const counts = Object.fromEntries([...CATEGORY_KEYS, 'all', 'unread'].map((key) => [key, 0])) as NotificationCounts;
  for (const item of items) {
    counts.all += 1;
    if (!item.isRead) counts.unread += 1;
    counts[item.category] += 1;
  }
  return counts;
}

/** A tab key: everything, only unread, or one category. */
export type NotificationFilter = 'all' | 'unread' | NotificationCategoryKey;

/**
 * Applies the active tab and the search box.
 *
 * @param items - Normalised notifications.
 * @param filter - The active tab.
 * @param query - The search text.
 * @param categoryLabel - Turns a category into the label the parent sees, so searching for it works.
 * @returns The matching items, order preserved.
 */
export function filterNotifications(
  items: readonly AppNotification[],
  filter: NotificationFilter,
  query: string,
  categoryLabel: (category: NotificationCategoryKey) => string,
): AppNotification[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    const inTab = filter === 'all' ? true : filter === 'unread' ? !item.isRead : item.category === filter;
    if (!inTab) return false;
    if (!needle) return true;
    return [item.title, item.message, item.senderName, item.sourceLabel, categoryLabel(item.category)]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
}

/**
 * The clock time of a timestamp, e.g. "09:30".
 *
 * @param value - An ISO timestamp.
 * @returns The time, or an empty string when the date is unusable.
 */
export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

/**
 * A day label: "Today", "Yesterday" or a short date.
 *
 * @param value - An ISO timestamp.
 * @param now - The current time (a parameter so tests are deterministic).
 * @returns The label, or an empty string when the date is unusable.
 */
export function formatDay(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
