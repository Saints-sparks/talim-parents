import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../../services/auth.services';
import {
  getNotificationCounts,
  getNotificationFeed,
  markNotificationRead,
  readAllNotifications,
} from '../../services/portal/notifications';
import { normalizeNotification } from '../../lib/notificationModel';
import { queryKeys, staleTimes } from '../../lib/queryKeys';
import { logger } from '../../lib/logger';
import type { AppNotification } from '../../types/notifications';
import type { Paginated } from '../../types/portal/common';
import type {
  NotificationCounts,
  PortalNotificationCategory,
  RawPortalNotification,
} from '../../types/portal/notifications';

/** The parent's notification filters (design: All, Unread, Payments, Results, Attendance, School, Leave). */
export type NotificationFilterKey = 'all' | 'unread' | 'payments' | 'results' | 'attendance' | 'school' | 'leave';

/** Each filter, its label, and the API category it reads (B11 category map). */
export const NOTIFICATION_FILTERS: readonly { key: NotificationFilterKey; label: string; category?: PortalNotificationCategory }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'payments', label: 'Payments', category: 'payments' },
  { key: 'results', label: 'Results', category: 'grading' },
  { key: 'attendance', label: 'Attendance', category: 'attendance' },
  { key: 'school', label: 'School', category: 'announcement' },
  { key: 'leave', label: 'Leave', category: 'leave' },
];

/** The page size of the feed. */
export const FEED_PAGE_SIZE = 30;

type FeedPages = InfiniteData<Paginated<RawPortalNotification>, number>;

/**
 * All and unread notifications, in total and per category, for the bell and
 * the filter chips. One small request, shared by every caller with the same
 * child, instead of loading the feeds on every page.
 *
 * @param childId - Count one child's notifications; every child when omitted.
 * @returns The query.
 */
export function useNotificationCounts(childId?: string): UseQueryResult<NotificationCounts> {
  const { parentId, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications.counts(parentId || 'anon', childId),
    queryFn: () => getNotificationCounts(childId),
    enabled: Boolean(parentId && isAuthenticated),
    staleTime: staleTimes.fresh,
  });
}

/** What {@link useNotificationFeed} returns. */
export interface NotificationFeed {
  items: AppNotification[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * One filter of the parent's feed, for one child or all children, paged on
 * demand. Normalised once per page change (memoised), newest first as the
 * API sends it.
 *
 * @param filter - The filter chip.
 * @param childId - The child chip (the active child by default); `undefined` is every child.
 * @returns The items and paging.
 */
export function useNotificationFeed(filter: NotificationFilterKey, childId: string | undefined): NotificationFeed {
  const { parentId, isAuthenticated } = useAuth();
  const category = NOTIFICATION_FILTERS.find((entry) => entry.key === filter)?.category;
  const unread = filter === 'unread';

  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications.feed(parentId || 'anon', { filter, childId: childId ?? 'all' }),
    queryFn: ({ pageParam }) => getNotificationFeed({ childId, category, unread, page: pageParam, limit: FEED_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta && last.meta.page < last.meta.lastPage ? last.meta.page + 1 : undefined),
    enabled: Boolean(parentId && isAuthenticated),
    staleTime: staleTimes.fresh,
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: AppNotification[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const raw of page.data ?? []) {
        const item = normalizeNotification(raw, 'notification', parentId);
        if (seen.has(item.rawId)) continue;
        seen.add(item.rawId);
        out.push(item);
      }
    }
    return out;
  }, [query.data, parentId]);

  return {
    items,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    isError: query.isError,
    error: query.error,
    hasMore: Boolean(query.hasNextPage),
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.hasNextPage) void query.fetchNextPage();
    },
    refetch: () => {
      void query.refetch();
    },
  };
}

/**
 * Marks every cached feed item read (or one, by id), without a request.
 *
 * @param pages - One cached feed.
 * @param id - Only this item; every item when omitted.
 * @returns The feed with the items marked read.
 */
function markPagesRead(pages: FeedPages | undefined, id?: string): FeedPages | undefined {
  if (!pages) return pages;
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      data: page.data.map((raw) => (!id || String(raw._id ?? raw.id) === id ? { ...raw, isRead: true, read: true } : raw)),
    })),
  };
}

/**
 * Marks one notification read: the cache first (so the dot goes at once),
 * then the server; the counts and feeds are refetched either way.
 *
 * @returns The mutation, taking the notification's raw id.
 */
export function useMarkNotificationRead() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => {
      queryClient.setQueriesData<FeedPages>({ queryKey: queryKeys.notifications.feed(parentId || 'anon') }, (pages) =>
        markPagesRead(pages, id),
      );
    },
    onError: (error, id) => logger.error('notifications', `Could not mark ${id} read`, error),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Marks everything read in ONE request (`PATCH /notifications/read-all`),
 * which covers announcements too (A10), instead of one request per item.
 *
 * @returns The mutation.
 */
export function useReadAllNotifications() {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: readAllNotifications,
    onMutate: () => {
      queryClient.setQueriesData<FeedPages>({ queryKey: queryKeys.notifications.feed(parentId || 'anon') }, (pages) =>
        markPagesRead(pages),
      );
    },
    onError: (error) => logger.error('notifications', 'Could not mark everything read', error),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
