/* ThaFlow CV service worker: after the first visit the whole app works offline.
   Only same-origin GET requests are cached. CV data lives in IndexedDB and never passes through here,
   and cross-origin requests (the optional cloud AI endpoint) are never intercepted. */
const BUILD = "__BUILD__"; // replaced at build time (scripts/write-precache.mjs), so each release installs afresh
const CACHE = `thaflow-cv-${BUILD}`;
const FALLBACK_SHELL = ["/", "/create/", "/templates/", "/editor/", "/settings/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      let urls = FALLBACK_SHELL;
      try {
        // Every page, its route data and the app's scripts and styles, listed by the build.
        const response = await fetch("/precache.json", { cache: "no-store" });
        if (response.ok) urls = await response.json();
      } catch {
        /* offline during install: fall back to the pages */
      }
      await Promise.allSettled(urls.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const navigation = request.mode === "navigate";
  // Pages and their route data are static files: the query string (?id=…, ?_rsc=…) never changes the answer.
  const byPath = navigation || url.pathname.endsWith(".txt");
  const cacheKey = byPath ? url.pathname : request;
  const fromNetwork = () =>
    fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(cacheKey, copy));
      }
      return response;
    });

  if (url.pathname.startsWith("/_next/static/")) {
    // Hashed build assets never change: cache first.
    event.respondWith(caches.match(request).then((hit) => hit || fromNetwork()));
    return;
  }
  // Everything else: network first, the cached copy when offline. Only a page may fall back to the start page.
  event.respondWith(
    fromNetwork().catch(async () => {
      const hit = await caches.match(cacheKey);
      if (hit) return hit;
      if (navigation) return (await caches.match("/")) ?? Response.error();
      return Response.error();
    }),
  );
});
