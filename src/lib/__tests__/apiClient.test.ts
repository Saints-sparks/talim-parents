import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api, apiClient, buildQuery, AUTH_LOGOUT_EVENT } from '../apiClient';
import { ApiError } from '../apiError';
import { sessionStore, STORAGE_KEYS } from '../session';

/** Narrows a caught value to `ApiError`, failing the test when it is not one. */
function asApiError(err: unknown): ApiError {
  expect(err).toBeInstanceOf(ApiError);
  return err as ApiError;
}

/** Builds a `fetch` Response with a JSON body. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStore.__resetForTests();
    apiClient.setRefreshCallback(null);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the payload untouched when the API sends no envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [1, 2], total: 2 }));
    await expect(api.get('/payments/parent/history')).resolves.toEqual({ data: [1, 2], total: 2 });
  });

  it('unwraps the { success, data } envelope when the API sends one', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: 'abc' } }));
    await expect(api.get('/notifications/abc')).resolves.toEqual({ id: 'abc' });
  });

  it('leaves a { success, fees } body alone — it is a payload, not an envelope', async () => {
    // The due-fees endpoint answers `{ success: true, fees: [...] }`. Unwrapping
    // on `success` alone would throw the fees away.
    fetchMock.mockResolvedValue(jsonResponse({ success: true, fees: [{ _id: 'f1' }] }));
    await expect(api.get('/payments/parent/due-fees')).resolves.toEqual({
      success: true,
      fees: [{ _id: 'f1' }],
    });
  });

  it('attaches the bearer token from the session store', async () => {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, 'tok-1');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.get('/parents/me/children');
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-1');
  });

  it('sends no Authorization header when skipAuth is set', async () => {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, 'tok-1');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.post('/auth/login', { email: 'a@b.c' }, { skipAuth: true });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('throws a typed ApiError carrying the server error code and field details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Some fields need attention.',
            details: [{ field: 'leaveType', reason: 'must be a valid enum value' }],
          },
        },
        400,
      ),
    );

    const err = asApiError(await api.post('/leave-requests', {}).catch((e) => e));
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.fieldErrors()).toEqual({ leaveType: 'must be a valid enum value' });
  });

  it('refreshes once for concurrent 401s, not once per request', async () => {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, 'stale');
    const refresh = vi.fn(async () => {
      // A real refresh is a network round-trip, so all three 401s land while
      // it is still in flight — which is what single-flight has to survive.
      await new Promise((resolve) => setTimeout(resolve, 10));
      sessionStore.setToken('fresh');
      return 'fresh';
    });
    apiClient.setRefreshCallback(refresh);

    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>)?.Authorization;
      return auth === 'Bearer fresh' ? jsonResponse({ ok: true }) : jsonResponse({}, 401);
    });

    const results = await Promise.all([
      api.get('/parents/me/children'),
      api.get('/payments/parent/summary'),
      api.get('/notifications'),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
  });

  it('signs the parent out when the refresh fails', async () => {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, 'stale');
    apiClient.setRefreshCallback(async () => null);
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'TOKEN_EXPIRED' } }, 401));

    const onLogout = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);

    const err = asApiError(await api.get('/parents/me/children').catch((e) => e));
    expect(err.isAuthError).toBe(true);
    expect(onLogout).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  });

  it('never refreshes on a 401 from a skipAuth call — wrong password is not an expired session', async () => {
    const refresh = vi.fn(async () => 'fresh');
    apiClient.setRefreshCallback(refresh);
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHENTICATED' } }, 401));

    await api.post('/auth/login', {}, { skipAuth: true }).catch(() => undefined);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('reports an unreachable server as a transient SERVICE_UNAVAILABLE', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = asApiError(await api.get('/parents/me/children').catch((e) => e));
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.isTransient).toBe(true);
  });
});

describe('buildQuery', () => {
  it('drops undefined, null and empty values so the API never sees ?termId=undefined', () => {
    expect(buildQuery({ studentId: 'a', termId: undefined, academicYearId: null, q: '' })).toBe(
      '?studentId=a',
    );
  });

  it('returns an empty string when nothing survives', () => {
    expect(buildQuery({ a: undefined })).toBe('');
  });
});
