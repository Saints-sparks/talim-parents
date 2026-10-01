import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import { pagePad } from '../ui/styles';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** At and above this width the sidebar is a column; below, a drawer. */
const DRAWER_BREAKPOINT = 980;

/**
 * The signed-in shell: sidebar, top bar and the routed page, on the design's
 * page colour. The drawer closes when the route changes or the window grows
 * past the breakpoint, and locks the page behind it while open.
 *
 * @returns The layout.
 */
export function PortalLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useLockBodyScroll(drawerOpen);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = (): void => {
      if (window.innerWidth >= DRAWER_BREAKPOINT) setDrawerOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="flex min-h-[100dvh] bg-tl-bg font-manrope text-tl-ink">
      <a
        href="#portal-main"
        className="sr-only z-[90] rounded-lg bg-tl-surface px-4 py-3 font-bold text-tl-brand focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar drawerOpen={drawerOpen} onCloseDrawer={closeDrawer} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar drawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen((open) => !open)} />
        <main id="portal-main" tabIndex={-1} className={`${pagePad} focus:outline-none`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
