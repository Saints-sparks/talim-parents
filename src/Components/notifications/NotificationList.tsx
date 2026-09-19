import { Bell, ChevronDown, Loader2 } from 'lucide-react';
import { ErrorState, LoadingState } from '../StateComponents';
import type { AppNotification } from '../../types/notifications';
import { NotificationRow } from './NotificationRow';

/**
 * The scrolling list, with its loading, error, empty and "load more" states.
 *
 * @param props - Component props.
 * @param props.notifications - The items to show (already filtered).
 * @param props.selectedId - The open item's id.
 * @param props.isLoading - The first page has not arrived.
 * @param props.error - Set when nothing could be loaded.
 * @param props.partialError - Set when one inbox failed but the other loaded.
 * @param props.totalLoaded - How many items exist before filtering, to word the empty state.
 * @param props.hasMore - More pages can be fetched.
 * @param props.isLoadingMore - A further page is on its way.
 * @param props.onSelect - Called when a row is chosen.
 * @param props.onRetry - Called to refetch after a failure.
 * @param props.onLoadMore - Called to fetch the next page.
 * @returns The list area.
 */
export function NotificationList({
  notifications,
  selectedId,
  isLoading,
  error,
  partialError,
  totalLoaded,
  hasMore,
  isLoadingMore,
  onSelect,
  onRetry,
  onLoadMore,
}: {
  notifications: AppNotification[];
  selectedId: string | undefined;
  isLoading: boolean;
  error: unknown;
  partialError: boolean;
  totalLoaded: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onSelect: (notification: AppNotification) => void;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <LoadingState count={5} className="h-24" label="Loading notifications" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <ErrorState error={error} onRetry={onRetry} title="Couldn't load your notifications" />
      </div>
    );
  }

  if (notifications.length === 0) {
    const nothingAtAll = totalLoaded === 0;
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center p-6 text-center">
        <div>
          <Bell className="mx-auto h-10 w-10 text-[#98A2B3] dark:text-slate-600" aria-hidden="true" />
          <p className="mt-3 font-semibold text-[#101828] dark:text-slate-100">
            {nothingAtAll ? "You're all caught up" : 'No notifications found'}
          </p>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
            {nothingAtAll
              ? 'New announcements and alerts from the school will show up here.'
              : 'Try another filter or search term.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {partialError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <span>Some notifications could not be loaded.</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            selected={notification.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#E8EDF5] px-4 py-3 text-xs text-[#667085] dark:border-slate-800 dark:text-slate-400">
        <span>
          Showing {notifications.length} of {totalLoaded}
          {hasMore ? '+' : ''} notifications
        </span>
        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-[#DCE5F2] px-3 py-2 font-semibold text-blue-700 hover:bg-[#F7F9FB] disabled:opacity-60 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            {isLoadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Load older
          </button>
        )}
      </div>
    </div>
  );
}
