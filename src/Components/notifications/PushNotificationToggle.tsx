import type { ReactNode } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { cn } from '../../lib/utils';

/** The label and hint every state of the row shares. */
function Copy({ hint, hintClassName, children }: { hint: string; hintClassName?: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 pr-4">
      <p className="text-sm font-medium text-[#101828] dark:text-slate-100">Browser Notifications</p>
      <p className={cn('mt-0.5 text-xs text-[#667085] dark:text-slate-400', hintClassName)}>{hint}</p>
      {children}
    </div>
  );
}

/**
 * The browser push switch on the Settings page.
 *
 * Shows why it cannot be used (unsupported browser, permission blocked in the
 * browser's site settings) instead of a switch that does nothing, and surfaces a failed subscribe or
 * unsubscribe from the hook's own error state.
 *
 * @returns The row.
 */
export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3">
        <Copy hint="Not supported in this browser" />
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-slate-800 dark:text-slate-400">
          Unavailable
        </span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="py-3" role="status">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-[#101828] dark:text-slate-100">Browser Notifications</p>
          <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
            Off in this browser
          </span>
        </div>
        <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">
          Your browser is set not to show Talim alerts, so you will not see pop-up notifications while Talim is closed
          or in the background. Notifications inside Talim keep working as usual.
        </p>
        <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">
          To turn them back on, open this site&apos;s settings from your browser&apos;s address bar (usually the icon
          beside the web address), set Notifications to Allow, and reload the page.
        </p>
      </div>
    );
  }

  const handleToggle = async (): Promise<void> => {
    try {
      if (isSubscribed) await unsubscribe();
      else await subscribe();
    } catch {
      // The hook keeps the failure in `error`, which is shown below.
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <Copy
        hint={
          isSubscribed
            ? 'Receiving school updates, fee alerts, and Talim announcements in this browser.'
            : 'Get notified about school announcements and important updates even when the tab is closed.'
        }
      >
        {error && <p className="mt-1 text-xs text-red-500 dark:text-red-300">{error}</p>}
      </Copy>

      <button
        type="button"
        role="switch"
        aria-checked={isSubscribed}
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isSubscribed ? 'Disable browser notifications' : 'Enable browser notifications'}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50',
          isSubscribed ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            isSubscribed ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}
