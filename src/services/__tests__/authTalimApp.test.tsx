import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AuthProvider, useAuth } from '../auth.services';
import { getSessions, revokeOtherSessions, revokeSession } from '../portal/account';
import { apiClient } from '../../lib/apiClient';
import { API_BASE_URL } from '../../lib/config';
import { sessionStore } from '../../lib/session';
import { failureOf } from '../../Pages/auth/signInCopy';
import type { LoginOutcome } from '../../types/auth';

vi.mock('../../lib/webPushSync', () => ({
  unsubscribeWebPushOnLogout: vi.fn(),
  startWebPushSync: vi.fn(() => () => undefined),
}));

const REFUSAL =
  'This portal is for parents only. Your account is registered as "student". Please use the Talim app for your role.';

/**
 * A `fetch` Response with a JSON body.
 *
 * @param body - The body.
 * @param status - The HTTP status.
 * @returns The response.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Answers the auth routes the way the API does for a parent.
 *
 * @param url - The requested URL.
 * @returns The response.
 */
function parentApi(url: string): Promise<Response> {
  const path = url.replace(API_BASE_URL, '');
  if (path === '/auth/login') return Promise.resolve(jsonResponse({ access_token: 'tok-1' }));
  if (path === '/auth/introspect') return Promise.resolve(jsonResponse({ active: true, user: { userId: 'p1', role: 'parent' } }));
  if (path === '/auth/refresh') return Promise.resolve(jsonResponse({ access_token: 'tok-2' }));
  if (path === '/parent/settings/password') return Promise.resolve(jsonResponse({ success: true, message: 'Changed', access_token: 'tok-3' }));
  if (path === '/auth/sessions') return Promise.resolve(jsonResponse([]));
  return Promise.resolve(jsonResponse({ success: true, data: { revoked: 1, id: 's1', current: false } }));
}

/**
 * Buttons for the session actions, and the last sign-in outcome as JSON.
 *
 * @returns The probe.
 */
function Probe() {
  const { login, logout, changePassword } = useAuth();
  const [outcome, setOutcome] = useState<LoginOutcome | null>(null);
  return (
    <>
      <button onClick={() => void login('ada@example.com', 'pw').then(setOutcome)}>login</button>
      <button onClick={() => void changePassword({ currentPassword: 'a', newPassword: 'b', confirmPassword: 'b' })}>password</button>
      <button onClick={() => void logout()}>logout</button>
      <output data-testid="outcome">{outcome ? JSON.stringify(outcome) : ''}</output>
    </>
  );
}

/**
 * The paths and `X-Talim-App` values of every request sent so far.
 *
 * @param fetchMock - The stubbed `fetch`.
 * @returns One `[path, header]` pair per call.
 */
function sent(fetchMock: ReturnType<typeof vi.fn>): [string, string | undefined][] {
  return (fetchMock.mock.calls as [string, RequestInit][]).map(([url, init]) => [
    url.replace(API_BASE_URL, ''),
    (init.headers as Record<string, string> | undefined)?.['X-Talim-App'],
  ]);
}

describe('X-Talim-App on the auth calls', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    sessionStore.__resetForTests();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the parents app on sign-in, refresh, change-password, the session routes and sign-out', async () => {
    fetchMock.mockImplementation(parentApi);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('outcome')).toHaveTextContent('"kind":"success"'));
    await act(async () => {
      await expect(apiClient.refreshSession()).resolves.toBe('tok-2');
    });
    await userEvent.click(screen.getByText('password'));
    await waitFor(() => expect(sent(fetchMock).map(([path]) => path)).toContain('/parent/settings/password'));
    await getSessions();
    await revokeSession('s1');
    await revokeOtherSessions();
    await userEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(sent(fetchMock).map(([path]) => path)).toContain('/auth/logout'));

    expect(sent(fetchMock)).toEqual([
      ['/auth/login', 'parents'],
      ['/auth/introspect', 'parents'],
      ['/auth/refresh', 'parents'],
      ['/parent/settings/password', 'parents'],
      ['/auth/sessions', 'parents'],
      ['/auth/sessions/s1', 'parents'],
      ['/auth/sessions/revoke-others', 'parents'],
      ['/auth/logout', 'parents'],
    ]);
  });

  it("shows the API's 403 refusal of another role as the access-denied outcome", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, error: { code: 'FORBIDDEN', message: REFUSAL } }, 403));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('outcome')).not.toBeEmptyDOMElement());

    const outcome = JSON.parse(screen.getByTestId('outcome').textContent ?? '') as LoginOutcome;
    expect(outcome).toEqual({ kind: 'access_denied', message: REFUSAL });
    expect(failureOf(outcome)).toEqual({ tone: 'danger', title: 'Access denied', message: REFUSAL });
    expect(sent(fetchMock)).toEqual([['/auth/login', 'parents']]);
  });
});
