import { API_BASE_URL } from './config';
import { ApiError } from './apiError';
import { sessionStore } from './session';

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
  /** Internal: set once a request has been retried after a token refresh. */
  _retry?: boolean;
}

/** The canonical success envelope the API wraps every payload in. */
interface Envelope<T> {
  success: true;
  data: T;
}

type ErrorListener = (error: ApiError) => void;

const DEFAULT_TIMEOUT_MS = 30_000;

/** Fired when the session cannot be recovered; `AuthProvider` signs the parent out. */
export const AUTH_LOGOUT_EVENT = 'talim:auth-logout';

/**
 * True when a parsed body is the `{ success, data }` envelope rather than the
 * payload itself. A payload of its own that happens to carry a `data` key is
 * only unwrapped when `success` is there too, so this never mis-fires.
 *
 * @param body - The parsed JSON body.
 * @returns Whether to unwrap `body.data`.
 */
function isEnvelope(body: unknown): body is Envelope<unknown> {
  return (
    !!body &&
    typeof body === 'object' &&
    'success' in (body as Record<string, unknown>) &&
    'data' in (body as Record<string, unknown>) &&
    (body as Record<string, unknown>).success === true
  );
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
   * Adds credentials and the bearer token unless the call opted out.
   *
   * @param config - The request options.
   * @returns The options to hand to `fetch`.
   */
  private withAuth(config: RequestConfig): RequestConfig {
    const next: RequestConfig = { ...config, credentials: 'include' };
    if (config.skipAuth) return next;
    const token = sessionStore.getToken();
    if (token) {
      next.headers = {
        ...(config.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      };
    }
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
   * Performs a request and returns the payload. Unwraps the `{ success, data }`
   * envelope; any non-2xx becomes an `ApiError` carrying the server's
   * `error.code`, message and field details.
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

    return (isEnvelope(body) ? body.data : body) as T;
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
   * the contract: the same base URL, the same bearer token, the same
   * `ApiError` on failure — so callers never special-case uploads.
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
          resolve((isEnvelope(body) ? body.data : body) as T);
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
 * await api.post<InitializePaymentResult>('/payments/parent/initialize', body);
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
 * and empty values so the API never receives `?term=undefined`.
 *
 * @param params - The query parameters.
 * @returns A string starting with "?", or "" when nothing is left.
 */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
