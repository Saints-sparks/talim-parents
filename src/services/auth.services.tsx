import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, apiClient, AUTH_LOGOUT_EVENT } from '../lib/apiClient';
import { API_BASE_URL } from '../lib/config';
import { ApiError } from '../lib/apiError';
import { logger } from '../lib/logger';
import { sessionStore, STORAGE_KEYS, type SessionUser } from '../lib/session';
import { startWebPushSync, unsubscribeWebPushOnLogout } from '../lib/webPushSync';
import { changeParentPassword, type ChangePasswordPayload } from './settings.services';
import type {
  AuthContextValue,
  AuthUser,
  IntrospectResponse,
  LoginOutcome,
  LoginResponse,
} from '../types/auth';

/**
 * Re-exported so the modules that still import it from here keep working.
 * New code should import it from `src/lib/config`.
 *
 * @deprecated Import `API_BASE_URL` from `../lib/config`.
 */
export { API_BASE_URL };

const AuthContext = createContext<AuthContextValue | null>(null);

/** How long to wait for the push unsubscribe before logging out anyway. */
const PUSH_UNSUBSCRIBE_TIMEOUT_MS = 3000;

/**
 * The persisted parent, if any.
 *
 * @returns The stored user, or `null`.
 */
function readStoredUser(): AuthUser | null {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.user) || 'null') as AuthUser | null;
  } catch {
    return null;
  }
}

/**
 * The parent's own user id, whichever key the API used.
 *
 * @param user - The signed-in parent.
 * @returns The id, or an empty string.
 */
function idOf(user: AuthUser | null): string {
  return user?.userId ?? user?._id ?? user?.id ?? '';
}

/**
 * Forgets everything this browser holds about one parent.
 *
 * @param parentId - Whose UI state to clear.
 */
function clearStoredSession(parentId: string): void {
  if (parentId) window.localStorage.removeItem(`selected_student_${parentId}`);
  for (const key of Object.values(STORAGE_KEYS)) window.localStorage.removeItem(key);
  sessionStore.clear();
}

/**
 * Holds the signed-in parent, and is the only place tokens are written.
 *
 * It also gives `apiClient` its refresh callback, so a 401 anywhere in the app
 * is recovered once rather than by each caller, and listens for the client's
 * give-up event to sign the parent out.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [authToken, setAuthToken] = useState<string | null>(() =>
    window.localStorage.getItem(STORAGE_KEYS.accessToken),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentId = idOf(user) || window.localStorage.getItem(STORAGE_KEYS.parentId) || '';
  const schoolId =
    (user?.schoolId as string | undefined) ?? window.localStorage.getItem(STORAGE_KEYS.schoolId);

  // The session store is what services and the socket read; keep it in step.
  useEffect(() => {
    sessionStore.set(user as SessionUser | null, { access: authToken });
  }, [user, authToken]);

  // Keep the backend's push subscription in step with the browser (heals a
  // lost row, follows a rotated endpoint, clears a revoked permission).
  const syncParentId = user ? parentId : '';
  useEffect(() => {
    if (!syncParentId) return undefined;
    return startWebPushSync(syncParentId);
  }, [syncParentId]);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    const currentParentId = parentId;
    const token = authToken;

    try {
      // While the token is still valid: this browser stops receiving pushes.
      await Promise.race([
        unsubscribeWebPushOnLogout(currentParentId, token),
        new Promise((resolve) => setTimeout(resolve, PUSH_UNSUBSCRIBE_TIMEOUT_MS)),
      ]);
      if (token) await api.post('/auth/logout', {});
    } catch (err) {
      // A local sign-out must succeed even when the server cannot be reached.
      logger.warn('auth', 'Server logout failed; signing out locally', err);
    } finally {
      clearStoredSession(currentParentId);
      setAuthToken(null);
      setUser(null);
      setLoading(false);
    }
  }, [parentId, authToken]);

  // `apiClient` calls this once when a request comes back 401. Returning null
  // makes it raise AUTH_LOGOUT_EVENT, handled below.
  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const body = await api.post<LoginResponse>('/auth/refresh', {}, { skipAuth: true });
      if (!body?.access_token) return null;
      window.localStorage.setItem(STORAGE_KEYS.accessToken, body.access_token);
      if (body.refresh_token) {
        window.localStorage.setItem(STORAGE_KEYS.refreshToken, body.refresh_token);
      }
      // Written synchronously so the retried request picks it up immediately.
      sessionStore.setToken(body.access_token);
      setAuthToken(body.access_token);
      return body.access_token;
    } catch (err) {
      logger.warn('auth', 'Token refresh failed', err);
      return null;
    }
  }, []);

  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    apiClient.setRefreshCallback(refresh);
    const onForcedLogout = (): void => {
      void logoutRef.current();
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    return () => {
      apiClient.setRefreshCallback(null);
      window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
    setLoading(true);
    setError(null);

    try {
      // skipAuth: a 401 here is "wrong password", not "session expired", and
      // must never trigger a token refresh.
      const tokens = await api.post<LoginResponse>(
        '/auth/login',
        { email, password },
        { skipAuth: true, timeoutMs: 15_000 },
      );
      if (!tokens?.access_token) throw new Error('The server did not return a session.');

      window.localStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
      if (tokens.refresh_token) {
        window.localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
      }
      sessionStore.setToken(tokens.access_token);

      const introspect = await api.post<IntrospectResponse>(
        '/auth/introspect',
        { token: tokens.access_token },
        { skipAuth: true, timeoutMs: 15_000 },
      );
      const userData = introspect?.user;
      if (!userData) throw new Error('The server did not return an account.');

      if (userData.role !== 'parent') {
        clearStoredSession('');
        const friendlyRole = userData.role?.replace(/_/g, ' ') || 'unknown';
        const message =
          `This portal is for parents only. Your account is registered as "${friendlyRole}". ` +
          'Please use the Talim app for your role.';
        setError(message);
        setLoading(false);
        return { kind: 'access_denied', message };
      }

      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
      window.localStorage.setItem(STORAGE_KEYS.schoolId, (userData.schoolId as string) ?? '');
      window.localStorage.setItem(STORAGE_KEYS.parentId, idOf(userData));

      setAuthToken(tokens.access_token);
      setUser(userData);
      setLoading(false);
      return { kind: 'success' };
    } catch (err) {
      const message = loginErrorMessage(err);
      setError(message);
      setLoading(false);
      return {
        kind: err instanceof ApiError && err.status === 401 ? 'invalid_credentials' : 'unknown',
        message,
      };
    }
  }, []);

  const updateUser = useCallback((partial: Partial<AuthUser>): void => {
    setUser((current) => {
      const next = { ...(current ?? {}), ...partial } as AuthUser;
      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(next));
      return next;
    });
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordPayload): Promise<void> => {
    const result = await changeParentPassword(payload);
    // The password change rotates the session: adopt the new token the same way
    // a refresh does, so the next request and the socket use it.
    if (result.access_token) {
      window.localStorage.setItem(STORAGE_KEYS.accessToken, result.access_token);
      sessionStore.setToken(result.access_token);
      setAuthToken(result.access_token);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      parentId,
      schoolId,
      authToken,
      loading,
      error,
      login,
      logout,
      updateUser,
      changePassword,
      refreshSession: () => apiClient.refreshSession(),
      isAuthenticated: Boolean(authToken),
    }),
    [user, parentId, schoolId, authToken, loading, error, login, logout, updateUser, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * The message to show under the sign-in form, keyed on the error's code rather
 * than its wording.
 *
 * @param err - Whatever the sign-in threw.
 * @returns The sentence to show.
 */
function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Incorrect email or password. Please double-check your details and try again.';
    }
    if (err.code === 'NETWORK_OFFLINE') {
      return "You're offline. Check your connection and try again.";
    }
    if (err.code === 'SERVICE_UNAVAILABLE' || err.code === 'REQUEST_TIMEOUT') {
      return "We couldn't reach the server. Please check your connection and try again.";
    }
    if (err.code === 'RATE_LIMITED') {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    return err.message;
  }
  return err instanceof Error && err.message
    ? err.message
    : 'Something went wrong signing you in. Please try again.';
}

/**
 * The signed-in parent and the session actions.
 *
 * @returns The auth context.
 * @throws When called outside `AuthProvider`.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
