/**
 * The live contract check: signs in to a running API and checks that every
 * parent screen gets the shape it reads, for every linked child (across
 * schools), through the app's own services and API client.
 *
 * Skipped unless `LIVE_API=1`. Read-only: it sends GETs only (plus the sign-in).
 *
 *   VITE_API_BASE_URL=http://localhost:5056 npm run test:live
 *   (or LIVE_API=1 VITE_API_BASE_URL=http://localhost:5056 npx vitest run src/__live__)
 *
 * `LIVE_API_EMAIL` and `LIVE_API_PASSWORD` choose the parent (default: the
 * e2e seed's parent). A failure lists each screen, child and JSON path that
 * broke the rules in `src/test-utils/screenContract.ts`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/apiClient';
import { API_BASE_URL } from '../lib/config';
import { sessionStore } from '../lib/session';
import { ApiError } from '../lib/apiError';
import { getChildren } from '../services/portal/children';
import { getChildDashboard } from '../services/portal/learner';
import { CHILD_CHECKS, FAMILY_CHECKS, childHeaderMismatches, type SeenRequest } from '../test-utils/screenContract';
import { checkShape } from '../test-utils/shape';
import type { ChildSummary } from '../types/portal/children';

const LIVE = process.env.LIVE_API === '1';
const EMAIL = process.env.LIVE_API_EMAIL ?? 'parent@e2e.talim.test';
const PASSWORD = process.env.LIVE_API_PASSWORD ?? 'Demo#Pass2026';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

describe.skipIf(!LIVE)(`live contract (${API_BASE_URL})`, () => {
  const seen: SeenRequest[] = [];
  let children: ChildSummary[] = [];
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    if (/localhost:9999/.test(API_BASE_URL)) {
      throw new Error('Set VITE_API_BASE_URL to the running API, e.g. VITE_API_BASE_URL=http://localhost:5056');
    }
    // Record what leaves the client (path, query, headers), then send it for real.
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      const headers = Object.fromEntries(new Headers(init?.headers).entries());
      seen.push({ path: url.pathname, query: url.search, headers });
      // jsdom's AbortSignal is not Node's, which Node's fetch refuses; the
      // test timeout stands in for the client's request timeout here.
      const { signal: _jsdomSignal, ...rest } = init ?? {};
      return realFetch(input, rest);
    }) as typeof fetch;

    const tokens = await api.post<{ access_token?: string }>('/auth/login', { email: EMAIL, password: PASSWORD }, { skipAuth: true });
    if (!tokens.access_token) throw new Error('The API returned no access token');
    sessionStore.setToken(tokens.access_token);
    children = await getChildren();
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
    sessionStore.setToken(null);
  });

  it('the parent has children, with unique ids', () => {
    expect(children.length).toBeGreaterThan(0);
    expect(new Set(children.map((child) => child.id)).size).toBe(children.length);
    // Report the family, so a run shows which schools were covered.
    console.info(`children: ${children.map((child) => `${child.name} (${child.school.name})`).join(', ')}`);
  });

  it.each(FAMILY_CHECKS.map((check) => [check.screen, check] as const))('%s', async (_screen, check) => {
    expect(checkShape(await check.load(''), check.rule)).toEqual([]);
  });

  it.each(CHILD_CHECKS.map((check) => [check.screen, check] as const))('%s, for every child', async (_screen, check) => {
    const problems: string[] = [];
    for (const child of children) {
      if (!child.class) continue;
      try {
        for (const problem of checkShape(await check.load(child.id), check.rule)) problems.push(`${child.name}: ${problem}`);
      } catch (error) {
        problems.push(`${child.name}: ${error instanceof ApiError ? `${error.status} ${error.code} ${error.message}` : String(error)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('sends X-Talim-Child equal to the child in the path or query, on every request', () => {
    const childRequests = seen.filter((request) => request.path.startsWith('/parents/me/children/') || request.query.includes('childId='));
    expect(childRequests.length).toBeGreaterThan(0);
    expect(childHeaderMismatches(seen)).toEqual([]);
  });

  it('answers 404 for a child that is not linked to this parent', async () => {
    await expect(getChildDashboard('000000000000000000000000')).rejects.toMatchObject({ status: 404 });
  });
});
