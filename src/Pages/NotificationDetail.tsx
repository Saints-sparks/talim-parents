import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, Mail, Paperclip } from 'lucide-react';
import {
  getNotificationDetail,
  isNotificationId,
  markAsRead,
  parseNotificationId,
} from '../services/notification.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import { sessionStore } from '../lib/session';
import { logger } from '../lib/logger';
import { EmptyState, ErrorState, LoadingState } from '../Components/StateComponents';
import { attachmentsOf } from '../lib/notificationModel';
import type { RawNotification } from '../types/notifications';

/**
 * Formats a notification timestamp for the detail header.
 *
 * @param value - An ISO timestamp.
 * @returns A readable date and time, or an em dash.
 */
function formatSentAt(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The best available name for whoever sent this.
 *
 * @param item - The raw notification.
 * @returns A display name.
 */
function senderNameOf(item: RawNotification): string {
  if (item.senderName) return item.senderName;
  if (item.senderDisplay?.name) return item.senderDisplay.name;
  const sender = item.senderId ?? item.sender ?? item.createdBy;
  if (sender && typeof sender === 'object') {
    const person = sender as { firstName?: string; lastName?: string; email?: string };
    const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
    if (name) return name;
    if (person.email) return person.email;
  }
  return item.schoolName || item.sourceLabel || 'Talim';
}

/**
 * One notification or announcement, in full.
 *
 * Reached by a deep link — a push-notification tap, or a shared URL — so it
 * fetches the item by id rather than relying on the list being in memory.
 * `GET /notifications/:id` runs `canView` server-side and answers 404 for
 * anything that is not the signed-in parent's, so there is no way to read
 * another parent's notification by guessing an id.
 *
 * @returns The page.
 */
export default function NotificationDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = sessionStore.getParentId() ?? 'anon';

  const { rawId } = parseNotificationId(id);
  const addressable = isNotificationId(rawId);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [...queryKeys.notifications.all, 'detail', id] as const,
    queryFn: () => getNotificationDetail(id),
    enabled: addressable,
    staleTime: staleTimes.fresh,
  });

  const markRead = useMutation({
    mutationFn: () => markAsRead(id),
    onSuccess: () => {
      // The bell count and the list both change.
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.announcements(userId) });
    },
  });

  const item = data?.item;
  const alreadyRead = item?.isRead === true || item?.read === true;

  // Opening a notification is what marks it read. Fire-and-forget: if it
  // fails, the parent has still read it and the list will catch up — but the
  // failure is logged rather than swallowed.
  const shouldMark = Boolean(item) && !alreadyRead;
  useEffect(() => {
    if (!shouldMark || markRead.isPending || markRead.isSuccess || markRead.isError) return;
    markRead.mutate(undefined, {
      onError: (err) => logger.error('notifications', `Could not mark ${id} read`, err),
    });
  }, [shouldMark, markRead, id]);

  const back = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-gray-600 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <ArrowLeft size={18} className="text-[#003366] dark:text-blue-300" aria-hidden="true" />
      Back
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      {back}

      {!addressable && (
        <EmptyState
          icon={<Bell size={36} className="text-gray-300 dark:text-slate-600" aria-hidden="true" />}
          title="Notification not found"
          message="That link doesn't point at a notification we can open."
        />
      )}

      {addressable && isPending && <LoadingState count={2} className="h-28" label="Loading notification" />}

      {addressable && isError && (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          title="Couldn't open this notification"
          fallback="This notification is no longer available."
        />
      )}

      {addressable && item && (
        <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header className="border-b border-gray-100 pb-4 dark:border-slate-800">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#003366]/10 px-2.5 py-0.5 text-xs font-semibold text-[#003366] dark:bg-blue-950/60 dark:text-blue-300">
                {item.sourceLabel ?? (data.kind === 'announcement' ? 'Announcement' : 'Notification')}
              </span>
              {!alreadyRead && !markRead.isSuccess && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  New
                </span>
              )}
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {item.title || 'Notification'}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Mail size={18} className="text-gray-500 dark:text-slate-400" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800 dark:text-slate-200">{senderNameOf(item)}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {formatSentAt(item.createdAt ?? item.publishedAt)}
                </p>
              </div>
            </div>
          </header>

          <div className="mt-4 whitespace-pre-line text-gray-700 dark:text-slate-300">
            {item.message || item.content || item.body || 'No message provided.'}
          </div>

          {attachmentsOf(item).length > 0 && (
            <section className="mt-6 border-t border-gray-100 pt-4 dark:border-slate-800">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Attachments
              </h2>
              <ul className="space-y-2">
                {attachmentsOf(item).map((attachment) => (
                  <li key={attachment.url}>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#003366] hover:underline dark:text-blue-300"
                    >
                      <Paperclip size={14} aria-hidden="true" />
                      {attachment.name || 'Attachment'}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
