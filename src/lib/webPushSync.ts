/**
 * Browser web-push bookkeeping shared by the settings toggle, the sign-out
 * paths and the app-start reconcile.
 *
 * The backend keeps one row per push endpoint. Browsers can rotate or revoke
 * an endpoint behind the app's back, and the service worker (which has no
 * session token) is the first to hear about it. This module is what turns
 * that into a correct backend row again:
 *
 * - `public/sw.js` re-subscribes on `pushsubscriptionchange` and leaves a note
 *   in the Cache API (`PENDING_URL`) naming the endpoints the server should
 *   forget, then pings open tabs.
 * - {@link startWebPushSync} runs {@link reconcileWebPush} on app start, when a
 *   tab is pinged, and when the browser permission changes.
 *
 * Everything here is best-effort and never throws, and nothing here ever
 * asks for notification permission: that only happens from a user gesture.
 */
import { API_BASE_URL } from './config';
import { api } from './apiClient';
import type {
  NotificationPreferencesPayload,
  WebPushSubscribePayload,
  WebPushUnsubscribePayload,
} from '../types/apiPayloads';

/** Path of the service worker that receives pushes. */
export const SW_PATH = '/sw.js';
/** The old flag shared by every user on a browser. */
export const LEGACY_STORAGE_KEY = 'talim:push-subscribed';
/** Cache the service worker and the page share notes in. Mirrors `public/sw.js`. */
export const SYNC_CACHE = 'talim-push-sync';
/** Note left by the service worker: endpoints the server should forget. Mirrors `public/sw.js`. */
export const PENDING_URL = '/__talim_push__/pending';
/** Note left by the page: what the service worker needs to re-subscribe alone. Mirrors `public/sw.js`. */
export const CONFIG_URL = '/__talim_push__/config';
/** Fired on `window` when reconcile changed what the toggle should show. */
export const PUSH_STATE_EVENT = 'talim:push-state-changed';

const SUBSCRIBE_PATH = '/notifications/web-push/subscribe';
const VAPID_PATH = '/notifications/web-push/vapid-public-key';
const PREFERENCES_PATH = '/notifications/preferences';

/** The browser's notification permission for this origin. */
export type PushPermission = 'default' | 'granted' | 'denied';

/** What {@link reconcileWebPush} did. */
export type ReconcileResult =
  | 'unsupported'
  | 'no-user'
  | 'idle'
  | 'healed'
  | 'resubscribed'
  | 'cleared'
  | 'failed';

/**
 * The per-user localStorage flag recording that this user turned browser push on.
 *
 * @param userId - The signed-in user.
 * @returns The storage key.
 */
export const pushFlagKey = (userId: string): string => `talim:push-subscribed:${userId}`;

/**
 * The per-user localStorage record of the last endpoint registered with the server.
 *
 * @param userId - The signed-in user.
 * @returns The storage key.
 */
export const pushEndpointKey = (userId: string): string => `talim:push-endpoint:${userId}`;

/**
 * Whether this browser can do web push at all.
 *
 * @returns True when service workers, PushManager and Notification all exist.
 */
export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/**
 * Decodes a URL-safe base64 VAPID key into the bytes `pushManager.subscribe` expects.
 *
 * @param base64String - The public key from the server.
 * @returns The decoded key.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Reads a JSON note from the shared cache.
 *
 * @param url - The note's key.
 * @returns The parsed note, or `null` when missing or unreadable.
 */
async function readNote<T>(url: string): Promise<T | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(SYNC_CACHE);
    const response = await cache.match(url);
    return response ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Writes (or with `null`, removes) a JSON note in the shared cache.
 *
 * @param url - The note's key.
 * @param value - The note, or `null` to delete it.
 */
async function writeNote(url: string, value: unknown): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(SYNC_CACHE);
    if (value === null) {
      await cache.delete(url);
      return;
    }
    await cache.put(url, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }));
  } catch {
    // Notes are a hint: reconcile also works from what the browser holds.
  }
}

/** What the service worker needs to re-subscribe without the page. */
interface SyncConfig {
  apiBaseUrl?: string;
  vapidKey?: string;
}

/**
 * Tells the service worker where the API is and which VAPID key we use, so it
 * can re-subscribe when no tab is open.
 *
 * @param config - Fields to merge into the saved config.
 */
async function saveSyncConfig(config: SyncConfig): Promise<void> {
  const existing = (await readNote<SyncConfig>(CONFIG_URL)) ?? {};
  await writeNote(CONFIG_URL, { ...existing, apiBaseUrl: API_BASE_URL, ...config });
}

/**
 * The endpoints the service worker says the server should forget.
 *
 * @returns Stale endpoints, or an empty list.
 */
async function readStaleEndpoints(): Promise<string[]> {
  const pending = await readNote<{ staleEndpoints?: string[] }>(PENDING_URL);
  return pending?.staleEndpoints ?? [];
}

/**
 * The browser's current push subscription for our service worker.
 *
 * @returns The subscription, or `null` when there is none or push is unsupported.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * The service worker registration, registering it the first time.
 *
 * @returns The registration.
 */
export async function getOrRegisterSW(): Promise<ServiceWorkerRegistration> {
  let registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!registration) {
    registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await navigator.serviceWorker.ready;
  }
  return registration;
}

/**
 * The server's VAPID public key. Public route: a 401 must not trigger a refresh.
 *
 * @returns The key.
 * @throws When the server does not return one.
 */
export async function getVapidKey(): Promise<string> {
  const { publicKey } = await api.get<{ publicKey: string }>(VAPID_PATH, { skipAuth: true });
  if (!publicKey) throw new Error('Unable to load push configuration from server');
  return publicKey;
}

/**
 * Subscribes this browser to push with the server's key. The caller has
 * already been granted permission; this never prompts.
 *
 * @returns The subscription and the key it was made with.
 */
async function subscribeBrowser(): Promise<{ subscription: PushSubscription; vapidKey: string }> {
  const [vapidKey, registration] = await Promise.all([getVapidKey(), getOrRegisterSW()]);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  return { subscription, vapidKey };
}

/**
 * Registers a subscription with the backend (idempotent on the endpoint).
 *
 * @param subscription - The browser's subscription.
 * @returns The endpoint that was registered.
 */
export async function registerSubscription(subscription: PushSubscription): Promise<string> {
  const { endpoint, keys } = subscription.toJSON() as WebPushSubscribePayload;
  const body: WebPushSubscribePayload = { endpoint, keys, userAgent: navigator.userAgent };
  await api.post(SUBSCRIBE_PATH, body);
  return endpoint;
}

/**
 * Asks the backend to forget an endpoint.
 *
 * @param endpoint - The push endpoint.
 * @param accessToken - A token captured earlier, for when the session is gone. Omit to use the live session.
 */
export async function forgetServerSubscription(endpoint: string, accessToken?: string | null): Promise<void> {
  const body: WebPushUnsubscribePayload = { endpoint };
  await api.delete(SUBSCRIBE_PATH, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    // With an explicit token the refresh path must stay out of it: the session is ending.
    skipAuth: Boolean(accessToken),
    body: JSON.stringify(body),
    keepalive: true,
  });
}

/**
 * Records that this user has this browser subscribed, and where.
 *
 * @param userId - The signed-in user.
 * @param endpoint - The endpoint just registered.
 */
export async function rememberSubscription(userId: string, endpoint: string): Promise<void> {
  try {
    localStorage.setItem(pushFlagKey(userId), 'true');
    localStorage.setItem(pushEndpointKey(userId), endpoint);
  } catch {
    // Storage can be unavailable; the browser's own subscription still decides.
  }
  await writeNote(PENDING_URL, null);
}

/**
 * Forgets the per-user flag and endpoint (and the old shared flag).
 *
 * @param userId - The user whose flag to clear.
 */
export function forgetLocalFlags(userId: string | null): void {
  try {
    if (userId) {
      localStorage.removeItem(pushFlagKey(userId));
      localStorage.removeItem(pushEndpointKey(userId));
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/**
 * Syncs `webPushEnabled` (browsers only; `pushEnabled` is the phone switch) to
 * the backend preferences. Best-effort, never throws.
 *
 * @param enabled - The new value.
 */
export async function syncWebPushPreference(enabled: boolean): Promise<void> {
  try {
    const body: NotificationPreferencesPayload = { webPushEnabled: enabled };
    await api.patch(PREFERENCES_PATH, body);
  } catch {
    // Non-fatal: the browser subscription is the source of truth for delivery.
  }
}

/**
 * Turns browser push on for a user who just asked to (the caller has already
 * been granted permission). Used by the settings toggle.
 *
 * @param userId - The signed-in user, when known.
 * @returns Nothing; throws so the toggle can show the failure.
 */
export async function enableWebPush(userId: string | null): Promise<void> {
  const { subscription, vapidKey } = await subscribeBrowser();
  const endpoint = await registerSubscription(subscription);
  if (userId) await rememberSubscription(userId, endpoint);
  await saveSyncConfig({ vapidKey });
  await syncWebPushPreference(true);
}

/**
 * Turns browser push off for a user who just asked to.
 *
 * @param userId - The signed-in user, when known.
 */
export async function disableWebPush(userId: string | null): Promise<void> {
  await syncWebPushPreference(false);
  const subscription = await getCurrentSubscription();
  if (subscription) {
    await forgetServerSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
  forgetLocalFlags(userId);
  await writeNote(PENDING_URL, null);
}

/**
 * Makes the backend agree with the browser for a user who opted in. Safe to
 * call as often as you like and never prompts:
 *
 * - permission `granted` and a subscription held: re-register it (idempotent),
 *   and forget endpoints the service worker says were rotated away;
 * - permission `granted` but the subscription is gone: re-subscribe silently;
 * - permission `denied` / `default` while the flag says subscribed: clear the
 *   flag and forget the server record.
 *
 * @param userId - The signed-in user; without one there is nothing to do.
 * @returns What happened. Never throws.
 */
export async function reconcileWebPush(userId: string | null): Promise<ReconcileResult> {
  try {
    if (!isPushSupported()) return 'unsupported';
    if (!userId) return 'no-user';
    if (localStorage.getItem(pushFlagKey(userId)) !== 'true') return 'idle';

    if (Notification.permission !== 'granted') {
      await clearRevoked(userId);
      notifyStateChanged();
      return 'cleared';
    }

    let subscription = await getCurrentSubscription();
    let resubscribed = false;
    let vapidKey: string | undefined;
    if (!subscription) {
      ({ subscription, vapidKey } = await subscribeBrowser());
      resubscribed = true;
    }

    const endpoint = await registerSubscription(subscription);
    const previous = localStorage.getItem(pushEndpointKey(userId));
    const stale = new Set([...(await readStaleEndpoints()), ...(previous ? [previous] : [])]);
    stale.delete(endpoint);
    await Promise.allSettled([...stale].map((old) => forgetServerSubscription(old)));

    await rememberSubscription(userId, endpoint);
    await saveSyncConfig(vapidKey ? { vapidKey } : {});
    if (resubscribed || stale.size > 0) notifyStateChanged();
    return resubscribed ? 'resubscribed' : 'healed';
  } catch {
    return 'failed';
  }
}

/**
 * The browser took notifications away (or reset them) while we thought we were
 * subscribed: forget the flag first, then tell the server.
 *
 * @param userId - The user whose subscription is gone.
 */
async function clearRevoked(userId: string): Promise<void> {
  const stored = localStorage.getItem(pushEndpointKey(userId));
  forgetLocalFlags(userId);
  const subscription = await getCurrentSubscription().catch(() => null);
  const endpoints = new Set([...(await readStaleEndpoints()), ...(stored ? [stored] : [])]);
  if (subscription) endpoints.add(subscription.endpoint);
  await Promise.allSettled([
    ...[...endpoints].map((endpoint) => forgetServerSubscription(endpoint)),
    subscription ? subscription.unsubscribe() : Promise.resolve(),
  ]);
  await writeNote(PENDING_URL, null);
}

/** Tells any mounted toggle to re-read the browser's state. */
function notifyStateChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PUSH_STATE_EVENT));
}

/**
 * Keeps the backend subscription in step with the browser for the signed-in
 * user: reconciles now, again whenever the service worker reports a rotated
 * subscription, and again when the browser permission changes.
 *
 * @param userId - The signed-in user.
 * @returns A function that stops listening.
 */
export function startWebPushSync(userId: string): () => void {
  if (!isPushSupported()) return () => undefined;
  const run = (): void => {
    void reconcileWebPush(userId);
  };
  run();

  const onMessage = (event: MessageEvent): void => {
    if ((event.data as { type?: string } | null)?.type === 'PUSH_SUBSCRIPTION_CHANGED') run();
  };
  navigator.serviceWorker.addEventListener('message', onMessage);

  let permissionStatus: PermissionStatus | null = null;
  let disposed = false;
  navigator.permissions
    ?.query({ name: 'notifications' })
    .then((status) => {
      if (disposed) return;
      permissionStatus = status;
      status.addEventListener('change', run);
    })
    .catch(() => undefined);

  return () => {
    disposed = true;
    navigator.serviceWorker.removeEventListener('message', onMessage);
    permissionStatus?.removeEventListener('change', run);
  };
}

/**
 * Stops this browser receiving a user's pushes: clears the flags, unsubscribes
 * the browser locally, and tells the server when there is a token to do it with.
 * Best-effort, never throws.
 *
 * @param userId - The user whose flag to clear.
 * @param accessToken - A token captured before the session was cleared; `null` when none is left (the
 *   server is then not told); omitted to use the live session.
 */
export async function unsubscribeBrowserPush(userId: string | null, accessToken?: string | null): Promise<void> {
  const stored = userId ? safeGet(pushEndpointKey(userId)) : null;
  forgetLocalFlags(userId);
  await writeNote(PENDING_URL, null);
  if (!isPushSupported()) return;
  try {
    const subscription = await getCurrentSubscription();
    const endpoints = new Set<string>(stored ? [stored] : []);
    if (subscription) endpoints.add(subscription.endpoint);
    await Promise.allSettled([
      ...(accessToken === null
        ? []
        : [...endpoints].map((endpoint) => forgetServerSubscription(endpoint, accessToken))),
      subscription ? subscription.unsubscribe() : Promise.resolve(),
    ]);
  } catch {
    // Signing out must never fail because of push cleanup.
  }
}

/**
 * Reads localStorage without throwing.
 *
 * @param key - Storage key.
 * @returns The value, or `null`.
 */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Removes this browser's push subscription for a user on sign-out. Call it
 * while the token is still valid. Best-effort, never throws.
 *
 * @param userId - The signing-out parent, whose 'subscribed' flag is cleared.
 * @param accessToken - The session's token, captured before it is cleared.
 */
export async function unsubscribeWebPushOnLogout(userId?: string | null, accessToken?: string | null): Promise<void> {
  await unsubscribeBrowserPush(userId ?? null, accessToken);
}
