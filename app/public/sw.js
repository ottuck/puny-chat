// The web app's service worker: shows new-message notifications sent by the server (Web Push,
// docs/PROJECT.md) and opens the chat when one is tapped: an open window is focused and told
// (lib/push/push.web.ts, onNotificationTap), otherwise the notification's url is opened. Nothing is
// cached here.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'puny-chat', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge.png',
      // One notification for the chat, replaced by the newest message, with a sound each time.
      tag: 'puny-chat',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          client.postMessage({ type: 'notification-tap', data: event.notification.data || {} });
          return;
        }
      }
      return self.clients.openWindow(event.notification.data?.url || '/');
    })(),
  );
});
