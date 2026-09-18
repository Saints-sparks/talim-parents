import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/** Extra knobs `renderWithProviders` accepts on top of Testing Library's. */
export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial history entries for the router. Defaults to `['/']`. */
  route?: string;
  /** Reuse a client across renders (to assert on its cache). */
  queryClient?: QueryClient;
}

/**
 * A QueryClient tuned for tests: no retries and no background refetching, so a
 * failing request surfaces its error on the first tick instead of after
 * seconds of backoff.
 *
 * @returns An isolated client.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Renders a component inside the providers every page depends on — the router
 * and a fresh QueryClient — so tests exercise the real tree.
 *
 * @param ui - The element under test.
 * @param options - Testing Library options plus `route` and `queryClient`.
 * @returns The Testing Library result, plus the `queryClient` in use.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { route = '/', queryClient = createTestQueryClient(), ...rest } = options;

  /**
   * The provider stack under test.
   *
   * @param props - Standard children.
   * @param props.children - The element being rendered.
   * @returns The wrapped tree.
   */
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...rest }), queryClient };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
