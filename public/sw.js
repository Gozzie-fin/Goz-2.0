// Goz 2.0 — Service Worker

const CACHE = 'goz-v2';
const notifTimers = [];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Cache-first for app shell, network-first for everything else
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('/') || new Response('offline')))
  );
});

// Receive scheduled notifications from the app
self.addEventListener('message', e => {
  if (e.data?.type !== 'SCHEDULE') return;

  // Cancel any previously scheduled timers
  notifTimers.forEach(clearTimeout);
  notifTimers.length = 0;

  const now = Date.now();
  (e.data.notifications || []).forEach(n => {
    const delay = n.time - now;
    if (delay > 0 && delay < 90000000) { // within ~25 hours
      notifTimers.push(setTimeout(() => {
        self.registration.showNotification(n.title, {
          body: n.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: n.tag,
          renotify: true,
          data: { url: '/' },
          vibrate: [200, 100, 200],
        });
      }, delay));
    }
  });
});

// Server-sent push events (future use with Supabase Edge Functions)
self.addEventListener('push', e => {
  const d = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'Goz 2.0', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || 'goz',
      data: { url: d.url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

// Tap a notification → focus or open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.startsWith(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow('/');
    })
  );
});
