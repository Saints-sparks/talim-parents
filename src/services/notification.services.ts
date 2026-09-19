import { api, buildQuery } from '../lib/apiClient';
import type {
  NotificationPreferences,
  NotificationPreferencesPayload,
  NotificationSourceKind,
  PaginatedNotifications,
  RawNotification,
} from '../types/notifications';

/**
 * Notification endpoints (`talimBE-V2/src/modules/notification`).
 *
 * Every route here is scoped to the signed-in user server-side — the list
 * forces `recipientId` to the JWT user for a non-staff caller, the detail
 * route runs `canView`, and the announcements inbox 404s for any user id but
 * the caller's. The client therefore never sends a user id to choose *whose*
 * notifications to read; the token decides.
 */

/** Paging accepted by both list routes. */
export interface NotificationListQuery {
  page?: number;
  limit?: number;
}

/** A 24-hex ObjectId — the only shape `GET /notifications/:id` will match. */
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * Splits a client notification id back into its source and raw id.
 *
 * @param id - `"notification:<id>"`, `"announcement:<id>"`, or a bare id.
 * @returns The source and the raw id; bare ids are treated as notifications.
 */
export function parseNotificationId(id: string): { kind: NotificationSourceKind; rawId: string } {
  const [prefix, ...rest] = id.split(':');
  if (prefix === 'announcement') return { kind: 'announcement', rawId: rest.join(':') };
  if (prefix === 'notification') return { kind: 'notification', rawId: rest.join(':') };
  return { kind: 'notification', rawId: id };
}

/**
 * True when an id can address a notification at all. The routes are declared
 * as `:id([0-9a-fA-F]{24})`, so anything else does not even match — a check
 * here turns a confusing 404 into a clear "not found" state.
 *
 * @param rawId - The candidate id.
 * @returns Whether it is a 24-hex ObjectId.
 */
export function isNotificationId(rawId: string): boolean {
  return OBJECT_ID.test(rawId);
}

/**
 * The signed-in user's notifications, newest first.
 *
 * @param query - Page and page size.
 * @returns One page of notifications.
 * @throws {ApiError} On any non-2xx.
 */
export function getNotifications(
  query: NotificationListQuery = {},
): Promise<PaginatedNotifications> {
  return api.get<PaginatedNotifications>(
    `/notifications${buildQuery({ page: 1, limit: 50, ...query })}`,
  );
}

/**
 * The announcements addressed to one user — the server refuses any id but the
 * caller's own, so this is the caller's inbox.
 *
 * @param userId - The signed-in user's id.
 * @param query - Page and page size.
 * @returns One page of announcements.
 * @throws {ApiError} `NOT_FOUND` when `userId` is not the caller's.
 */
export function getAnnouncements(
  userId: string,
  query: NotificationListQuery = {},
): Promise<PaginatedNotifications> {
  return api.get<PaginatedNotifications>(
    `/notifications/announcements/receiver/${encodeURIComponent(userId)}${buildQuery({
      page: 1,
      limit: 50,
      ...query,
    })}`,
  );
}

/**
 * One notification in full.
 *
 * @param rawId - The notification's 24-hex id.
 * @returns The notification.
 * @throws {ApiError} `NOT_FOUND` when it does not exist or is not the
 *   caller's — the server does not distinguish the two, deliberately.
 */
export function getNotificationById(rawId: string): Promise<RawNotification> {
  return api.get<RawNotification>(`/notifications/${encodeURIComponent(rawId)}`);
}

/**
 * One announcement in full.
 *
 * @param rawId - The announcement's id.
 * @returns The announcement.
 * @throws {ApiError} `NOT_FOUND` when it does not exist or is not addressed
 *   to the caller.
 */
export function getAnnouncementById(rawId: string): Promise<RawNotification> {
  return api.get<RawNotification>(`/notifications/announcements/${encodeURIComponent(rawId)}`);
}

/**
 * One notification or announcement, whichever the composite id names.
 *
 * @param id - `"notification:<id>"`, `"announcement:<id>"`, or a bare id.
 * @returns The item, with the source it came from.
 * @throws {ApiError} `NOT_FOUND` when it is not the caller's.
 */
export async function getNotificationDetail(
  id: string,
): Promise<{ kind: NotificationSourceKind; item: RawNotification }> {
  const { kind, rawId } = parseNotificationId(id);
  const item =
    kind === 'announcement' ? await getAnnouncementById(rawId) : await getNotificationById(rawId);
  return { kind, item };
}

/**
 * Marks one notification read for the signed-in user.
 *
 * The reader is always the authenticated caller — the route takes no body, so
 * nothing here can mark a notification read on someone else's behalf.
 *
 * @param rawId - The notification's id.
 * @returns The notification, now read.
 * @throws {ApiError} `NOT_FOUND` when it is not the caller's.
 */
export function markNotificationAsRead(rawId: string): Promise<RawNotification> {
  return api.put<RawNotification>(`/notifications/${encodeURIComponent(rawId)}/read`);
}

/**
 * Marks one announcement read for the signed-in user.
 *
 * @param rawId - The announcement's id.
 * @returns The announcement, now read.
 * @throws {ApiError} `NOT_FOUND` when it is not addressed to the caller.
 */
export function markAnnouncementAsRead(rawId: string): Promise<RawNotification> {
  // MarkAnnouncementReadDto whitelists `userId` only, and ignores it — the
  // reader is the authenticated caller. Sending an empty body is correct.
  return api.put<RawNotification>(
    `/notifications/announcements/${encodeURIComponent(rawId)}/read`,
    {},
  );
}

/**
 * Marks one item read, whichever source its composite id names.
 *
 * @param id - `"notification:<id>"` or `"announcement:<id>"`.
 * @returns The item, now read.
 * @throws {ApiError} `NOT_FOUND` when it is not the caller's.
 */
export function markAsRead(id: string): Promise<RawNotification> {
  const { kind, rawId } = parseNotificationId(id);
  return kind === 'announcement' ? markAnnouncementAsRead(rawId) : markNotificationAsRead(rawId);
}

/**
 * Marks every notification read for the signed-in user in one request.
 *
 * Announcements are a separate collection this route does not touch; the
 * caller marks unread announcements individually.
 *
 * @returns The server's acknowledgement.
 * @throws {ApiError} On any non-2xx.
 */
export function markAllNotificationsAsRead(): Promise<{ message: string }> {
  return api.patch<{ message: string }>('/notifications/read-all', {});
}

/**
 * The signed-in user's notification switches and quiet hours.
 *
 * @returns The preferences, defaults filled in by the server.
 * @throws {ApiError} On any non-2xx.
 */
export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>('/notifications/preferences');
}

/**
 * Updates which notifications the signed-in user receives.
 *
 * @param payload - Only the `UpdateNotificationPreferenceDto` fields that changed.
 * @returns The stored preferences.
 * @throws {ApiError} `VALIDATION_FAILED` on a malformed time or unknown field.
 */
export function updateNotificationPreferences(
  payload: NotificationPreferencesPayload,
): Promise<NotificationPreferences> {
  return api.patch<NotificationPreferences>('/notifications/preferences', payload);
}
