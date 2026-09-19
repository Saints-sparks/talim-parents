import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDay, formatTime } from '../../lib/notificationModel';
import type { AppNotification } from '../../types/notifications';
import { CATEGORY_META } from './categoryMeta';

/**
 * One notification in the list.
 *
 * @param props - Component props.
 * @param props.notification - The item to show.
 * @param props.selected - Whether it is the one open in the detail pane.
 * @param props.onSelect - Called when the row is chosen.
 * @returns The row.
 */
export function NotificationRow({
  notification,
  selected,
  onSelect,
}: {
  notification: AppNotification;
  selected: boolean;
  onSelect: (notification: AppNotification) => void;
}) {
  const meta = CATEGORY_META[notification.category];
  const Icon = meta.Icon;
  const unread = !notification.isRead;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EEF2F7] px-4 py-4 text-left transition hover:bg-[#F8FBFF] dark:border-slate-800 dark:hover:bg-slate-800/60 sm:gap-4',
        selected && 'bg-[#F4F8FF] ring-1 ring-inset ring-[#8EBBFF] dark:bg-slate-800/60 dark:ring-blue-500/50',
      )}
    >
      <span
        className={cn('h-2.5 w-2.5 rounded-full', unread ? meta.dot : 'bg-[#D0D5DD] dark:bg-slate-600')}
        aria-label={unread ? 'Unread' : 'Read'}
      />
      <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl', meta.iconWrap)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate text-sm text-[#101828] dark:text-slate-100',
            unread ? 'font-bold' : 'font-semibold',
          )}
        >
          {notification.title}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm leading-5 text-[#475467] dark:text-slate-400">
          {notification.message}
        </span>
        <span className={cn('mt-2 inline-flex rounded px-2 py-0.5 text-xs font-semibold', meta.badge)}>
          {meta.label}
        </span>
      </span>
      <span className="flex items-center gap-3 sm:gap-5">
        <span className="hidden text-right text-xs text-[#475467] dark:text-slate-400 sm:block">
          <span className={cn('mb-1 ml-auto block h-2 w-2 rounded-full', unread ? 'bg-blue-600' : 'bg-transparent')} />
          <span className="block">{formatTime(notification.createdAt)}</span>
          <span className="block">{formatDay(notification.createdAt)}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-[#667085] dark:text-slate-500" aria-hidden="true" />
      </span>
    </button>
  );
}
