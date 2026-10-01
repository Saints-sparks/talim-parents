import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../services/auth.services';
import { SelectedStudentProvider, selectedChildStorageKey } from '../contexts/SelectedStudentContext';
import { ParentOnboardingProvider } from '../contexts/ParentOnboardingContext';
import { installFixtures, type FixtureScenario, type InstalledFixtures } from '../dev/fixtures';
import { PARENT } from '../dev/fixtures/seed';
import { STORAGE_KEYS, sessionStore } from '../lib/session';
import { createTestQueryClient } from './render';
import { trackFixtures } from './fixtureRegistry';

/** Options for {@link renderPortal}. */
export interface RenderPortalOptions {
  /** Which family the fixtures serve. Default: the design's multi-school family. */
  scenario?: FixtureScenario;
  /** The URL to start on. Default: `path`. */
  route?: string;
  /** The route pattern the element is mounted on. Default `/`. */
  path?: string;
  /** Start on this child (a fixture child id). */
  childId?: string;
  queryClient?: QueryClient;
}

/** What {@link renderPortal} returns. */
export type PortalRender = RenderResult & {
  fixtures: InstalledFixtures;
  queryClient: QueryClient;
  /** The current location, for asserting navigation. */
  location: () => string;
};

let currentPath = '';

/**
 * Records the router's location for assertions.
 *
 * @returns Nothing visible.
 */
function LocationProbe() {
  const location = useLocation();
  currentPath = `${location.pathname}${location.search}`;
  return null;
}

/**
 * Renders a screen the way the app does — the real auth, children, onboarding
 * and query providers — against the dev fixtures instead of the network, as
 * a signed-in parent who has finished onboarding. Call `fixtures.uninstall()`
 * is done for you by the test setup's cleanup.
 *
 * @param ui - The screen.
 * @param options - Scenario, route and starting child.
 * @returns The render result, the fixtures (database and request log) and the client.
 */
export function renderPortal(ui: ReactElement, options: RenderPortalOptions = {}): PortalRender {
  const { scenario = 'family', path = '/', route = path, childId, queryClient = createTestQueryClient() } = options;
  const fixtures = installFixtures({ scenario });
  trackFixtures(fixtures);

  const user = { userId: PARENT.id, _id: PARENT.id, role: 'parent', firstName: PARENT.firstName, lastName: PARENT.lastName, email: PARENT.email };
  window.localStorage.setItem(STORAGE_KEYS.accessToken, 'fixture-access-token');
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  window.localStorage.setItem(STORAGE_KEYS.parentId, PARENT.id);
  window.localStorage.setItem(`parent_onboarding_${PARENT.id}`, JSON.stringify({ completedSteps: ['parent-profile', 'select-ward'], setupDismissed: true }));
  window.localStorage.setItem(`talim_tour_seen_${PARENT.id}`, '1');
  if (childId) window.localStorage.setItem(selectedChildStorageKey(PARENT.id), childId);
  sessionStore.__resetForTests();

  /**
   * The provider stack of the app, minus the socket.
   *
   * @param props - Standard children.
   * @param props.children - The routes.
   * @returns The wrapped tree.
   */
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <SelectedStudentProvider>
            <ParentOnboardingProvider>
              <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </ParentOnboardingProvider>
          </SelectedStudentProvider>
        </QueryClientProvider>
      </AuthProvider>
    );
  }

  const result = render(
    <Routes>
      <Route
        path="*"
        element={
          <>
            <LocationProbe />
            <Routes>
              <Route path={path} element={ui} />
              <Route path="*" element={null} />
            </Routes>
          </>
        }
      />
    </Routes>,
    { wrapper: Wrapper },
  );
  return { ...result, fixtures, queryClient, location: () => currentPath };
}

/**
 * The requests the fixtures answered for one path, newest last.
 *
 * @param fixtures - The installed fixtures.
 * @param pathPart - A substring of the path.
 * @returns The matching requests.
 */
export function requestsTo(fixtures: InstalledFixtures, pathPart: string) {
  return fixtures.requests.filter((request) => request.path.includes(pathPart));
}
