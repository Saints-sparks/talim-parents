import { API_BASE_URL } from './config';
import { ApiError } from './apiError';
import { sessionStore } from './session';
import type { operations } from '../types/api';

/** Request options accepted by the client (a superset of `fetch`'s). */
export interface RequestConfig extends RequestInit {
  /** Abort after this many milliseconds. Default 30 000. */
  timeoutMs?: number;
  /**
   * Send without the bearer token and never attempt a token refresh. Use for
   * public auth calls (login, refresh): a 401 there means "wrong credentials",
   * not "session expired".
   */
  skipAuth?: boolean;
  /**
   * Return the raw `Response` body as a `Blob` instead of parsing JSON. Used
   * by the timetable and receipt downloads.
   */
  responseType?: 'json' | 'blob';
  /**
   * The child this request is about. Child-scoped routes (A11) must say which
   * linked child they mean, because the child decides the school: the client
   * sends it as the `X-Talim-Child` header. Leave it out for requests that are
   * about the parent (settings, sessions, notifications across children).
   */
  childId?: string;
  /** Internal: set once a request has been retried after a token refresh. */
  _retry?: boolean;
}

/** The canonical success envelope the API wraps every payload in. */
interface Envelope<T> {
  success: true;
  data: T;
  /** Pagination and other metadata (`ok(data, meta)` on the server). */
  meta?: Record<string, unknown>;
}

/**
 * The header that tells the API which linked child a request is about (A11).
 * This is the only place in the app that spells it out: services pass
 * `childId` in the request config and {@link ApiClient} writes the header.
 */
export const CHILD_HEADER = 'X-Talim-Child';

/** The apps the API tells apart by `X-Talim-App` (from the generated contract). */
export type TalimApp = NonNullable<
  NonNullable<operations['AuthenticationController_refreshToken']['parameters']['header']>['X-Talim-App']
>;

/** The request header that names the calling app to the API. */
export const TALIM_APP_HEADER = 'X-Talim-App';

/**
 * This app's name for the API, sent on every request {@link ApiClient} makes
 * (the uploads too). With it the API keeps the parent's refresh token in the
 * parents' own `refreshToken_parents` cookie (a child signing in to the
 * students portal in the same browser no longer replaces it) and refuses any
 * other role's sign-in with 403.
 */
export const TALIM_APP: TalimApp = 'parents';

/**
 * A stand-in for the network, used only by the dev fixtures
 * (`src/dev/fixtures`) and tests. It answers a request with a `Response`, or
 * `undefined` to let it go to the network.
 */
export type FixtureTransport = (url: string, init: RequestConfig) => Promise<Response> | undefined;

type ErrorListener = (error: ApiError) => void;

const DEFAULT_TIMEOUT_MS = 30_000;

/** Fired when the session cannot be recovered; `AuthProvider` signs the parent out. */
export const AUTH_LOGOUT_EVENT = 'talim:auth-logout';

/** The only keys an envelope may have. */
const ENVELOPE_KEYS: ReadonlySet<string> = new Set(['success', 'data', 'meta']);

/**
 * True when a parsed body is exactly the `{ success: true, data, meta? }`
 * envelope. Strict on purpose: a payload of its own that carries `success`
 * and `data` beside other fields (`{ success, data, total }`) or `success`
 * without `data` (`{ success, fees }`) is a payload, and is left alone.
 *
 * @param body - The parsed JSON body.
 * @returns Whether to unwrap it.
 */
export function isEnvelope(body: unknown): body is Envelope<unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  if (record.success !== true || !('data' in record)) return false;
  return Object.keys(record).every((key) => ENVELOPE_KEYS.has(key));
}

/**
 * The payload inside a body. An envelope gives up its `data`; when it also
 * carries pagination `meta`, the payload is `{ data, meta }`, the same shape
 * the paginated routes send when the envelope is off, so callers read one
 * shape either way. Anything else is returned as it is.
 *
 * @param body - The parsed JSON body.
 * @returns The payload.
 */
export function unwrapBody(body: unknown): unknown {
  if (!isEnvelope(body)) return body;
  return body.meta ? { data: body.data, meta: body.meta } : body.data;
}

/**
 * The single HTTP client for the Parents app.
 *
 * - Prefixes relative paths with `API_BASE_URL` and attaches the bearer token.
 * - Unwraps the `{ success, data }` envelope so callers see the payload.
 * - Refreshes the token once on 401, queueing every concurrent request behind
 *   that one refresh, then signs the parent out if it fails.
 * - Reports offline / unreachable / timed-out requests as `ApiError`s with
 *   stable codes, so pages never see a raw `TypeError`.
 */
class ApiClient {
  private refreshCallback: (() => Promise<string | null>) | null = null;
  private transport: FixtureTransport | null = null;
  private refreshInFlight: Promise<string | null> | null = null;
  private errorListeners = new Set<ErrorListener>();

  /**
   * Registers the function that obtains a fresh token (provided by
   * `AuthProvider`), which must resolve to the new token or `null`.
   *
   * @param callback - Performs the refresh.
   */
  setRefreshCallback(callback: (() => Promise<string | null>) | null): void {
    this.refreshCallback = callback;
  }

  /**
   * Routes requests through a stand-in for the network: the dev fixtures
   * (behind `VITE_USE_FIXTURES`, never in a production build) and tests.
   *
   * @param transport - Answers a request, or `null` to restore the network.
   */
  setTransport(transport: FixtureTransport | null): void {
    this.transport = transport;
  }

  /**
   * Subscribes to every `ApiError` the client produces, for a global
   * connectivity banner.
   *
   * @param listener - Called with each error.
   * @returns An unsubscribe function.
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Notifies error listeners without ever letting one break a request.
   *
   * @param error - The error to broadcast.
   */
  private emitError(error: ApiError): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch {
        /* a listener must never break a request */
      }
    }
  }

  /**
   * Refreshes the access token at most once at a time. Concurrent 401s all
   * await the same promise rather than each firing their own refresh.
   *
   * @returns The new access token, or `null` when the refresh failed.
   */
  private async refreshOnce(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    if (!this.refreshCallback) return null;

    this.refreshInFlight = (async () => {
      try {
        return await this.refreshCallback!();
      } catch {
        return null;
      } finally {
        // Cleared the moment the refresh settles: every request that hit a 401
        // while it was in flight already holds this promise, and a 401 arriving
        // afterwards came from a newer request and deserves its own attempt.
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  /**
   * Refreshes the access token, sharing the single in-flight refresh with any
   * 401 the client is already recovering from. The socket handshake uses this
   * so a rejected handshake and a rejected request never refresh twice.
   *
   * @returns The new access token, or `null` when the session is gone.
   */
  refreshSession(): Promise<string | null> {
    return this.refreshOnce();
  }

  /**
   * Resolves a path against the API origin, leaving absolute URLs alone.
   *
   * @param endpoint - Absolute URL or a path relative to `API_BASE_URL`.
   * @returns The URL to fetch.
   */
  private buildUrl(endpoint: string): string {
    if (/^https?:\/\//.test(endpoint)) return endpoint;
    return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  /**
   * Adds credentials, `X-Talim-App` (on every request, public or not, so every
   * auth call reads and writes the parents' own refresh cookie), the bearer
   * token unless the call opted out, and the `X-Talim-Child` header for a
   * child-scoped request. This is the one place both headers are written.
   *
   * @param config - The request options.
   * @returns The options to hand to `fetch`.
   */
  private withAuth(config: RequestConfig): RequestConfig {
    const headers: Record<string, string> = {
      ...(config.headers as Record<string, string> | undefined),
      [TALIM_APP_HEADER]: TALIM_APP,
    };
    const next: RequestConfig = { ...config, credentials: 'include', headers };
    if (config.skipAuth) return next;
    const token = sessionStore.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (config.childId) headers[CHILD_HEADER] = config.childId;
    return next;
  }

  /**
   * Performs `fetch` with a timeout and connectivity handling.
   *
   * @param url - The absolute URL.
   * @param config - The request options.
   * @returns The `Response`, of any status.
   * @throws {ApiError} When the device is offline, the server is unreachable,
   *   or the request timed out.
   */
  private async doFetch(url: string, config: RequestConfig): Promise<Response> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const error = ApiError.offline();
      this.emitError(error);
      throw error;
    }

    const stubbed = this.transport?.(url, config);
    if (stubbed) return stubbed;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const upstream = config.signal;
    if (upstream) upstream.addEventListener('abort', () => controller.abort(), { once: true });

    try {
      return await fetch(url, { ...config, signal: controller.signal });
    } catch (err) {
      if (upstream?.aborted) throw err;
      let error: ApiError;
      if ((err as Error)?.name === 'AbortError') {
        error = ApiError.timeout();
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        error = ApiError.offline();
      } else {
        error = ApiError.unreachable();
      }
      this.emitError(error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Low-level request: sends it, and on a 401 refreshes the token once and
   * retries. Signs the parent out when the refresh fails.
   *
   * @param url - Absolute URL or a path relative to `API_BASE_URL`.
   * @param config - Fetch options plus `timeoutMs` and `skipAuth`.
   * @returns The `Response`, of any status.
   */
  async request(url: string, config: RequestConfig = {}): Promise<Response> {
    const fullUrl = this.buildUrl(url);
    let response = await this.doFetch(fullUrl, this.withAuth(config));

    if (response.status === 401 && !config._retry && !config.skipAuth) {
      const token = await this.refreshOnce();
      if (!token) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
        }
        return response;
      }
      response = await this.doFetch(fullUrl, this.withAuth({ ...config, _retry: true }));
    }

    return response;
  }

  /**
   * Performs a request and returns the payload. Unwraps the exact
   * `{ success, data, meta? }` envelope (keeping `meta`, see
   * {@link unwrapBody}); any non-2xx becomes an `ApiError` carrying the
   * server's `error.code`, message and field details.
   *
   * @typeParam T - Shape of the successful payload.
   * @param url - Absolute URL or a path relative to `API_BASE_URL`.
   * @param config - Fetch options.
   * @returns The parsed payload.
   * @throws {ApiError} On any non-2xx, offline, unreachable or timed-out request.
   */
  async json<T>(url: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.request(url, config);

    if (config.responseType === 'blob') {
      if (!response.ok) throw await this.errorFrom(response);
      return (await response.blob()) as unknown as T;
    }

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (!response.ok) {
      const error = ApiError.fromResponse(response, body);
      this.emitError(error);
      throw error;
    }

    return unwrapBody(body) as T;
  }

  /**
   * Builds an `ApiError` from a failed response whose body has not been read.
   *
   * @param response - The failed response.
   * @returns The typed error.
   */
  private async errorFrom(response: Response): Promise<ApiError> {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const error = ApiError.fromResponse(response, body);
    this.emitError(error);
    return error;
  }

  /**
   * Uploads a `FormData` body with progress, over `XMLHttpRequest`.
   *
   * `fetch` cannot report upload progress, and a parent on a slow connection
   * sending a photo or a voice note needs to see one. This keeps the rest of
   * the contract: the same base URL, the same bearer token and `X-Talim-App`,
   * the same `ApiError` on failure — so callers never special-case uploads.
   *
   * There is no token refresh here: an upload that 401s is re-attempted by
   * the caller rather than silently replayed, because replaying a large body
   * on a metered connection is not something to do behind someone's back.
   *
   * @typeParam T - Shape of the successful payload.
   * @param url - Path relative to the API origin.
   * @param formData - The multipart body.
   * @param onProgress - Called with 0–1 as the bytes go out.
   * @returns The parsed payload.
   * @throws {ApiError} On any non-2xx, or when the request never completes.
   */
  upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (fraction: number) => void,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', this.buildUrl(url), true);
      request.withCredentials = true;

      request.setRequestHeader(TALIM_APP_HEADER, TALIM_APP);
      const token = sessionStore.getToken();
      if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
      // Content-Type is deliberately unset: the browser has to add the
      // multipart boundary itself.

      if (onProgress) {
        request.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total) onProgress(event.loaded / event.total);
        };
      }

      request.onload = () => {
        let body: unknown = null;
        try {
          body = request.responseText ? JSON.parse(request.responseText) : null;
        } catch {
          body = null;
        }

        if (request.status >= 200 && request.status < 300) {
          resolve(unwrapBody(body) as T);
          return;
        }

        const response = new Response(null, { status: request.status });
        const error = ApiError.fromResponse(response, body);
        this.emitError(error);
        reject(error);
      };

      request.onerror = () => {
        const error = ApiError.unreachable();
        this.emitError(error);
        reject(error);
      };
      request.ontimeout = () => {
        const error = ApiError.timeout();
        this.emitError(error);
        reject(error);
      };

      request.send(formData);
    });
  }

  /**
   * Builds a JSON (or `FormData`) request config for a body-carrying method.
   *
   * @param method - The HTTP method.
   * @param data - The body; `FormData` is sent as-is.
   * @param config - Extra fetch options.
   * @returns The complete request config.
   */
  bodyConfig(method: string, data: unknown, config: RequestConfig): RequestConfig {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return {
      ...config,
      method,
      headers: isFormData
        ? (config.headers as Record<string, string> | undefined)
        : { 'Content-Type': 'application/json', ...(config.headers as Record<string, string> | undefined) },
      body: data === undefined ? undefined : isFormData ? data : JSON.stringify(data),
    };
  }
}

/** Singleton client. Import this everywhere; never call `fetch` directly. */
export const apiClient = new ApiClient();

/**
 * Typed facade over the client: every method parses the payload and throws
 * `ApiError` on any non-2xx, offline, unreachable or timed-out request.
 *
 * @example
 * const children = await api.get<ParentChild[]>('/parents/me/children');
 * await api.post<CheckoutResult>('/payments/parent/initialize', body, { childId });
 */
export const api = {
  /**
   * `GET` the payload at `url`.
   *
   * @param url - Path relative to the API origin.
   * @param config - Fetch options.
   * @returns The parsed payload.
   */
  get: <T = unknown>(url: string, config: RequestConfig = {}) =>
    apiClient.json<T>(url, { ...config, method: 'GET' }),

  /**
   * `POST` `data` to `url`.
   *
   * @param url - Path relative to the API origin.
   * @param data - The request body.
   * @param config - Fetch options.
   * @returns The parsed payload.
   */
  post: <T = unknown>(url: string, data?: unknown, config: RequestConfig = {}) =>
    apiClient.json<T>(url, apiClient.bodyConfig('POST', data, config)),

  /**
   * `PUT` `data` to `url`.
   *
   * @param url - Path relative to the API origin.
   * @param data - The request body.
   * @param config - Fetch options.
   * @returns The parsed payload.
   */
  put: <T = unknown>(url: string, data?: unknown, config: RequestConfig = {}) =>
    apiClient.json<T>(url, apiClient.bodyConfig('PUT', data, config)),

  /**
   * `PATCH` `data` onto `url`.
   *
   * @param url - Path relative to the API origin.
   * @param data - The request body.
   * @param config - Fetch options.
   * @returns The parsed payload.
   */
  patch: <T = unknown>(url: string, data?: unknown, config: RequestConfig = {}) =>
    apiClient.json<T>(url, apiClient.bodyConfig('PATCH', data, config)),

  /**
   * `DELETE` the resource at `url`.
   *
   * @param url - Path relative to the API origin.
   * @param config - Fetch options.
   * @returns The parsed payload.
   */
  delete: <T = unknown>(url: string, config: RequestConfig = {}) =>
    apiClient.json<T>(url, { ...config, method: 'DELETE' }),
};

/**
 * Serialises a params object into a query string, dropping `undefined`, `null`
 * and empty values (empty lists too) so the API never receives `?term=undefined`.
 * A list (e.g. the tickets' `status`) goes as one comma-separated parameter
 * (`status=open,closed`).
 *
 * @param params - The query parameters.
 * @returns A string starting with "?", or "" when nothing is left.
 */
export function buildQuery(params: Record<string, string | number | boolean | readonly string[] | undefined | null> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const part = Array.isArray(value) ? value.join(',') : value === undefined || value === null ? '' : String(value);
    if (part !== '') search.set(key, part);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
