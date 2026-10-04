/**
 * Dev fixtures: a stand-in for the Part B and C parent API, which is being
 * built in parallel with this app.
 *
 * Turned on with `VITE_USE_FIXTURES=true` in `.env.local` for `npm run dev`
 * only: `main.tsx` imports this module behind `import.meta.env.DEV`, which
 * Vite replaces with `false` in a production build, so the module (and the
 * seed data) never ship. Tests install it directly.
 *
 * Every request the app makes is answered here; a route without a fixture is
 * a 404 named in the console, never a request to a real server with the
 * fixtures' fake token.
 */
import { API_BASE_URL } from '../../lib/config';
import { apiClient, type RequestConfig } from '../../lib/apiClient';
import { logger } from '../../lib/logger';
import { createFixtureDb, type FixtureDb, type FixtureScenario } from './db';
import { buildRoutes } from './handlers';
import { fail, findRoute } from './router';

export type { FixtureDb, FixtureScenario } from './db';
export { FIXTURE_TODAY } from './seed';

/** Options for {@link installFixtures}. */
export interface InstallFixturesOptions {
  /** Which family to serve. Default: `localStorage.talim_fixture_scenario`, else `family`. */
  scenario?: FixtureScenario;
  /** Artificial latency per request, so loading states show in dev. Default 0. */
  latencyMs?: number;
}

/** What {@link installFixtures} hands back. */
export interface InstalledFixtures {
  /** The live database, for tests to inspect or change. */
  db: FixtureDb;
  /** Every request answered so far, oldest first (method, path, headers). */
  requests: { method: string; path: string; query: string; headers: Record<string, string>; body: unknown }[];
  /** Restores the network. */
  uninstall: () => void;
}

/** The key the dev scenario switcher reads. */
export const SCENARIO_STORAGE_KEY = 'talim_fixture_scenario';

/**
 * The scenario saved for dev, if any.
 *
 * @returns The stored scenario, or `family`.
 */
function storedScenario(): FixtureScenario {
  try {
    const value = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (value === 'single' || value === 'empty' || value === 'no-class' || value === 'no-term' || value === 'family') return value;
  } catch {
    /* storage may be blocked */
  }
  return 'family';
}

/**
 * Lower-cases nothing and flattens a `HeadersInit` into a plain record.
 *
 * @param headers - The request headers.
 * @returns A record of header name to value.
 */
function headersOf(headers: RequestConfig['headers']): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...(headers as Record<string, string>) };
}

/**
 * Answers every API request from an in-memory database.
 *
 * @param options - Scenario and latency.
 * @returns The database, the request log and an uninstaller.
 */
export function installFixtures(options: InstallFixturesOptions = {}): InstalledFixtures {
  const db = createFixtureDb(options.scenario ?? storedScenario());
  const routes = buildRoutes(db);
  const requests: InstalledFixtures['requests'] = [];
  const latency = options.latencyMs ?? 0;

  apiClient.setTransport(async (url, init) => {
    const parsed = new URL(url.startsWith(API_BASE_URL) ? url.slice(API_BASE_URL.length) || '/' : url, 'http://fixtures.local');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = headersOf(init.headers);
    let body: unknown = null;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    requests.push({ method, path: parsed.pathname, query: parsed.search, headers, body });
    if (latency) await new Promise((resolve) => setTimeout(resolve, latency));

    const match = findRoute(routes, method, parsed.pathname);
    if (!match) {
      logger.warn('fixtures', `No fixture for ${method} ${parsed.pathname}`);
      return fail(404, 'NOT_FOUND', `No fixture for ${method} ${parsed.pathname}`);
    }
    return match.route.handler({ method, path: parsed.pathname, params: match.params, query: parsed.searchParams, body, headers });
  });

  return { db, requests, uninstall: () => apiClient.setTransport(null) };
}
