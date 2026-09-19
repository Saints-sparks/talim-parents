import { useCallback, useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuth } from '../services/auth.services';
import {
  getAnnouncements,
  getNotifications,
  markAnnouncementAsRead,
  markAllNotificationsAsRead,
  markAsRead as markItemRead,
} from '../services/notification.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import {
  countNotifications,
  isAnnouncementCopy,
  itemsOf,
  normalizeNotification,
  sortNewest,
  type NotificationCounts,
} from '../lib/notificationModel';
import { logger } from '../lib/logger';
import type { AppNotification, PaginatedNotifications, RawNotification } from '../types/notifications';

/** How many items each inbox returns per page. */
export const NOTIFICATION_PAGE_SIZE = 30;

type Pages = InfiniteData<PaginatedNotifications, number>;

/**
 * The cache key of the per-user notifications feed.
 *
 * @param userId - The signed-in parent.
 * @returns A key under `queryKeys.notifications.list`.
 */
export const inboxKey = (userId: string) => queryKeys.notifications.list(userId, { feed: 'inbox' });

/**
 * The cache key of the school announcements feed.
 *
 * @param userId - The signed-in parent.
 * @returns A key under `queryKeys.notifications.announcements`.
 */
export const announcementsKey = (userId: string) =>
  queryKeys.notifications.announcements(userId, { feed: 'announcements' });

/**
 * The next page number, or `undefined` when the last page has been reached.
 *
 * @param last - The most recent page.
 * @returns The page to ask for next.
 */
function nextPageOf(last: PaginatedNotifications): number | undefined {
  const meta = last?.meta;
  return meta && meta.page < meta.lastPage ? meta.page + 1 : undefined;
}

/**
 * Marks matching raw items read in one cached feed, without a request.
 *
 * @param client - The query client.
 * @param key - The feed's cache key.
 * @param predicate - Which raw items to mark.
 */
function markCachedRead(
  client: QueryClient,
  key: readonly unknown[],
  predicate: (item: RawNotification) => boolean,
): void {
  client.setQueryData<Pages>(key, (current) =>
    current && {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        data: itemsOf(page).map((item) => (predicate(item) ? { ...item, isRead: true, read: true } : item)),
      })),
    },
  );
}

/** What `useNotifications()` returns. */
export interface NotificationsState {
  /** Both inboxes merged, newest first. */
  notifications: AppNotification[];
  counts: NotificationCounts;
  /** True until the first page of both inboxes has settled. */
  isLoading: boolean;
  /** Set only when neither inbox could be loaded. */
  error: unknown;
  /** Set when one inbox failed but the other loaded. */
  partialError: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  refetch: () => void;
  /** Marks one item read; resolves once the server confirms. */
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isMarkingAll: boolean;
}

/**
 * The signed-in parent's notifications and announcements.
 *
 * Both inboxes are scoped to the caller by the API, so nothing here chooses
 * whose notifications to read. They are cached, paged on demand, and kept live
 * by `useNotificationRealtime` (socket events), so there is no polling.
 * Marking read updates the cache immediately and rolls back if the server
 * refuses.
 *
 * @returns The merged list, counts, paging and mutations.
 */
export function useNotifications(): NotificationsState {
  const { parentId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(parentId && isAuthenticated);

  const inbox = useInfiniteQuery({
    queryKey: inboxKey(parentId),
    queryFn: ({ pageParam }) => getNotifications({ page: pageParam, limit: NOTIFICATION_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    staleTime: staleTimes.fresh,
  });

  const announcements = useInfiniteQuery({
    queryKey: announcementsKey(parentId),
    queryFn: ({ pageParam }) => getAnnouncements(parentId, { page: pageParam, limit: NOTIFICATION_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    staleTime: staleTimes.fresh,
  });

  const notifications = useMemo(() => {
    const items: AppNotification[] = [];
    for (const page of announcements.data?.pages ?? []) {
      for (const raw of itemsOf(page)) items.push(normalizeNotification(raw, 'announcement', parentId));
    }
    for (const page of inbox.data?.pages ?? []) {
      for (const raw of itemsOf(page)) {
        if (!isAnnouncementCopy(raw)) items.push(normalizeNotification(raw, 'notification', parentId));
      }
    }
    return sortNewest(items);
  }, [announcements.data, inbox.data, parentId]);

  const counts = useMemo(() => countNotifications(notifications), [notifications]);

  const rollback = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(parentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.announcements(parentId) });
  }, [parentId, queryClient]);

  const markOne = useMutation({
    mutationFn: (item: AppNotification) => markItemRead(item.id),
    onMutate: (item) => {
      const key = item.kind === 'announcement' ? announcementsKey(parentId) : inboxKey(parentId);
      markCachedRead(queryClient, key, (raw) => String(raw._id ?? raw.id) === item.rawId);
    },
    onError: (error, item) => {
      logger.error('notifications', `Could not mark ${item.id} read`, error);
      rollback();
    },
  });

  const markAll = useMutation({
    mutationFn: async (unreadAnnouncements: AppNotification[]) => {
      const results = await Promise.allSettled([
        markAllNotificationsAsRead(),
        ...unreadAnnouncements.map((item) => markAnnouncementAsRead(item.rawId)),
      ]);
      const failed = results.find((result) => result.status === 'rejected');
      if (failed && failed.status === 'rejected') throw failed.reason;
    },
    onMutate: () => {
      markCachedRead(queryClient, inboxKey(parentId), () => true);
      markCachedRead(queryClient, announcementsKey(parentId), () => true);
    },
    onError: (error) => {
      logger.error('notifications', 'Could not mark everything read', error);
      rollback();
    },
  });

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      const target = notifications.find((item) => item.id === id);
      if (!target || target.isRead) return;
      await markOne.mutateAsync(target);
    },
    [markOne, notifications],
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (counts.unread === 0) return;
    const unreadAnnouncements = notifications.filter((item) => item.kind === 'announcement' && !item.isRead);
    await markAll.mutateAsync(unreadAnnouncements);
  }, [counts.unread, markAll, notifications]);

  const bothFailed = inbox.isError && announcements.isError;
  const hasMore = Boolean(inbox.hasNextPage || announcements.hasNextPage);

  return {
    notifications,
    counts,
    isLoading: enabled && inbox.isPending && announcements.isPending,
    error: bothFailed ? inbox.error : null,
    partialError: (inbox.isError || announcements.isError) && !bothFailed,
    isRefreshing: inbox.isFetching || announcements.isFetching,
    hasMore,
    isLoadingMore: inbox.isFetchingNextPage || announcements.isFetchingNextPage,
    loadMore: () => {
      if (inbox.hasNextPage) void inbox.fetchNextPage();
      if (announcements.hasNextPage) void announcements.fetchNextPage();
    },
    refetch: () => {
      void inbox.refetch();
      void announcements.refetch();
    },
    markAsRead,
    markAllAsRead,
    isMarkingAll: markAll.isPending,
  };
}

export default useNotifications;
