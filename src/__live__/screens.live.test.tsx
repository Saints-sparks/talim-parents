/**
 * The live screen smoke: renders every parent screen against a running API,
 * signed in as a real parent, once per linked child, and checks each one
 * finishes loading without an error card. No browser: jsdom and the app's
 * own providers, as the fixture tests use them, minus the fixtures.
 *
 * Skipped unless `LIVE_API=1`. Read-only: rendering sends GETs only (the
 * Messages screen is mounted without opening a thread).
 *
 *   LIVE_API=1 VITE_API_BASE_URL=http://localhost:5056 npx vitest run src/__live__
 */
import { type ReactElement, type ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../services/auth.services';
import { SelectedStudentProvider } from '../contexts/SelectedStudentContext';
import { selectedChildStorageKey } from '../contexts/selectedChildStorage';
import { ParentOnboardingProvider } from '../contexts/ParentOnboardingContext';
import { api } from '../lib/apiClient';
import { API_BASE_URL } from '../lib/config';
import { STORAGE_KEYS, sessionStore } from '../lib/session';
import { createTestQueryClient } from '../test-utils/render';
import type { ChildSummary } from '../types/portal/children';

const LIVE = process.env.LIVE_API === '1';
const EMAIL = process.env.LIVE_API_EMAIL ?? 'parent@e2e.talim.test';
const PASSWORD = process.env.LIVE_API_PASSWORD ?? 'Demo#Pass2026';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

// Messages: no socket in jsdom; the chat store is stubbed with no rooms, so
// the screen loads the child's contacts (live) and lists who to write to.
vi.mock('../hooks/useRealtimeChat', () => ({
  useRealtimeChat: () => ({
    chatRooms: [],
    messages: [],
    selectedRoom: null,
    selectedRoomId: null,
    thread: { messages: [], historyLoaded: true, hasMore: false, nextCursor: null, status: 'ready', error: null, loadingOlder: false, olderError: null },
    isLoading: false,
    isLoadingMessages: false,
    isConnected: true,
    connectionStatus: 'connected',
    error: null,
    selectRoom: () => undefined,
    retryJoin: () => undefined,
    loadOlderMessages: () => undefined,
    sendMessage: () => undefined,
    deleteStoredMessage: () => undefined,
    retryMessage: () => undefined,
    discardMessage: () => undefined,
    refreshChatRooms: () => undefined,
    leaveGroup: () => undefined,
    currentUserId: '',
  }),
}));

const pages = {
  Dashboard: (await import('../Pages/Dashboard')).default,
  Attendance: (await import('../Pages/Attendance')).default,
  Timetable: (await import('../Pages/Timetable')).default,
  Results: (await import('../Pages/Results')).default,
  Leave: (await import('../Pages/Leave')).default,
  Messages: (await import('../Pages/Messages')).default,
  Notifications: (await import('../Pages/Notifications')).default,
  Payments: (await import('../Pages/Payments')).default,
  Settings: (await import('../Pages/Settings')).default,
};

/**
 * A child's first name.
 *
 * @param child - The child.
 * @returns e.g. "Ada".
 */
const first = (child: ChildSummary): string => child.name.split(' ')[0];

/** Each screen, the route it is mounted on, the URL it opens, and text it shows once loaded. */
const SCREENS: { name: string; path: string; route: string; element: () => ReactElement; ready?: (child: ChildSummary) => RegExp }[] = [
  { name: 'Dashboard', path: '/dashboard', route: '/dashboard', element: () => <pages.Dashboard />, ready: (child) => new RegExp(`how ${first(child)} is doing`) },
  { name: 'Attendance', path: '/attendance', route: '/attendance', element: () => <pages.Attendance /> },
  { name: 'Timetable', path: '/timetable', route: '/timetable', element: () => <pages.Timetable /> },
  { name: 'Results', path: '/results', route: '/results', element: () => <pages.Results /> },
  { name: 'Leave', path: '/leave', route: '/leave', element: () => <pages.Leave /> },
  { name: 'Messages', path: '/messages', route: '/messages', element: () => <pages.Messages />, ready: (child) => new RegExp(`Talk to ${first(child)}'s teachers`) },
  { name: 'Notifications', path: '/notifications', route: '/notifications', element: () => <pages.Notifications /> },
  { name: 'Payments', path: '/payments', route: '/payments', element: () => <pages.Payments />, ready: () => /Outstanding balance/ },
  ...['account', 'children', 'notifications', 'messages', 'payments', 'security', 'help', 'about'].map((tab) => ({
    name: `Settings · ${tab}`,
    path: '/settings',
    route: `/settings?tab=${tab}`,
    element: () => <pages.Settings />,
  })),
];

describe.skipIf(!LIVE)(`live screens (${API_BASE_URL})`, () => {
  const realFetch = globalThis.fetch;
  let token = '';
  let user: Record<string, unknown> = {};
  let children: ChildSummary[] = [];

  beforeAll(async () => {
    // jsdom's AbortSignal is not Node's, which Node's fetch refuses.
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const { signal: _jsdomSignal, ...rest } = init ?? {};
      return realFetch(input, rest);
    }) as typeof fetch;
    const tokens = await api.post<{ access_token: string }>('/auth/login', { email: EMAIL, password: PASSWORD }, { skipAuth: true });
    token = tokens.access_token;
    const introspect = await api.post<{ user: Record<string, unknown> }>('/auth/introspect', { token }, { skipAuth: true });
    user = introspect.user;
    sessionStore.setToken(token);
    children = await api.get<ChildSummary[]>('/parents/me/children');
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
    sessionStore.setToken(null);
  });

  /**
   * Renders one screen signed in as the live parent, on one child.
   *
   * @param screenDef - The screen.
   * @param childId - The active child.
   * @returns The render result.
   */
  function renderLive(screenDef: (typeof SCREENS)[number], childId: string) {
    const parentId = String(user.userId ?? user._id ?? '');
    window.localStorage.setItem(STORAGE_KEYS.accessToken, token);
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    window.localStorage.setItem(STORAGE_KEYS.parentId, parentId);
    window.localStorage.setItem(`parent_onboarding_${parentId}`, JSON.stringify({ completedSteps: ['parent-profile', 'select-ward'], setupDismissed: true }));
    window.localStorage.setItem(selectedChildStorageKey(parentId), childId);
    sessionStore.__resetForTests();
    sessionStore.setToken(token);
    const queryClient = createTestQueryClient();

    /**
     * The app's providers, without the socket.
     *
     * @param props - Standard children.
     * @param props.children - The routes.
     * @returns The wrapped tree.
     */
    function Wrapper({ children: tree }: { children: ReactNode }) {
      return (
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <SelectedStudentProvider>
              <ParentOnboardingProvider>
                <MemoryRouter initialEntries={[screenDef.route]}>{tree}</MemoryRouter>
              </ParentOnboardingProvider>
            </SelectedStudentProvider>
          </QueryClientProvider>
        </AuthProvider>
      );
    }

    const view = render(
      <Routes>
        <Route path={screenDef.path} element={screenDef.element()} />
        <Route path="*" element={null} />
      </Routes>,
      { wrapper: Wrapper },
    );
    return { view, queryClient };
  }

  /**
   * Waits until no request is in flight and none starts after it (a report
   * card follows its terms, a screen follows the children list).
   *
   * @param queryClient - The screen's client.
   * @returns Resolves once the screen has settled.
   */
  async function settled(queryClient: ReturnType<typeof createTestQueryClient>): Promise<void> {
    for (let quiet = 0; quiet < 3; ) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      quiet = queryClient.isFetching() + queryClient.isMutating() === 0 ? quiet + 1 : 0;
    }
    await waitFor(() => expect(screen.queryAllByRole('status', { name: /^Loading/i })).toHaveLength(0), { timeout: 20_000 });
  }

  it.each(SCREENS.map((entry) => [entry.name, entry] as const))('%s renders for every child without an error', async (_name, screenDef) => {
    const problems: string[] = [];
    for (const child of children) {
      const { view, queryClient } = renderLive(screenDef, child.id);
      await settled(queryClient);
      if (screenDef.ready && !screen.queryByText(screenDef.ready(child))) problems.push(`${child.name}: never showed ${String(screenDef.ready(child))}`);
      const errors = screen.queryAllByText(/couldn.t be loaded|could not be loaded|something went wrong/i).map((node) => node.textContent);
      if (errors.length) problems.push(`${child.name}: ${errors.join(' | ')}`);
      if (!document.body.textContent?.trim()) problems.push(`${child.name}: rendered nothing`);
      view.unmount();
      window.localStorage.clear();
    }
    expect(problems).toEqual([]);
  });
});
