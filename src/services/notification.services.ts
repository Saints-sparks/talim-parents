import { api } from '../lib/apiClient';
import type { NotificationPreferences, NotificationPreferencesPayload } from '../types/notifications';

/**
 * The parent's alert switches (`/notifications/preferences`), the store
 * delivery consults. The feed, counts and read routes are in
 * `services/portal/notifications.ts`.
 */

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
export function updateNotificationPreferences(payload: NotificationPreferencesPayload): Promise<NotificationPreferences> {
  return api.patch<NotificationPreferences>('/notifications/preferences', payload);
}
