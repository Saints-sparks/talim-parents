import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/apiError';
import { useAuth } from '../services/auth.services';

/** How many times a failed query is retried before the error reaches the UI. */
const MAX_RETRIES = 2;

/**
 * Decides whether a failed request is worth retrying. A 4xx the parent caused
 * (validation, forbidden, not found) never becomes a success on retry, and
 * retrying an expired session just delays the sign-out.
 *
 * @param failureCount - How many attempts have already failed.
 * @param error - The thrown value.
 * @returns Whether TanStack Query should try again.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof ApiError) return error.isTransient && !error.isAuthError;
  return true;
}

/**
 * Builds the app's QueryClient. Exported so tests can create an isolated
 * client per render instead of sharing one cache across test cases.
 *
 * @returns A configured client.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      },
      mutations: {
        // A mutation that failed may have already been applied server-side;
        // retrying it could charge a parent twice. Never retry automatically.
        retry: false,
      },
    },
  });
}

/**
 * Empties the cache when the session ends (a sign-out, a forced sign-out or
 * an account deletion), so one parent's data never shows to whoever signs in
 * next on this browser.
 *
 * @param client - The app's QueryClient.
 * @param signedIn - Whether there is a session now.
 */
export function useClearCacheOnSignOut(client: QueryClient, signedIn: boolean): void {
  const wasSignedIn = useRef(signedIn);
  useEffect(() => {
    if (wasSignedIn.current && !signedIn) client.clear();
    wasSignedIn.current = signedIn;
  }, [client, signedIn]);
}

/**
 * Wraps the app in a single QueryClient. The client is created in state so a
 * re-render never throws the cache away; it is emptied on sign-out
 * ({@link useClearCacheOnSignOut}). Sits inside `AuthProvider`.
 *
 * @param props - Standard children.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  const { authToken } = useAuth();
  useClearCacheOnSignOut(client, Boolean(authToken));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
