import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, useAuth } from "../services/auth.services";

const LEGACY_STORAGE_KEY = "talim:push-subscribed";
const SW_PATH = "/sw.js";

// The "subscribed" flag belongs to one user, so the next person on this browser starts switched off.
const storageKeyFor = (userId) => `talim:push-subscribed:${userId}`;

const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function getAccessToken() {
  return localStorage.getItem("access_token") || null;
}

async function authFetch(url, options = {}) {
  const token = options.token ?? getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

/** Sync webPushEnabled (browsers only; pushEnabled is the phone switch) — best-effort, never throws. */
async function syncWebPushPreference(enabled) {
  try {
    await authFetch(`${API_BASE_URL}/notifications/preferences`, {
      method: "PATCH",
      body: JSON.stringify({ webPushEnabled: enabled }),
    });
  } catch {
    // Non-fatal
  }
}

async function getCurrentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  return (await registration?.pushManager.getSubscription()) || null;
}

/**
 * Removes this browser's push subscription on sign-out, so the next user of
 * the browser never receives the previous user's notifications. Call it while
 * the access token is still valid. Never throws.
 */
export async function unsubscribeWebPushOnLogout(userId) {
  if (userId) localStorage.removeItem(storageKeyFor(userId));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  if (!isPushSupported()) return;

  try {
    const subscription = await getCurrentSubscription();
    if (!subscription) return;
    const { endpoint } = subscription;
    await subscription.unsubscribe().catch(() => {});
    await authFetch(`${API_BASE_URL}/notifications/web-push/subscribe`, {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  } catch {
    // Signing out must never fail because of push cleanup.
  }
}

export function usePushNotifications() {
  const { user, parentId } = useAuth();
  const userId = user?.userId || user?._id || user?.id || parentId;
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPushSupported()) return undefined;
    let cancelled = false;
    setIsSupported(true);
    setPermission(Notification.permission);

    // The toggle reflects the browser's real subscription, not just a stored flag.
    getCurrentSubscription()
      .then((subscription) => {
        if (cancelled || !userId) return;
        const key = storageKeyFor(userId);
        // One-time move from the old flag shared by every user on this browser.
        if (subscription && localStorage.getItem(LEGACY_STORAGE_KEY) === "true") {
          localStorage.setItem(key, "true");
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        setIsSubscribed(Boolean(subscription) && localStorage.getItem(key) === "true");
      })
      .catch(() => {
        if (!cancelled) setIsSubscribed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const getVapidKey = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/notifications/web-push/vapid-public-key`);
    if (!res.ok) throw new Error("Unable to load push configuration from server");
    const { publicKey } = await res.json();
    return publicKey;
  }, []);

  const getOrRegisterSW = useCallback(async () => {
    let reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!reg) {
      reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      await navigator.serviceWorker.ready;
    }
    return reg;
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        throw new Error(
          permissionResult === "denied"
            ? "Notification permission was blocked. Please enable it in your browser settings."
            : "Notification permission was dismissed.",
        );
      }

      const [vapidKey, registration] = await Promise.all([
        getVapidKey(),
        getOrRegisterSW(),
      ]);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();

      const res = await authFetch(`${API_BASE_URL}/notifications/web-push/subscribe`, {
        method: "POST",
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to save push subscription on server");
      }

      if (userId) localStorage.setItem(storageKeyFor(userId), "true");
      setIsSubscribed(true);

      await syncWebPushPreference(true);
    } catch (err) {
      setError(err.message || "Failed to enable push notifications");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getVapidKey, getOrRegisterSW, userId]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await syncWebPushPreference(false);

      const subscription = await getCurrentSubscription();

      if (subscription) {
        await authFetch(`${API_BASE_URL}/notifications/web-push/subscribe`, {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      if (userId) localStorage.removeItem(storageKeyFor(userId));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setIsSubscribed(false);
    } catch (err) {
      setError(err.message || "Failed to disable push notifications");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
