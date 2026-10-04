/**
 * B11 notifications for parents.
 *
 * Notifications are per parent and span every linked child's school (A11);
 * producers set `metadata.childId` where a child applies, and the list and
 * counts filter on it with `?childId=` (sibling rows are left out, rows with
 * no child key stay).
 */
import type { Schema } from '../apiContract';
import type { RawNotification } from '../notifications';
import type { PortalTarget, SchoolRef } from './common';

/** `GET /notifications/counts?childId=` (§30, B11): every category is present. */
export type NotificationCounts = Schema<'InboxCountsDto'>;

/** The categories the parent filters map onto (B11). */
export type PortalNotificationCategory = keyof NotificationCounts['byCategory'];

/** One category's numbers in {@link NotificationCounts}. */
export type CategoryCount = Schema<'InboxCountDto'>;

/**
 * One notification as `GET /notifications` returns it: the stored row
 * (`_id`, `metadata.target`…), plus `isRead`, `senderName` and `school`.
 * BACKEND GAP: the list documents no response schema; the dashboard's
 * `FeedItemDto` (top-level `id`, `target`, `actionLabel`) is a different
 * shape, and `normalizeNotification` reads both.
 */
export interface RawPortalNotification extends RawNotification {
  /** A11: lists carry the school the item came from. */
  school?: SchoolRef | null;
  metadata?: {
    childId?: string;
    target?: PortalTarget;
    actionLabel?: string;
    [key: string]: unknown;
  };
}

/** Query accepted by `GET /notifications` (B11 and §30). */
export interface PortalNotificationQuery {
  childId?: string;
  category?: PortalNotificationCategory;
  unread?: boolean;
  page?: number;
  limit?: number;
}

/** `PATCH /notifications/read-all` (§30). */
export type ReadAllResult = Schema<'ReadAllResponseDto'>;
