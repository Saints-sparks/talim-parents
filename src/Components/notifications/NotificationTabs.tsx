import { cn } from '../../lib/utils';
import type { NotificationCounts, NotificationFilter } from '../../lib/notificationModel';
import { TABS } from './categoryMeta';

/**
 * The filter tabs above the list, with a count on each.
 *
 * @param props - Component props.
 * @param props.activeTab - The selected tab.
 * @param props.counts - How many loaded items each tab holds.
 * @param props.hasMore - More pages exist, so the counts are a floor ("12+").
 * @param props.onChange - Called with the tab the parent picked.
 * @returns The tab strip.
 */
export function NotificationTabs({
  activeTab,
  counts,
  hasMore,
  onChange,
}: {
  activeTab: NotificationFilter;
  counts: NotificationCounts;
  hasMore: boolean;
  onChange: (tab: NotificationFilter) => void;
}) {
  return (
    <div
      data-guide="notifications-tabs"
      className="mt-5 overflow-x-auto rounded-lg border border-[#E5EAF2] bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div role="tablist" aria-label="Filter notifications" className="grid min-w-[650px] grid-cols-5">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              className={cn(
                'flex h-12 items-center justify-center gap-2 border-r border-[#EEF2F7] px-4 text-sm font-semibold last:border-r-0 dark:border-slate-800',
                active
                  ? 'border-b-2 border-b-blue-600 text-blue-700 dark:text-blue-300'
                  : 'text-[#344054] hover:bg-[#F8FAFD] dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#EEF2F7] text-[#667085] dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {counts[tab.key] || 0}
                {hasMore && tab.key !== 'unread' ? '+' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
