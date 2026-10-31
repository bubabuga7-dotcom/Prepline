/* Prepline service worker: makes the site installable and keeps visited pages available offline.
   Pages, scripts and styles: network first (always the latest version when online), cache as fallback.
   Question images: cache first (their file names never change). Supabase and CDNs are not touched. */
var VERSION = 'prepline-v22';
var SHELL = 'shell-' + VERSION, IMAGES = 'images-' + VERSION;
var MAX_IMAGES = 400;
var PRECACHE = [
  './', 'index.html', 'dashboard.html', 'math.html', 'crit.html', 'topics.html', 'formulas.html', 'premium.html', 'copyright.html', 'review.html', 'saved.html',
  'prepline.css', 'test-theme.css', 'nav.js', 'tests.js', 'hub.js', 'topics-index.js', 'test-ux.js', 'theme.js', 'light.css', 'draw.js', 'tapmap.js', 'option-map.json',
  'explain.js', 'answers.js', 'prepline-supabase.js', 'growth.js', 'gate.js', 'lock.js', 'manifest.webmanifest', 'icons/icon-192.png',
  'vendor/katex/katex.min.css', 'vendor/katex/katex.min.js', 'vendor/katex/contrib/auto-render.min.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) {
    // one missing file must not break the install
    return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== SHELL && k !== IMAGES; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function trim(name, max) {
  caches.open(name).then(function (c) {
    c.keys().then(function (keys) { if (keys.length > max) Promise.all(keys.slice(0, keys.length - max).map(function (k) { return c.delete(k); })); });
  });
}

var OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline — Prepline</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#15181D;color:#DADDE2;font:16px system-ui,sans-serif;text-align:center;padding:24px">' +
  '<div><div style="font:700 28px system-ui;color:#C9AA6A;margin-bottom:8px">You are offline</div>' +
  '<p style="color:#A6ADB8;max-width:420px">This page has not been opened on this device yet. Pages you have visited before work without internet; results are saved once you are back online.</p>' +
  '<p><a href="dashboard.html" style="color:#8EADD2">Open the dashboard</a></p></div></body>';

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;              // Supabase, fonts, CDNs: straight to the network

  // question images and icons: cache first
  if (/\/(images|icons)\//.test(url.pathname)) {
    e.respondWith(caches.open(IMAGES).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res.ok) { c.put(req, res.clone()); trim(IMAGES, MAX_IMAGES); }
          return res;
        });
      });
    }));
    return;
  }

  // everything else: network first, cache as fallback
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok && res.type === 'basic') {
      var copy = res.clone();
      caches.open(SHELL).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') return new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return Response.error();
    });
  }));
});

/* push reminders (sent by the push-send function) */
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Prepline', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Prepline', {
    body: d.body || '', tag: d.tag || 'prepline', renotify: false,
    icon: 'icons/icon-192.png', badge: 'icons/favicon-48.png', data: { url: d.url || './dashboard.html' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './dashboard.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) if ('focus' in list[i]) { list[i].navigate(url).catch(function () {}); return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
