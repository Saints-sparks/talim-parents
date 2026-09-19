import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/utils';
import { filterNotifications, type NotificationFilter } from '../lib/notificationModel';
import { messageForError } from '../Components/StateComponents';
import { toast } from '../Components/CustomToast';
import { categoryLabel } from '../Components/notifications/categoryMeta';
import { NotificationDetailPanel } from '../Components/notifications/NotificationDetailPanel';
import { NotificationList } from '../Components/notifications/NotificationList';
import { NotificationTabs } from '../Components/notifications/NotificationTabs';
import type { AppNotification } from '../types/notifications';

/**
 * The parent's inbox: notifications and school announcements in one list.
 *
 * Both inboxes are scoped to the signed-in parent by the API and cached, then
 * kept live from socket events (no polling). Tabs, search and the open item
 * are local view state over the loaded items; "Load older" pages the server.
 * On a phone the list and the open item are separate full-screen views.
 *
 * @returns The page.
 */
export default function Notifications() {
  const inbox = useNotifications();
  const [activeTab, setActiveTab] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filtered = useMemo(
    () => filterNotifications(inbox.notifications, activeTab, searchQuery, categoryLabel),
    [inbox.notifications, activeTab, searchQuery],
  );

  // The open item, or the first one on wide screens where the pane is always visible.
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const handleSelect = (notification: AppNotification): void => {
    setSelectedId(notification.id);
    setShowDetail(true);
    if (!notification.isRead) {
      inbox.markAsRead(notification.id).catch((error) => toast.error(messageForError(error, 'Could not mark it as read.')));
    }
  };

  const handleMarkSelected = (): void => {
    if (!selected) return;
    inbox
      .markAsRead(selected.id)
      .then(() => toast.success('Notification marked as read.', 'Updated'))
      .catch((error) => toast.error(messageForError(error, 'Could not mark it as read.')));
  };

  const handleMarkAll = (): void => {
    inbox
      .markAllAsRead()
      .then(() => toast.success('All notifications marked as read.', 'Updated'))
      .catch((error) => toast.error(messageForError(error, 'Some notifications could not be marked as read.')));
  };

  const detailOpen = showDetail && selected !== null;

  return (
    <div className="h-full min-h-[calc(100vh-112px)] overflow-hidden bg-[#F7F9FC] dark:bg-[#0f1629]">
      <div className="grid h-full min-h-[calc(100vh-112px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_430px]">
        <section
          data-guide="notifications-list"
          className={cn(
            'min-h-0 flex-col border-r border-[#E5EAF2] bg-white dark:border-slate-800 dark:bg-slate-900',
            detailOpen ? 'hidden lg:flex' : 'flex',
          )}
        >
          <div className="border-b border-[#E5EAF2] px-4 py-5 dark:border-slate-800 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div data-guide="notifications-header">
                <h1 className="text-2xl font-bold text-[#101828] dark:text-slate-100">Notifications</h1>
                <p className="mt-2 text-sm text-[#667085] dark:text-slate-400">
                  Stay updated with all important announcements and alerts.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={!inbox.counts.unread || inbox.isMarkingAll}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#F7F9FB] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Mark all as read
                </button>
                <button
                  type="button"
                  onClick={inbox.refetch}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE5F2] bg-white text-[#344054] hover:bg-[#F7F9FB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Refresh notifications"
                >
                  {inbox.isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <NotificationTabs
              activeTab={activeTab}
              counts={inbox.counts}
              hasMore={inbox.hasMore}
              onChange={setActiveTab}
            />

            <div
              data-guide="notifications-search-sort"
              className="mt-5 flex h-11 max-w-md items-center rounded-lg border border-[#DCE5F2] bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-blue-900/50"
            >
              <Search className="mr-2 h-5 w-5 text-[#8A95A5]" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search notifications..."
                aria-label="Search notifications"
                className="h-full flex-1 border-0 bg-transparent text-sm text-[#101828] outline-none placeholder:text-[#8A95A5] dark:text-slate-100"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
                  <X className="h-4 w-4 text-[#8A95A5]" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <NotificationList
            notifications={filtered}
            selectedId={selected?.id}
            isLoading={inbox.isLoading}
            error={inbox.error}
            partialError={inbox.partialError}
            totalLoaded={inbox.notifications.length}
            hasMore={inbox.hasMore}
            isLoadingMore={inbox.isLoadingMore}
            onSelect={handleSelect}
            onRetry={inbox.refetch}
            onLoadMore={inbox.loadMore}
          />
        </section>

        <aside
          data-guide="notifications-detail"
          className={cn('min-h-0 bg-white dark:bg-slate-900', detailOpen ? 'flex' : 'hidden lg:flex')}
        >
          <NotificationDetailPanel
            notification={selected}
            onBack={() => setShowDetail(false)}
            onMarkAsRead={handleMarkSelected}
          />
        </aside>
      </div>
    </div>
  );
}
