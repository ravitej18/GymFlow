const CACHE_NAME = "gymflow-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./gym.config.js",
  "./styles/main.css",
  "./lib/firebase-init.js",
  "./modules/utils.js",
  "./modules/auth.js",
  "./modules/dashboard.js",
  "./modules/members.js",
  "./modules/memberships.js",
  "./modules/payments.js",
  "./modules/renewals.js",
  "./modules/reminders.js",
  "./modules/trainers.js",
  "./modules/attendance.js",
  "./modules/workouts.js",
  "./modules/progress.js",
  "./modules/reports.js",
  "./modules/settings.js",
  "./modules/my-membership.js",
  "./modules/my-payments.js",
  "./modules/trainer-checkin.js"
];

self.addEventListener("install", (event) => {
  // Activate the new worker immediately instead of waiting for old tabs to close.
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      // Take control of open pages right away so they run the new code, not a
      // stale cached bundle (this is what caused the "indexOf of undefined" crash).
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Network-first for our OWN app code + HTML, so a deploy is picked up
  // immediately when online (cache is only a fallback for offline). This
  // prevents an old cached bundle from running against newer data.
  if (sameOrigin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for cross-origin assets (fonts, Firebase SDK, SheetJS) — these
  // are versioned by URL, so caching them is safe and saves bandwidth/offline.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
