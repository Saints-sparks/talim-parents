/**
 * A tiny request router for the dev fixtures: matches `METHOD /path/:param`
 * and builds `Response`s the way the API does (the `{ success, data, meta? }`
 * envelope, or a route's own `{ success, … }` body, or the error envelope).
 * Dev and test only.
 */

/** What a handler is given. */
export interface FixtureRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  headers: Record<string, string>;
}

/** A handler: answers with a `Response`. */
export type FixtureHandler = (request: FixtureRequest) => Response | Promise<Response>;

/** One route of the table. */
export interface FixtureRoute {
  method: string;
  pattern: string;
  handler: FixtureHandler;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * The success envelope, as `ok(data, meta)` builds it on the server.
 *
 * @param data - The payload.
 * @param meta - Pagination, when the list is paged.
 * @param status - The HTTP status.
 * @returns The response.
 */
export function ok(data: unknown, meta?: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(meta ? { success: true, data, meta } : { success: true, data }), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * A body sent as it is: the routes whose real body carries its own `success`
 * (verify, providers, password change) or none at all (login).
 *
 * @param body - The body.
 * @param status - The HTTP status.
 * @returns The response.
 */
export function raw(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/**
 * The error envelope `HttpExceptionFilter` sends.
 *
 * @param status - The HTTP status.
 * @param code - The stable error code.
 * @param message - The human message.
 * @param details - Field details, for validation errors.
 * @returns The response.
 */
export function fail(status: number, code: string, message: string, details?: { field: string; reason: string }[]): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message, ...(details ? { details } : {}) } }), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * Matches a path against a pattern with `:param` segments.
 *
 * @param pattern - e.g. `/parents/me/children/:childId/dashboard`.
 * @param path - The request path without the query.
 * @returns The params, or `null` when it does not match.
 */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/').filter(Boolean);
  const got = path.split('/').filter(Boolean);
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i += 1) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(got[i]);
    else if (want[i] !== got[i]) return null;
  }
  return params;
}

/**
 * Finds the route for a request. Routes are tried in order, so literal routes
 * go before parameterised ones that would also match.
 *
 * @param routes - The table.
 * @param method - The HTTP method.
 * @param path - The request path.
 * @returns The route and its params, or `null`.
 */
export function findRoute(
  routes: readonly FixtureRoute[],
  method: string,
  path: string,
): { route: FixtureRoute; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPath(route.pattern, path);
    if (params) return { route, params };
  }
  return null;
}
