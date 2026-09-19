import { Bell, CalendarDays, Check, Clock, Download, ExternalLink, FileText, MapPin, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { formatDay, formatTime } from '../../lib/notificationModel';
import type { AppNotification, NotificationAttachment } from '../../types/notifications';
import { CATEGORY_META } from './categoryMeta';

/** A labelled fact about the item: date, time or venue. */
function DetailLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#667085] dark:text-slate-400">{icon}</span>
      <span className="font-semibold text-[#475467] dark:text-slate-300">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * The file kind to show on an attachment, from its name.
 *
 * @param attachment - The attachment.
 * @returns e.g. "PDF", or "File" when there is no extension.
 */
function fileKind(attachment: NotificationAttachment): string {
  const name = attachment.name || attachment.url || '';
  const extension = name.split('?')[0].split('.').pop();
  return extension && extension.length <= 5 && extension !== name ? extension.toUpperCase() : 'File';
}

/** A metadata value as text, or nothing when it is not a plain string or number. */
function metaText(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/**
 * The open notification: its text, facts, related items and attachments.
 *
 * Read state changes and the list live in the page; this only reports what the
 * parent asked for. There is deliberately no delete: the API only lets school
 * staff delete a notification, so a parent-side button could not persist.
 *
 * @param props - Component props.
 * @param props.notification - The open item, or `null` for the empty pane.
 * @param props.onBack - Called to close the pane (phones show it full screen).
 * @param props.onMarkAsRead - Called to mark the item read.
 * @returns The detail pane.
 */
export function NotificationDetailPanel({
  notification,
  onBack,
  onMarkAsRead,
}: {
  notification: AppNotification | null;
  onBack: () => void;
  onMarkAsRead: () => void;
}) {
  if (!notification) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <Bell className="mx-auto h-10 w-10 text-[#98A2B3] dark:text-slate-600" aria-hidden="true" />
          <p className="mt-3 font-semibold text-[#101828] dark:text-slate-100">Select a notification</p>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
            Choose an update from the list to read details.
          </p>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[notification.category];
  const Icon = meta.Icon;
  const facts = notification.metadata;
  const date = metaText(facts, 'date');
  const time = metaText(facts, 'time');
  const venue = metaText(facts, 'venue');
  const links = notification.related.filter((item) => item.href);
  const labels = notification.related.filter((item) => !item.href);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[#E8EDF5] px-5 py-4 dark:border-slate-800">
        <span className={cn('rounded px-3 py-1 text-xs font-semibold', meta.badge)}>{meta.label}</span>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE5F2] text-[#667085] hover:bg-[#F7F9FB] dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Close detail"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <h2 className="text-xl font-bold leading-7 text-[#101828] dark:text-slate-100">{notification.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#475467] dark:text-slate-400">
          <span>{formatTime(notification.createdAt)}</span>
          <span aria-hidden="true">•</span>
          <span>{formatDay(notification.createdAt)}</span>
          {!notification.isRead && (
            <>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Unread
              </span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-[#667085] dark:text-slate-500">From {notification.senderName}</p>

        <div className="mt-5 flex h-40 items-center justify-center rounded-lg bg-gradient-to-br from-[#EAF3FF] via-[#F5F9FF] to-[#EAF3FF] text-blue-700 dark:from-slate-800 dark:via-slate-800/70 dark:to-slate-800 dark:text-blue-300">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
              <Icon className="h-10 w-10" aria-hidden="true" />
            </div>
            <div className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 break-words text-sm leading-6 text-[#344054] dark:text-slate-300">
          {notification.message.split('\n').map((line, index) => (
            <p key={`${notification.id}-${index}`}>{line}</p>
          ))}
        </div>

        {(date || time || venue) && (
          <div className="mt-5 space-y-3 text-sm text-[#344054] dark:text-slate-300">
            {date && <DetailLine icon={<CalendarDays className="h-4 w-4" />} label="Date" value={date} />}
            {time && <DetailLine icon={<Clock className="h-4 w-4" />} label="Time" value={time} />}
            {venue && <DetailLine icon={<MapPin className="h-4 w-4" />} label="Venue" value={venue} />}
          </div>
        )}

        {notification.related.length > 0 && (
          <div className="mt-6 border-t border-[#E8EDF5] pt-5 dark:border-slate-800">
            <p className="text-xs font-semibold text-[#667085] dark:text-slate-400">Related</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {labels.map((item) => (
                <span
                  key={item.label}
                  className="rounded-lg bg-[#F8FAFD] px-3 py-2 text-sm font-semibold text-[#101828] dark:bg-slate-800 dark:text-slate-100"
                >
                  {item.label}
                </span>
              ))}
              {links.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F8FAFD] px-3 py-2 text-sm font-semibold text-blue-700 hover:underline dark:bg-slate-800 dark:text-blue-300"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {notification.attachments.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-bold text-[#101828] dark:text-slate-100">
              Attachments ({notification.attachments.length})
            </p>
            <div className="mt-3 space-y-2">
              {notification.attachments.map((attachment, index) => (
                <a
                  key={`${attachment.url}-${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#E5EAF2] bg-white p-3 hover:bg-[#F8FBFF] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#101828] dark:text-slate-100">
                        {attachment.name || `Attachment ${index + 1}`}
                      </span>
                      <span className="text-xs text-[#667085] dark:text-slate-400">
                        {fileKind(attachment)} • Download
                      </span>
                    </span>
                  </span>
                  <Download className="h-5 w-5 shrink-0 text-[#667085] dark:text-slate-400" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#E8EDF5] p-5 dark:border-slate-800">
        <button
          type="button"
          onClick={onMarkAsRead}
          disabled={notification.isRead}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] text-sm font-semibold text-[#344054] hover:bg-[#F7F9FB] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {notification.isRead ? 'Read' : 'Mark as read'}
        </button>
      </div>
    </div>
  );
}
