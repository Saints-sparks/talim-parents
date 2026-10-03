import { useChatPrivacy, useNotificationPrefs, useUpdateChatPrivacy, useUpdateNotificationPrefs } from '../../../hooks/portal/useAccount';
import { getErrorMessage } from '../../../lib/apiError';
import { PushNotificationToggle } from '../../notifications/PushNotificationToggle';
import { ErrorCard, LoadingCard } from '../ui/primitives';
import { ToggleRow } from './rows';
import type { NotificationPreferences } from '../../../types/notifications';
import type { ChatPrivacy } from '../../../types/portal/school';

/** The parent's alert switches, as the design lists them, and the field each one writes. */
const ALERTS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'attendanceEnabled', label: 'Attendance alerts', description: 'Told the same day a child is absent or late.' },
  { key: 'resultsEnabled', label: 'Result updates', description: 'When new scores or a report are published.' },
  { key: 'feesEnabled', label: 'Fee reminders', description: 'Before a payment falls due, and when one is confirmed.' },
  { key: 'leaveRequestsEnabled', label: 'Leave decisions', description: 'When a request is approved or declined.' },
  { key: 'announcementsEnabled', label: 'School announcements', description: 'Term dates, events and general notices.' },
  { key: 'messagesEnabled', label: 'Messages', description: 'Alerts for new messages from teachers and the office.' },
];

/**
 * The Notifications tab: what the school may alert the parent about (the
 * switches delivery follows, `/notifications/preferences`) and browser push.
 *
 * @returns The panel.
 */
export function NotificationsPanel() {
  const prefs = useNotificationPrefs();
  const save = useUpdateNotificationPrefs();
  if (prefs.isPending) return <LoadingCard rows={4} label="Loading your alert settings" />;
  if (prefs.isError) return <ErrorCard error={prefs.error} title="Your alert settings couldn't be loaded" onRetry={() => void prefs.refetch()} />;
  return (
    <div className="mt-[18px]">
      {ALERTS.map((alert) => (
        <ToggleRow
          key={alert.key}
          label={alert.label}
          description={alert.description}
          checked={prefs.data[alert.key] !== false}
          onChange={(next) => save.mutate({ [alert.key]: next })}
        />
      ))}
      <div className="border-t border-tl-line-soft py-1 [&_p]:!text-tl-ink">
        <PushNotificationToggle />
      </div>
      {save.isError ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-tl-danger">
          {getErrorMessage(save.error, 'That change could not be saved.')}
        </p>
      ) : null}
    </div>
  );
}

/** The privacy switches of the Messages tab. */
const PRIVACY: { key: keyof ChatPrivacy; label: string; description: string }[] = [
  { key: 'showOnlineStatus', label: 'Show online status', description: 'Let teachers see when you are active.' },
  { key: 'readReceipts', label: 'Read receipts', description: 'Send read receipts when you open a message.' },
  { key: 'messagePreview', label: 'Message preview', description: 'Show the message in alerts; off, alerts say only "New message".' },
];

/**
 * The Messages tab: online status, read receipts and message preview
 * (`ChatPreference`, A16 and B10).
 *
 * @returns The panel.
 */
export function MessagesPanel() {
  const privacy = useChatPrivacy();
  const save = useUpdateChatPrivacy();
  if (privacy.isPending) return <LoadingCard rows={3} label="Loading your message settings" />;
  if (privacy.isError) return <ErrorCard error={privacy.error} title="Your message settings couldn't be loaded" onRetry={() => void privacy.refetch()} />;
  return (
    <div className="mt-[18px]">
      {PRIVACY.map((entry) => (
        <ToggleRow
          key={entry.key}
          label={entry.label}
          description={entry.description}
          checked={privacy.data[entry.key] !== false}
          onChange={(next) => save.mutate({ [entry.key]: next })}
        />
      ))}
      {save.isError ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-tl-danger">
          {getErrorMessage(save.error, 'That change could not be saved.')}
        </p>
      ) : null}
    </div>
  );
}
