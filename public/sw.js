/* Talim Parents — Web Push Service Worker */
/* global clients */

const toSameOriginPath = (url) => {
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin ? `${parsed.pathname}${parsed.search}` : null;
  } catch {
    return null;
  }
};

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Talim", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    tag: data.tag || "talim-notification",
    renotify: Boolean(data.tag && data.renotify),
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    silent: false,
  };

  const targetPath = options.data.url ? toSameOriginPath(options.data.url) : null;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // The user is already looking at this chat in a focused tab.
      const alreadyOpen =
        targetPath &&
        clientList.some((client) => client.focused && toSameOriginPath(client.url) === targetPath);
      if (alreadyOpen) return undefined;
      return self.registration.showNotification(data.title || "Talim Notification", options);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const client = clientList.find((item) => "focus" in item);
        if (client) {
          // The open tab routes itself, keeping its state and session.
          client.postMessage({ type: "OPEN_URL", url });
          return client.focus();
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
        return undefined;
      })
  );
});

/* ------------------------------------------------------------------------- *
 * pushsubscriptionchange
 *
 * The push service can rotate or drop a subscription. The browser then fires
 * this event here, in the service worker, which has no session token. So:
 *   1. Re-subscribe with the same VAPID key (no permission prompt is needed
 *      while permission is still granted).
 *   2. Leave a note in the Cache API (the page reads it on its next load) with
 *      the endpoints the server should forget.
 *   3. Ping any open tab so it finishes registering with the backend now.
 * The page is what talks to the API: it owns the token. The "keys" below are
 * shared with src/lib/webPushSync.ts in the app; keep them in step.
 * ------------------------------------------------------------------------- */
const SYNC_CACHE = "talim-push-sync";
const PENDING_URL = "/__talim_push__/pending";
const CONFIG_URL = "/__talim_push__/config";

const readRecord = async (url) => {
  try {
    const cache = await caches.open(SYNC_CACHE);
    const response = await cache.match(url);
    return response ? await response.json() : null;
  } catch {
    return null;
  }
};

const writeRecord = async (url, value) => {
  try {
    const cache = await caches.open(SYNC_CACHE);
    await cache.put(
      url,
      new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } })
    );
  } catch {
    // Best effort: the page also reconciles on load.
  }
};

const base64ToBytes = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};

/** The VAPID key to re-subscribe with: the old subscription's, else the one the page saved, else the server's. */
const findApplicationServerKey = async (oldSubscription) => {
  const fromOld = oldSubscription && oldSubscription.options && oldSubscription.options.applicationServerKey;
  if (fromOld) return fromOld;
  const config = await readRecord(CONFIG_URL);
  if (config && config.vapidKey) return base64ToBytes(config.vapidKey);
  if (config && config.apiBaseUrl) {
    // Public route: no token needed. Accept both the plain and enveloped shapes.
    const response = await fetch(config.apiBaseUrl + "/notifications/web-push/vapid-public-key");
    if (response.ok) {
      const body = await response.json();
      const key = (body && body.data && body.data.publicKey) || (body && body.publicKey);
      if (key) return base64ToBytes(key);
    }
  }
  return null;
};

const handleSubscriptionChange = async (event) => {
  const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
  let subscription = event.newSubscription || null;
  try {
    if (!subscription) subscription = await self.registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = await findApplicationServerKey(event.oldSubscription);
      if (applicationServerKey) {
        subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }
    }
  } catch {
    // Permission gone or the push service is down: the page will find out on load.
    subscription = null;
  }

  // Chained rotations must not lose earlier endpoints the server still holds.
  const previous = await readRecord(PENDING_URL);
  const stale = new Set((previous && previous.staleEndpoints) || []);
  if (oldEndpoint) stale.add(oldEndpoint);
  if (subscription) stale.delete(subscription.endpoint);
  await writeRecord(PENDING_URL, { staleEndpoints: Array.from(stale), at: Date.now() });

  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientList) client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" });
};

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(handleSubscriptionChange(event));
});
