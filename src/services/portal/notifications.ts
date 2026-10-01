import { api, buildQuery } from '../../lib/apiClient';
import type { RawNotification } from '../../types/notifications';
import type { Paginated } from '../../types/portal/common';
import type {
  NotificationCounts,
  PortalNotificationQuery,
  RawPortalNotification,
  ReadAllResult,
} from '../../types/portal/notifications';

/**
 * B11 notifications for parents: one feed per parent across every child and
 * school (A10, A11), filtered by category, unread and child. These routes are
 * about the parent, so they send no child header: `childId` is a filter.
 */

/**
 * One page of the parent's notifications.
 *
 * @param query - Child, category, unread and page.
 * @returns The page and its `meta`.
 * @throws {ApiError} On any non-2xx.
 */
export async function getNotificationFeed(query: PortalNotificationQuery = {}): Promise<Paginated<RawPortalNotification>> {
  const body = await api.get<Paginated<RawPortalNotification> | RawPortalNotification[]>(
    `/notifications${buildQuery({
      childId: query.childId,
      category: query.category,
      unread: query.unread ? 'true' : undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 30,
    })}`,
  );
  if (Array.isArray(body)) {
    return { data: body, meta: { total: body.length, page: 1, lastPage: 1, limit: body.length } };
  }
  return body;
}

/**
 * All and unread, in total and per category (the bell badge and the filter
 * chips). One small request instead of loading the feeds on every page.
 *
 * @param childId - Count only this child's notifications; every child when omitted.
 * @returns The counts.
 * @throws {ApiError} On any non-2xx.
 */
export function getNotificationCounts(childId?: string): Promise<NotificationCounts> {
  return api.get<NotificationCounts>(`/notifications/counts${buildQuery({ childId })}`);
}

/**
 * Marks one notification read for the signed-in parent.
 *
 * @param id - The notification's id.
 * @returns The notification, now read.
 * @throws {ApiError} `NOT_FOUND` when it is not the caller's.
 */
export function markNotificationRead(id: string): Promise<RawNotification> {
  return api.put<RawNotification>(`/notifications/${encodeURIComponent(id)}/read`);
}

/**
 * Marks every notification and announcement read in ONE request (§30, A10),
 * instead of one request per announcement.
 *
 * @returns How many items changed.
 * @throws {ApiError} On any non-2xx.
 */
export function readAllNotifications(): Promise<ReadAllResult> {
  return api.patch<ReadAllResult>('/notifications/read-all', {});
}
