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
import type { NotificationSchool, PortalTarget } from './common';

/**
 * `GET /notifications/counts?childId=` (§30, B11): every category is present.
 * NOT IN CONTRACT yet: v1.5's `support` count (§1), missing from the generated
 * `InboxCountsByCategoryDto`, so it is optional here.
 */
export type NotificationCounts = Omit<Schema<'InboxCountsDto'>, 'byCategory'> & {
  byCategory: Schema<'InboxCountsDto'>['byCategory'] & { support?: CategoryCount };
};

/** The categories the parent filters map onto (B11, and v1.5's `support`). */
export type PortalNotificationCategory = keyof NotificationCounts['byCategory'];

/** One category's numbers in {@link NotificationCounts}. */
export type CategoryCount = Schema<'InboxCountDto'>;

/**
 * One notification as `GET /notifications` returns it: the stored row
 * (`_id`, `metadata.target`…), plus `isRead`, `senderName` and `school`. The
 * dashboard's `FeedItemDto` (top-level `id`, `target`, `actionLabel`) is a
 * different shape, and `normalizeNotification` reads both.
 * HAND-WRITTEN (not `NotificationItemDto`): the normaliser also reads announcements and older payloads (`content`, `body`, `read`, `sender`…).
 */
export interface RawPortalNotification extends RawNotification {
  /** A11: lists carry the school the item came from. */
  school?: NotificationSchool | null;
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
