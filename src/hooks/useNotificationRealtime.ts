import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../services/auth.services';
import { useWebSocketContextSafe } from '../contexts/WebSocketContext';
import { queryKeys } from '../lib/queryKeys';
import type { RawNotification } from '../types/notifications';

/**
 * Keeps notifications live from socket events instead of polling.
 *
 * The server pushes a `notification` event to the recipient's own sockets.
 * The feeds are filtered (by category, unread and child), so rather than
 * guess which cached page an item belongs in, every notification query (the
 * counts behind the bell and the visible feed) is refetched, and so is each
 * dashboard's "Recent updates". Chat messages have their own badge and are
 * ignored here. Mount once, inside the signed-in shell.
 *
 * @returns Nothing.
 */
export function useNotificationRealtime(): void {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  const subscribe = useWebSocketContextSafe()?.on;

  useEffect(() => {
    if (!subscribe || !parentId) return undefined;
    return subscribe<RawNotification | null>('notification', (payload) => {
      if (!payload || payload.type === 'chat_message') return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.child.all, predicate: (query) => query.queryKey[2] === 'dashboard' });
    });
  }, [subscribe, parentId, queryClient]);
}
