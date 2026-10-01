/**
 * B11 notifications for parents. Hand-written; see `./common.ts` for how to
 * swap these for the generated contract.
 *
 * Notifications are per parent and span every linked child's school (A11);
 * producers set `metadata.childId` where a child applies, and the list and
 * counts filter on it with `?childId=`.
 */
import type { RawNotification } from '../notifications';
import type { PortalTarget, SchoolRef } from './common';

/** The categories the parent filters map onto (B11). */
export type PortalNotificationCategory =
  | 'announcement'
  | 'attendance'
  | 'academics'
  | 'grading'
  | 'resources'
  | 'messages'
  | 'account'
  | 'payments'
  | 'leave'
  | 'other';

/** One notification as `GET /notifications` returns it for a parent. */
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

/** One category's numbers in {@link NotificationCounts}. */
export interface CategoryCount {
  all: number;
  unread: number;
}

/** `GET /notifications/counts?childId=` (§30, B11): every category is present. */
export interface NotificationCounts {
  all: number;
  unread: number;
  byCategory: Partial<Record<PortalNotificationCategory, CategoryCount>>;
}

/** `PATCH /notifications/read-all` (§30). */
export interface ReadAllResult {
  updated: number;
  message: string;
}
