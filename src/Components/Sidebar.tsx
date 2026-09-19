import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CgLogOff } from 'react-icons/cg';
import { IoMenu } from 'react-icons/io5';
import { IoIosArrowBack } from 'react-icons/io';
import logo from '../assets/logo.svg';
import { useAuth } from '../services/auth.services';
import { useSchool } from '../hooks/useSchool';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useChatAlerts } from '../contexts/ChatAlertsContext';
import { NAV_ITEMS } from './sidebar/navItems';

/** Below this width the sidebar is a slide-in drawer instead of a fixed rail. */
const MOBILE_BREAKPOINT_PX = 768;

/**
 * The signed-in shell's navigation: a collapsible rail on desktop, a drawer on
 * phones. The drawer locks page scroll while open and closes on Escape or a tap
 * outside it.
 *
 * @returns The sidebar.
 */
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, loading: authLoading, error: authError } = useAuth();
  const { data: school, isLoading: schoolLoading, isError: schoolFailed } = useSchool();
  const { unreadCount: unreadMessages } = useChatAlerts();

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT_PX);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const schoolName = schoolLoading ? 'Loading...' : schoolFailed ? 'Error loading school' : school?.name || 'School Name';
  const schoolLogo = school?.schoolLogo || logo;

  useEffect(() => {
    const onResize = (): void => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const drawerOpen = isMobile && isOpen;
  useLockBodyScroll(drawerOpen);

  const closeDrawer = useCallback(() => setIsOpen(false), []);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/');
  };

  const badgeFor = (badgeKey: 'messages' | undefined): number => (badgeKey === 'messages' ? unreadMessages : 0);

  return (
    <>
      {isMobile && !isOpen && (
        <button
          type="button"
          className="fixed left-4 top-4 z-50 rounded-md p-2 md:hidden"
          onClick={() => setIsOpen(true)}
          aria-label="Open sidebar menu"
        >
          <IoMenu size={24} className="text-[#003366] dark:text-blue-300" />
        </button>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50" onClick={closeDrawer} aria-hidden="true" />
      )}

      <aside
        className={`
          ${isMobile ? 'fixed left-0 top-0 z-[60]' : 'sticky top-0 z-30'}
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
          flex min-h-screen flex-col justify-between bg-white shadow-lg dark:bg-slate-900
          transition-transform duration-300 ease-in-out
        `}
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center justify-between border-b p-3 dark:border-[#2a3a5a]">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <img src={logo} alt="Talim Logo" className="h-11 w-11 rounded-xl" />
            {!isCollapsed && <span className="text-xl font-bold text-[#030E18] dark:text-slate-100">Talim</span>}
          </div>
          {!isMobile && (
            <button
              type="button"
              className="rounded-md border border-gray-300 p-2 dark:border-[#2a3a5a]"
              onClick={() => setIsCollapsed((value) => !value)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <IoIosArrowBack
                size={20}
                className={`text-[#003366] transition-transform dark:text-blue-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>
          )}
          {drawerOpen && (
            <button type="button" className="rounded-md p-2" onClick={closeDrawer} aria-label="Close sidebar menu">
              <div className="rounded-lg border-2 border-[#003366] p-1 dark:border-blue-300">
                <IoIosArrowBack size={20} className="text-[#003366] dark:text-blue-300" />
              </div>
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="m-3 flex min-h-[64px] w-[calc(100%_-_1.5rem)] items-center justify-center gap-3 rounded-[10px] border bg-[#fbfbfb] px-3 py-3 dark:border-[#2a3a5a] dark:bg-[#152238]">
            <img
              src={schoolLogo}
              alt={schoolName}
              className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = logo;
              }}
            />
            <p className="min-w-0 text-center text-sm font-semibold text-[#030E18] dark:text-slate-100">{schoolName}</p>
          </div>
        )}

        <nav className="mt-[10px] flex flex-grow flex-col overflow-y-auto" aria-label="Main navigation">
          <ul>
            {NAV_ITEMS.map(({ path, name, icon: Icon, badgeKey }) => {
              const badge = badgeFor(badgeKey);
              const active = location.pathname === path;
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`m-3 flex items-center rounded-lg px-6 py-3 transition-colors duration-200 ${
                      active
                        ? 'bg-[#bfccd8] text-[#184674] dark:text-blue-100'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => isMobile && closeDrawer()}
                    aria-current={active ? 'page' : undefined}
                    aria-label={badge > 0 ? `${name}, ${badge} unread` : undefined}
                  >
                    <span className="relative mr-3">
                      <Icon className="text-[24px]" />
                      {badge > 0 && isCollapsed && (
                        <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                      )}
                    </span>
                    {!isCollapsed && name}
                    {badge > 0 && !isCollapsed && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[#e0e0e0] p-4 dark:border-[#2a3a5a]">
          <div className="flex items-center gap-3 px-4">
            <button
              type="button"
              className="rounded p-1 text-red-600 hover:text-gray-900 dark:hover:text-slate-100"
              onClick={handleLogout}
              aria-label="Logout"
              disabled={authLoading}
              title={authLoading ? 'Logging out...' : 'Logout'}
            >
              <CgLogOff size={20} />
            </button>
            {!isCollapsed && <span className="text-sm text-[#030E18] dark:text-slate-200">Logout Account</span>}
          </div>
          {authError && <p className="mt-1 text-xs text-red-600">{authError}</p>}
        </div>
      </aside>

      {isMobile && <div className="h-16 md:hidden" />}
    </>
  );
}
