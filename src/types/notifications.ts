/**
 * Notification contract types, mirroring
 * `talimBE-V2/src/modules/notification`.
 *
 * A parent's inbox has two sources with two sets of routes:
 *
 * - **Notifications** (`/notifications`) — per-user. The list route forces
 *   `recipientId` to the JWT user for any non-staff caller, and the detail
 *   route runs `canView`, so a parent can only ever read their own.
 * - **Announcements** (`/notifications/announcements/…`) — school-wide, read
 *   through the receiver's own inbox (`receiver/:userId`, which 404s for any
 *   id but the caller's).
 *
 * The UI merges the two, so a notification's client id carries its source:
 * `"notification:<id>"` or `"announcement:<id>"`.
 */

/** Which backend a notification came from. */
export type NotificationSourceKind = 'notification' | 'announcement';

/** A raw notification as the API returns it, before the UI normalises it. */
export interface RawNotification {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  content?: string;
  body?: string;
  type?: string;
  source?: string;
  sourceLabel?: string;
  category?: string;
  createdAt?: string;
  publishedAt?: string;
  scheduledFor?: string;
  isRead?: boolean;
  read?: boolean;
  readBy?: unknown[];
  senderName?: string;
  senderEmail?: string;
  senderDisplay?: { name?: string; email?: string };
  senderId?: unknown;
  sender?: unknown;
  createdBy?: unknown;
  attachments?: unknown[];
  attachment?: unknown;
  metadata?: Record<string, unknown>;
  schoolName?: string;
  [key: string]: unknown;
}

/** One attachment on a notification. */
export interface NotificationAttachment {
  url?: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

/** A notification after the UI has normalised both sources into one shape. */
export interface AppNotification {
  /** `"<kind>:<rawId>"` — unique across both sources, and URL-safe. */
  id: string;
  /** The id the API knows this by. */
  rawId: string;
  kind: NotificationSourceKind;
  sourceLabel: string;
  category: NotificationCategoryKey;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  senderName: string;
  senderEmail: string;
  attachments: NotificationAttachment[];
  related: RelatedItem[];
  metadata: Record<string, unknown>;
}

/** The paginated envelope the notification list routes return. */
export interface PaginatedNotifications {
  data: RawNotification[];
  meta: { total: number; page: number; lastPage: number; limit: number };
}

/**
 * The switches on `GET /notifications/preferences`, mirroring
 * `UpdateNotificationPreferenceDto`. Delivery (in-app, push, email) consults
 * exactly these, so this is the preference set that actually changes what a
 * parent receives.
 */
export interface NotificationPreferences {
  pushEnabled: boolean;
  webPushEnabled: boolean;
  emailEnabled: boolean;
  messagesEnabled: boolean;
  announcementsEnabled: boolean;
  attendanceEnabled: boolean;
  feesEnabled: boolean;
  resultsEnabled: boolean;
  timetableEnabled: boolean;
  resourcesEnabled: boolean;
  securityEnabled: boolean;
  systemEnabled: boolean;
  quietHoursEnabled: boolean;
  /** `HH:mm` */
  quietHoursStart: string;
  /** `HH:mm` */
  quietHoursEnd: string;
  timezone?: string;
}

/** The body of `PATCH /notifications/preferences`: only switches that changed. */
export type NotificationPreferencesPayload = Partial<NotificationPreferences>;

/** The notification categories the UI groups by. */
export type NotificationCategoryKey =
  | 'announcement'
  | 'attendance'
  | 'academics'
  | 'grading'
  | 'payments'
  | 'messages'
  | 'resources'
  | 'account'
  | 'other';

/** A related item shown under a notification (a child, a class, a link). */
export interface RelatedItem {
  label: string;
  href?: string;
}
