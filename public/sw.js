// HangSpace Service Worker — Push Notifications + Offline Shell
const APP_NAME = "HangSpace";

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: APP_NAME, body: "Someone posted something 🪐", url: "/" };
  if (event.data) {
    try { data = { ...data, ...JSON.parse(event.data.text()) }; }
    catch { data.body = event.data.text(); }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "hangspace-notification",   // collapses duplicate notifications
      renotify: true,
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // If app already open, focus it
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

// ── Install + activate (minimal caching for offline shell) ────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting(); // activate immediately
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim()); // take control of all pages right away
});
