import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useActiveChild } from '../hooks/useActiveChild';
import {
  NOTIFICATION_FILTERS,
  useMarkNotificationRead,
  useNotificationCounts,
  useNotificationFeed,
  useReadAllNotifications,
  type NotificationFilterKey,
} from '../hooks/portal/useNotificationFeed';
import { EmptyCard, ErrorCard, LoadingCard, PageHeader } from '../Components/portal/ui/primitives';
import { card, cardFrame, chip, fieldControl, ghostButton, pill, pillTone, rowButton } from '../Components/portal/ui/styles';
import { pathForTarget } from '../lib/portalTargets';
import { relativeDay } from '../lib/format';
import type { AppNotification } from '../types/notifications';

/** The filter chip's label of each category, for the detail tag. */
const CATEGORY_TAG: Record<string, string> = {
  payments: 'Payments',
  grading: 'Results',
  attendance: 'Attendance',
  announcement: 'School',
  leave: 'Leave',
  academics: 'Learning',
  resources: 'Resources',
  messages: 'Messages',
  account: 'Account',
  support: 'Support',
  other: 'Notice',
};

/** The action label of a target page, when the producer gave none. */
const ACTION_FOR: Record<string, string> = {
  payments: 'Open Payments',
  results: 'Open Results',
  grading: 'Open Results',
  attendance: 'Open Attendance',
  leave: 'Open Leave requests',
  messages: 'Open Messages',
  timetable: 'Open Timetable',
  support: 'Open ticket',
};

/**
 * "Today, 09:00" for the detail line.
 *
 * @param value - An ISO timestamp.
 * @returns The day and time.
 */
function whenText(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${relativeDay(value)}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** The child chip's value for "every child". */
const ALL_CHILDREN = 'all';

/**
 * The parent's notifications (B11): one feed per parent across children and
 * schools, filtered by category (All, Unread, Payments, Results, Attendance,
 * School, Leave) and by child (the active child by default). Opening an item
 * marks it read; "Mark all as read" is one request (read-all).
 *
 * @returns The page.
 */
export default function Notifications() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { child, children, status } = useActiveChild();
  // Wait for the active child, so the first request already carries the default child filter.
  const ready = status !== 'loading';
  const childSelectId = useId();

  const initialFilter = NOTIFICATION_FILTERS.find((entry) => entry.key === params.get('filter'))?.key ?? 'all';
  const [filter, setFilter] = useState<NotificationFilterKey>(initialFilter);
  const [childChoice, setChildChoice] = useState<string | null>(null);
  const childId = (childChoice ?? child?.id ?? ALL_CHILDREN) === ALL_CHILDREN ? undefined : (childChoice ?? child?.id);

  const feed = useNotificationFeed(filter, childId, ready);
  const counts = useNotificationCounts(childId, ready);
  const markRead = useMarkNotificationRead();
  const readAll = useReadAllNotifications();
  const selectedId = params.get('id');

  const selected = useMemo<AppNotification | undefined>(
    () => feed.items.find((item) => item.rawId === selectedId) ?? feed.items[0],
    [feed.items, selectedId],
  );
  const childNames = useMemo(() => new Map(children.map((entry) => [entry.id, entry.name])), [children]);

  // Opening an item reads it.
  const { mutate: markOne } = markRead;
  useEffect(() => {
    if (selected && !selected.isRead && selectedId === selected.rawId) markOne(selected.rawId);
  }, [selected, selectedId, markOne]);

  const open = (item: AppNotification): void => {
    const next = new URLSearchParams(params);
    next.set('id', item.rawId);
    setParams(next, { replace: true });
  };

  const unreadOf = (key: NotificationFilterKey): number => {
    const data = counts.data;
    if (!data) return 0;
    if (key === 'all' || key === 'unread') return data.unread;
    const category = NOTIFICATION_FILTERS.find((entry) => entry.key === key)?.category;
    return category ? (data.byCategory[category]?.unread ?? 0) : 0;
  };

  const target = selected?.target;
  const actionLabel = selected ? (selected.actionLabel ?? (target ? ACTION_FOR[target.page] : null)) : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Notifications"
        subtitle="Everything the school has sent you, newest first."
        actions={
          <button type="button" className={ghostButton} disabled={readAll.isPending || (counts.data?.unread ?? 0) === 0} onClick={() => readAll.mutate()}>
            {readAll.isPending ? 'Marking…' : 'Mark all as read'}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {NOTIFICATION_FILTERS.map((entry) => {
            const unread = unreadOf(entry.key);
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={filter === entry.key}
                onClick={() => setFilter(entry.key)}
                title={entry.key === 'unread' ? 'Only what you have not opened' : `Show ${entry.label.toLowerCase()}`}
                className={`${chip(filter === entry.key)}`}
              >
                {entry.label}
                {unread > 0 && entry.key !== 'all' ? (
                  <span className="text-xs font-extrabold" aria-label={`${unread} unread`}>
                    {unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {children.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor={childSelectId} className="text-[13px] font-bold text-tl-muted">
              Child
            </label>
            <select
              id={childSelectId}
              className={`${fieldControl} !min-h-[44px] !w-auto !rounded-full !py-1.5 !text-sm`}
              value={childId ?? ALL_CHILDREN}
              onChange={(event) => setChildChoice(event.target.value)}
            >
              {children.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
              <option value={ALL_CHILDREN}>All children</option>
            </select>
          </div>
        ) : null}
      </div>

      {readAll.isError ? (
        <p role="alert" className="rounded-xl bg-tl-danger-bg px-4 py-3 text-sm font-semibold text-tl-danger">
          Not everything could be marked as read. Please try again.
        </p>
      ) : null}

      {feed.isLoading ? <LoadingCard rows={4} label="Loading notifications" /> : null}
      {feed.isError ? <ErrorCard error={feed.error} title="Notifications couldn't be loaded" onRetry={feed.refetch} /> : null}
      {!feed.isLoading && !feed.isError && feed.items.length === 0 ? (
        <EmptyCard
          title={filter === 'unread' ? 'Nothing unread' : 'Nothing here yet'}
          message={
            filter === 'unread'
              ? 'You have opened everything the school has sent.'
              : `Notifications${childId ? ` about ${childNames.get(childId) ?? 'this child'}` : ''} in this category will appear here.`
          }
        />
      ) : null}

      {feed.items.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 min-[980px]:grid-cols-[minmax(0,1fr)_minmax(260px,380px)]">
          <section className={cardFrame} aria-label="Notification list">
            <ul>
              {feed.items.map((item, index) => {
                const on = selected?.rawId === item.rawId;
                return (
                  <li key={item.id} className={index ? 'border-t border-tl-line-soft' : ''}>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      aria-current={on ? 'true' : undefined}
                      className={`flex min-h-[44px] w-full gap-3 px-[18px] py-4 text-left hover:bg-tl-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tl-link ${on ? 'bg-tl-select' : ''}`}
                    >
                      <span aria-hidden="true" className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-tl-control' : 'bg-tl-link'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold text-tl-ink">
                          {item.title}
                          {item.isRead ? null : <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[13px] leading-normal text-tl-muted">{item.message}</span>
                        {!childId && item.childId && childNames.has(item.childId) ? (
                          <span className="mt-1 block text-xs font-bold text-tl-faint">{childNames.get(item.childId)}</span>
                        ) : null}
                      </span>
                      <span className={`whitespace-nowrap text-[13px] ${on ? 'text-tl-muted' : 'text-tl-faint'}`}>{relativeDay(item.createdAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {feed.hasMore ? (
              <div className="border-t border-tl-line-soft p-4 text-center">
                <button type="button" className={rowButton} onClick={feed.loadMore} disabled={feed.isLoadingMore}>
                  {feed.isLoadingMore ? 'Loading…' : 'Show older'}
                </button>
              </div>
            ) : null}
          </section>

          {selected ? (
            <section className={card} aria-labelledby="notif-detail-title" aria-live="polite">
              <span className={`${pill} ${pillTone.brand}`}>{CATEGORY_TAG[selected.category] ?? 'Notice'}</span>
              <h2 id="notif-detail-title" className="mt-3.5 text-xl font-extrabold tracking-[-0.3px] text-tl-ink">
                {selected.title}
              </h2>
              <p className="mt-[5px] text-[13px] text-tl-faint">
                {[selected.senderName, selected.school?.name, whenText(selected.createdAt)].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.65] text-tl-body">{selected.message}</p>
              {selected.attachments.length ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {selected.attachments.map((file) => (
                    <li key={file.url}>
                      <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-tl-link hover:underline">
                        {file.name ?? 'Attachment'}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {target && actionLabel ? (
                <button type="button" className={`${ghostButton} mt-5`} onClick={() => navigate(pathForTarget(target))}>
                  {actionLabel}
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
