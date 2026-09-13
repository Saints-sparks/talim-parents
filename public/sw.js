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
