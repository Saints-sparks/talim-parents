import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../services/auth.services';
import { useNotificationCounts } from '../../../hooks/portal/useNotificationFeed';
import { initialsOf, topBarDate } from '../../../lib/format';
import { focusRing } from '../ui/styles';
import { ChildSwitcher } from './ChildSwitcher';

/** Props for {@link TopBar}. */
export interface TopBarProps {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

/**
 * The top bar: the menu button (below 980px), the child switcher, today's
 * date, the bell with the unread count (from `/notifications/counts`, not the
 * feeds) and the parent's name, which opens Settings.
 *
 * @param props - See {@link TopBarProps}.
 * @returns The header.
 */
export function TopBar({ drawerOpen, onToggleDrawer }: TopBarProps) {
  const { user } = useAuth();
  const counts = useNotificationCounts();
  const unread = counts.data?.unread ?? 0;
  const today = useMemo(() => topBarDate(), []);
  const parentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Parent';

  return (
    <header
      data-print-hide="1"
      className="relative z-20 flex flex-wrap items-center gap-3 border-b border-tl-line bg-tl-surface px-[clamp(14px,3vw,26px)] py-3.5"
    >
      <button
        type="button"
        onClick={onToggleDrawer}
        aria-label={drawerOpen ? 'Close the menu' : 'Open the menu'}
        aria-expanded={drawerOpen}
        aria-controls="portal-sidebar"
        className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-tl-line min-[980px]:hidden ${focusRing}`}
      >
        <span aria-hidden="true" className="h-0.5 w-[18px] rounded bg-tl-brand" />
        <span aria-hidden="true" className="h-0.5 w-[18px] rounded bg-tl-brand" />
        <span aria-hidden="true" className="h-0.5 w-[18px] rounded bg-tl-brand" />
      </button>

      <ChildSwitcher />

      <div className="min-w-2 flex-1" />
      <div className="hidden whitespace-nowrap text-sm text-tl-muted sm:block">{today}</div>

      <Link
        to="/notifications"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        title="Announcements and alerts"
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tl-line text-tl-brand hover:bg-tl-bg ${focusRing}`}
      >
        <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 min-w-4 rounded-[9px] bg-tl-badge px-[5px] py-px text-center text-[11px] font-extrabold leading-[1.4] text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Link>

      <Link
        to="/settings"
        title={`${parentName} — parent account`}
        aria-label={`${parentName}, account and settings`}
        className={`flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl ${focusRing}`}
      >
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-tl-select text-[13px] font-extrabold text-tl-brand">
          {initialsOf(parentName)}
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="block whitespace-nowrap text-sm font-extrabold text-tl-ink">{parentName}</span>
          <span className="block text-xs text-tl-muted">Parent</span>
        </span>
      </Link>
    </header>
  );
}
