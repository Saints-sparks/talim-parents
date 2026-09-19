import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../services/auth.services';
import { getNotificationPreferences, updateNotificationPreferences } from '../../services/notification.services';
import { queryKeys } from '../../lib/queryKeys';
import { SkeletonBlock, messageForError } from '../StateComponents';
import { toast } from '../CustomToast';
import { ModalShell } from '../profile/ModalShell';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '../profile/formControls';
import { Toggle } from './Toggle';
import type { NotificationPreferences } from '../../types/notifications';

type SwitchKey =
  | 'announcementsEnabled'
  | 'attendanceEnabled'
  | 'resultsEnabled'
  | 'messagesEnabled'
  | 'feesEnabled'
  | 'resourcesEnabled'
  | 'pushEnabled'
  | 'emailEnabled';

/** The switches a parent sees, in `UpdateNotificationPreferenceDto` field names. */
const SWITCHES: readonly { key: SwitchKey; label: string; description: string }[] = [
  { key: 'announcementsEnabled', label: 'School Announcements', description: 'Important announcements from your school' },
  { key: 'attendanceEnabled', label: 'Attendance Alerts', description: "Your child's attendance and leave request updates" },
  { key: 'resultsEnabled', label: 'Academic Updates & Results', description: 'Grades, results, and academic progress notices' },
  { key: 'messagesEnabled', label: 'Messages', description: 'New messages from teachers and school staff' },
  { key: 'feesEnabled', label: 'Fees & Payment Reminders', description: 'Fee due dates and payment confirmations' },
  { key: 'resourcesEnabled', label: 'Resources & Assignments', description: 'New learning materials and assignment notices' },
  { key: 'pushEnabled', label: 'Push notifications', description: 'Alerts on your phone from the Talim mobile app' },
  { key: 'emailEnabled', label: 'Email notifications', description: 'Receive the above updates via email' },
];

const ROW = 'rounded-lg border border-[#EEF2F7] px-4 py-3 dark:border-slate-800';

/**
 * Chooses which notifications the parent receives, and quiet hours.
 *
 * The saved values are loaded first; if that fails the dialog says so and
 * offers a retry rather than showing defaults that a save would overwrite the
 * real settings with. Only the switches the parent actually changed are sent.
 *
 * @param props - Component props.
 * @param props.onClose - Called after saving or when dismissed.
 * @returns The dialog.
 */
export function NotificationPreferencesModal({ onClose }: { onClose: () => void }) {
  const { parentId } = useAuth();
  const queryClient = useQueryClient();
  const key = [...queryKeys.settings.parent(parentId || 'anon'), 'notification-preferences'] as const;

  const saved = useQuery({ queryKey: key, queryFn: getNotificationPreferences, staleTime: 0 });
  const [changes, setChanges] = useState<Partial<NotificationPreferences>>({});
  const current = { ...saved.data, ...changes } as NotificationPreferences;
  const dirty = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => updateNotificationPreferences(changes),
    onSuccess: (stored) => {
      queryClient.setQueryData(key, stored);
      toast.success('Notification preferences saved');
      onClose();
    },
    onError: (error) => toast.error(messageForError(error, 'Failed to save preferences.')),
  });

  const set = <K extends keyof NotificationPreferences>(field: K, value: NotificationPreferences[K]): void =>
    setChanges((previous) => ({ ...previous, [field]: value }));

  return (
    <ModalShell title="Notification Preferences" onClose={onClose} maxWidth="max-w-lg">
      <div className="px-6 py-5">
        {saved.isPending && (
          <div className="space-y-3" role="status" aria-label="Loading preferences">
            {[0, 1, 2, 3].map((row) => (
              <SkeletonBlock key={row} className="h-14" />
            ))}
          </div>
        )}

        {saved.isError && (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-200">{messageForError(saved.error, 'Could not load your preferences.')}</p>
            <button type="button" onClick={() => void saved.refetch()} className="mt-2 text-sm font-semibold underline text-amber-800 dark:text-amber-200">
              Try again
            </button>
          </div>
        )}

        {saved.data && (
          <div className="space-y-3">
            {SWITCHES.map(({ key: field, label, description }) => (
              <div key={field} className={`${ROW} flex items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#101828] dark:text-slate-100">{label}</p>
                  <p className="text-xs text-[#667085] dark:text-slate-400">{description}</p>
                </div>
                <Toggle checked={Boolean(current[field])} onChange={(next) => set(field, next)} label={label} />
              </div>
            ))}

            <div className={ROW}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#101828] dark:text-slate-100">Quiet hours</p>
                  <p className="text-xs text-[#667085] dark:text-slate-400">Suppress non-urgent notifications between set times</p>
                </div>
                <Toggle
                  checked={Boolean(current.quietHoursEnabled)}
                  onChange={(next) => set('quietHoursEnabled', next)}
                  label="Quiet hours"
                />
              </div>
              {current.quietHoursEnabled && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(
                    [
                      ['quietHoursStart', 'Start time'],
                      ['quietHoursEnd', 'End time'],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="block text-xs text-[#667085] dark:text-slate-400">
                      {label}
                      <input
                        type="time"
                        value={current[field] ?? ''}
                        onChange={(event) => event.target.value && set(field, event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#D0D5DD] bg-white px-2 py-1.5 text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#0A4EA3] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !saved.data || !dirty}
            className={PRIMARY_BUTTON}
          >
            {save.isPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
