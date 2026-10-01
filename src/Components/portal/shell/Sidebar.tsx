import { useEffect, useMemo, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../services/auth.services';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { useChildLeave } from '../../../hooks/portal/useChildData';
import { useNotificationCounts } from '../../../hooks/portal/useNotificationFeed';
import { useChatAlerts } from '../../../contexts/ChatAlertsContext';
import { focusRing, countBadge } from '../ui/styles';
import { toneOf } from '../ui/primitives';
import { BADGE_MEANING, NAV_GROUPS, SETTINGS_ITEM, type NavBadgeKey, type NavItem } from './navItems';

/** Props for {@link Sidebar}. */
export interface SidebarProps {
  /** Below 980px the sidebar is a drawer; this says whether it is open. */
  drawerOpen: boolean;
  /** Closes the drawer (after a link is followed, or on Escape). */
  onCloseDrawer: () => void;
}

/**
 * The counts the sidebar badges show. Each comes from a request the app makes
 * anyway or from one small cached call: the leave list of the active child,
 * the chat socket's unread count, `/notifications/counts`, and the children
 * list (B13) for who still owes fees.
 *
 * @returns The badge number per key (0 hides the badge).
 */
function useNavBadges(): Record<NavBadgeKey, number> {
  const { childId, children } = useActiveChild();
  const leave = useChildLeave(childId);
  const { unreadCount } = useChatAlerts();
  const counts = useNotificationCounts();

  return useMemo(
    () => ({
      leave: leave.data?.requests.filter((request) => request.status === 'pending').length ?? 0,
      messages: unreadCount,
      notifications: counts.data?.unread ?? 0,
      payments: children.filter((child) => child.outstanding > 0).length,
    }),
    [leave.data, unreadCount, counts.data, children],
  );
}

/**
 * One sidebar link: the design's dot, the label and a badge.
 *
 * @param props - The item, its badge count and the close handler.
 * @param props.item - The entry.
 * @param props.count - The badge number; 0 hides it.
 * @param props.onFollow - Called when the link is followed (closes the drawer).
 * @returns The link.
 */
function NavEntry({ item, count, onFollow }: { item: NavItem; count: number; onFollow: () => void }) {
  const badgeLabel = item.badge && count > 0 ? `, ${count} ${BADGE_MEANING[item.badge]}` : '';
  return (
    <NavLink
      to={item.path}
      title={item.tip}
      onClick={onFollow}
      aria-label={`${item.label}${badgeLabel}`}
      className={({ isActive }) =>
        `flex min-h-[44px] items-center gap-3 rounded-[14px] px-3.5 py-3 text-[15px] transition-colors ${focusRing} ${
          isActive ? 'bg-tl-select font-bold text-tl-brand' : 'font-semibold text-tl-muted hover:bg-tl-bg'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span aria-hidden="true" className={`h-[7px] w-[7px] shrink-0 rounded-full ${isActive ? 'bg-tl-link' : 'bg-tl-control'}`} />
          <span className="flex-1">{item.label}</span>
          {count > 0 ? (
            <span aria-hidden="true" className={countBadge}>
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

/**
 * The portal's navigation (design: main, Progress, School & you, then
 * Account & settings and Log out at the foot), with the active child's
 * school at the top. From 980px it is a sticky column; below, a drawer the
 * top bar's menu button opens, with the page behind it dimmed.
 *
 * @param props - See {@link SidebarProps}.
 * @returns The sidebar.
 */
export function Sidebar({ drawerOpen, onCloseDrawer }: SidebarProps) {
  const navigate = useNavigate();
  const { logout, loading } = useAuth();
  const { child } = useActiveChild();
  const badges = useNavBadges();
  const firstLinkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    firstLinkRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCloseDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, onCloseDrawer]);

  const signOut = async (): Promise<void> => {
    onCloseDrawer();
    await logout();
    navigate('/');
  };

  const school = child?.school;

  return (
    <>
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-[rgba(15,27,46,0.42)] min-[980px]:hidden" onClick={onCloseDrawer} aria-hidden="true" />
      ) : null}
      <aside
        id="portal-sidebar"
        aria-label="Main navigation"
        data-print-hide="1"
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[268px] flex-col overflow-y-auto bg-tl-surface px-3.5 py-5 shadow-[0_0_40px_rgba(15,27,46,0.2)] transition-transform duration-200 min-[980px]:sticky min-[980px]:z-auto min-[980px]:w-[244px] min-[980px]:shrink-0 min-[980px]:translate-x-0 min-[980px]:border-r min-[980px]:border-tl-line min-[980px]:shadow-none ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full max-[979px]:invisible'
        }`}
      >
        <div className="flex items-center gap-2.5 px-3 pb-2 pt-1">
          <div className="h-8 w-8 rounded-[10px] bg-tl-brand-fill" aria-hidden="true" />
          <div className="text-[19px] font-extrabold tracking-[-0.2px] text-tl-ink">Talim</div>
        </div>

        {school ? (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-tl-line-soft bg-tl-subtle px-3.5 py-3">
            <span aria-hidden="true" className={`${toneOf(school.id)} flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-tone-bg text-[13px] font-extrabold text-tone-fg`}>
              {school.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold leading-snug text-tl-ink">{school.name}</div>
              {school.city ? <div className="mt-0.5 text-xs text-tl-faint">{school.city}</div> : null}
            </div>
          </div>
        ) : null}

        <nav className="mt-[18px] flex flex-col gap-5" aria-label="Portal">
          {NAV_GROUPS.map((group, index) => (
            <div key={group.heading ?? 'main'} ref={index === 0 ? firstLinkRef : undefined}>
              {group.heading ? (
                <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-tl-faint">{group.heading}</div>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavEntry key={item.path} item={item} count={item.badge ? badges[item.badge] : 0} onFollow={onCloseDrawer} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sticky bottom-0 mt-auto flex flex-col gap-0.5 border-t border-tl-line-soft bg-tl-surface pb-0.5 pt-3.5">
          <NavEntry item={SETTINGS_ITEM} count={0} onFollow={onCloseDrawer} />
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={loading}
            title="Sign out of the parent portal"
            className={`flex min-h-[44px] items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-[15px] font-semibold text-tl-muted hover:bg-tl-bg hover:text-tl-danger disabled:opacity-60 ${focusRing}`}
          >
            <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-tl-line" />
            <span>{loading ? 'Signing out…' : 'Log out'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
