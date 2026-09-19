import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../services/auth.services';
import { api } from '../lib/apiClient';
import { getErrorMessage } from '../lib/apiError';

const LEGACY_STORAGE_KEY = 'talim:push-subscribed';
const SW_PATH = '/sw.js';
const SUBSCRIBE_PATH = '/notifications/web-push/subscribe';

/** The "subscribed" flag belongs to one user, so the next person on this browser starts switched off. */
const storageKeyFor = (userId: string): string => `talim:push-subscribed:${userId}`;

/** Whether this browser can do web push at all. */
const isPushSupported = (): boolean =>
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
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * Syncs `webPushEnabled` (browsers only; `pushEnabled` is the phone switch) to the
 * backend preferences. Best-effort: never throws.
 *
 * @param enabled - The new value.
 */
async function syncWebPushPreference(enabled: boolean): Promise<void> {
  try {
    await api.patch('/notifications/preferences', { webPushEnabled: enabled });
  } catch {
    // Non-fatal: the browser's own subscription is the source of truth for delivery.
  }
}

/**
 * The browser's current push subscription for our service worker.
 *
 * @returns The subscription, or `null` when there is none.
 */
async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Removes the server-side record of a subscription. `DELETE` carries a body, so
 * it goes through the client's low-level config.
 *
 * @param endpoint - The push endpoint to forget.
 */
function deleteServerSubscription(endpoint: string): Promise<unknown> {
  return api.delete(SUBSCRIBE_PATH, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
}

/**
 * Removes this browser's push subscription on sign-out, so the next user of
 * the browser never receives the previous user's notifications. Call it while
 * the access token is still valid. Never throws.
 *
 * @param userId - The signing-out parent, whose "subscribed" flag is cleared.
 */
export async function unsubscribeWebPushOnLogout(userId?: string | null): Promise<void> {
  if (userId) localStorage.removeItem(storageKeyFor(userId));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  if (!isPushSupported()) return;

  try {
    const subscription = await getCurrentSubscription();
    if (!subscription) return;
    const { endpoint } = subscription;
    await subscription.unsubscribe().catch(() => undefined);
    await deleteServerSubscription(endpoint).catch(() => undefined);
  } catch {
    // Signing out must never fail because of push cleanup.
  }
}

/** The browser's notification permission, as this hook reports it. */
export type PushPermission = 'default' | 'granted' | 'denied';

/** What {@link usePushNotifications} returns. */
export interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Browser push for the signed-in parent: permission, subscription state and
 * subscribe / unsubscribe. `isSubscribed` reflects the browser's real
 * subscription, not just a stored flag.
 *
 * @returns The push state and its two actions.
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const { user, parentId } = useAuth();
  const userId: string | undefined = user?.userId || user?._id || user?.id || parentId || undefined;
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return undefined;
    let cancelled = false;
    setIsSupported(true);
    setPermission(Notification.permission as PushPermission);

    // The toggle reflects the browser's real subscription, not just a stored flag.
    getCurrentSubscription()
      .then((subscription) => {
        if (cancelled || !userId) return;
        const key = storageKeyFor(userId);
        // One-time move from the old flag shared by every user on this browser.
        if (subscription && localStorage.getItem(LEGACY_STORAGE_KEY) === 'true') {
          localStorage.setItem(key, 'true');
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        setIsSubscribed(Boolean(subscription) && localStorage.getItem(key) === 'true');
      })
      .catch(() => {
        if (!cancelled) setIsSubscribed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const getVapidKey = useCallback(async (): Promise<string> => {
    // Public endpoint: a 401 here must not trigger a token refresh.
    const { publicKey } = await api.get<{ publicKey: string }>(
      '/notifications/web-push/vapid-public-key',
      { skipAuth: true },
    );
    return publicKey;
  }, []);

  const getOrRegisterSW = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    let reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!reg) {
      reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      await navigator.serviceWorker.ready;
    }
    return reg;
  }, []);

  const subscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermission);

      if (permissionResult !== 'granted') {
        throw new Error(
          permissionResult === 'denied'
            ? 'Notification permission was blocked. Please enable it in your browser settings.'
            : 'Notification permission was dismissed.',
        );
      }

      const [vapidKey, registration] = await Promise.all([getVapidKey(), getOrRegisterSW()]);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();

      await api.post(SUBSCRIBE_PATH, {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
      });

      if (userId) localStorage.setItem(storageKeyFor(userId), 'true');
      setIsSubscribed(true);

      await syncWebPushPreference(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to enable push notifications'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getVapidKey, getOrRegisterSW, userId]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await syncWebPushPreference(false);

      const subscription = await getCurrentSubscription();

      if (subscription) {
        await deleteServerSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }

      if (userId) localStorage.removeItem(storageKeyFor(userId));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setIsSubscribed(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to disable push notifications'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
