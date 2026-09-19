import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../services/auth.services';
import { getErrorMessage } from '../lib/apiError';
import {
  LEGACY_STORAGE_KEY,
  PUSH_STATE_EVENT,
  disableWebPush,
  enableWebPush,
  getCurrentSubscription,
  isPushSupported,
  pushFlagKey,
  type PushPermission,
} from '../lib/webPushSync';

export type { PushPermission } from '../lib/webPushSync';

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
 * subscription, not just a stored flag. Permission is only ever requested from
 * `subscribe` (the toggle's click); keeping the backend in step with the
 * browser is `startWebPushSync`'s job, mounted once by `AuthProvider`.
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

    // The toggle reflects the browser's real subscription, not just a stored flag;
    // it is re-read when the background reconcile changes something.
    const refresh = (): void => {
      setPermission(Notification.permission as PushPermission);
      getCurrentSubscription()
        .then((subscription) => {
          if (cancelled || !userId) return;
          const key = pushFlagKey(userId);
          // One-time move from the old flag shared by every user on this browser.
          if (subscription && localStorage.getItem(LEGACY_STORAGE_KEY) === 'true') {
            localStorage.setItem(key, 'true');
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          }
          setIsSubscribed(
            Boolean(subscription) && localStorage.getItem(key) === 'true' && Notification.permission === 'granted',
          );
        })
        .catch(() => {
          if (!cancelled) setIsSubscribed(false);
        });
    };
    refresh();
    window.addEventListener(PUSH_STATE_EVENT, refresh);

    return () => {
      cancelled = true;
      window.removeEventListener(PUSH_STATE_EVENT, refresh);
    };
  }, [userId]);

  const subscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Only ever called from the toggle's click handler.
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermission);

      if (permissionResult !== 'granted') {
        throw new Error(
          permissionResult === 'denied'
            ? 'Notification permission was blocked. Please enable it in your browser settings.'
            : 'Notification permission was dismissed.',
        );
      }

      await enableWebPush(userId ?? null);
      setIsSubscribed(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to enable push notifications'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await disableWebPush(userId ?? null);
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
