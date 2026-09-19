import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../services/auth.services';
import { useWebSocketContextSafe } from '../contexts/WebSocketContext';
import { announcementsKey, inboxKey } from './useNotifications';
import { itemsOf } from '../lib/notificationModel';
import type { PaginatedNotifications, RawNotification } from '../types/notifications';

/**
 * Keeps the notification lists live from socket events instead of polling.
 *
 * The server pushes a `notification` event to the recipient's own sockets only.
 * A new per-user notification is put at the top of the cached inbox (when the
 * inbox has been loaded — otherwise the first fetch will include it anyway); an
 * announcement is not in that feed, so its list is refetched. Chat messages
 * have their own badge and are ignored here. Mount once, inside the signed-in
 * shell.
 */
export function useNotificationRealtime(): void {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  const subscribe = useWebSocketContextSafe()?.on;

  useEffect(() => {
    if (!subscribe || !parentId) return undefined;

    return subscribe<RawNotification | null>('notification', (payload) => {
      if (!payload || payload.type === 'chat_message') return;

      const meta = (payload.metadata ?? {}) as Record<string, unknown>;
      if (payload.type === 'announcement' || meta.announcementId) {
        void queryClient.invalidateQueries({ queryKey: announcementsKey(parentId) });
        return;
      }

      const id = String(payload._id ?? payload.id ?? '');
      queryClient.setQueryData<InfiniteData<PaginatedNotifications, number>>(inboxKey(parentId), (current) => {
        if (!current || current.pages.length === 0) return current;
        const alreadyThere = current.pages.some((page) =>
          itemsOf(page).some((item) => String(item._id ?? item.id) === id),
        );
        if (alreadyThere || !id) return current;
        const [first, ...rest] = current.pages;
        return {
          ...current,
          pages: [{ ...first, data: [{ ...payload, isRead: false }, ...itemsOf(first)] }, ...rest],
        };
      });
    });
  }, [subscribe, parentId, queryClient]);
}
