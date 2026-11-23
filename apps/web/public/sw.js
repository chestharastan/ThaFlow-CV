/* ThaFlow CV service worker: after the first visit the whole app works offline.
   Only same-origin GET requests are cached. CV data lives in IndexedDB and never passes through here,
   and cross-origin requests (model downloads, the optional cloud AI endpoint) are never intercepted. */
const CACHE = "thaflow-cv-v4";
const PAGES = ["/", "/create/", "/templates/", "/editor/", "/settings/"];
const EXTRA = ["/manifest.webmanifest", "/icon.svg", "/pdf.worker.min.mjs"];
const MAX_ASSETS = 300;

/** Store every page and follow the scripts they name (and the scripts those name), so lazily loaded
    parts of the app such as export and import are available offline too. Needs no build step. */
async function precache() {
  const cache = await caches.open(CACHE);
  const wanted = new Set(EXTRA);
  const queue = [];
  const note = (path) => {
    if (wanted.size < MAX_ASSETS && !wanted.has(path)) {
      wanted.add(path);
      queue.push(path);
    }
  };
  await Promise.allSettled(
    PAGES.map(async (page) => {
      const response = await fetch(page, { cache: "no-store" });
      if (!response.ok) return;
      const html = await response.clone().text();
      await cache.put(page, response);
      for (const match of html.matchAll(/\/_next\/static\/[^"'\\\s)]+\.(?:js|css)/g)) note(match[0]);
    }),
  );
  while (queue.length) {
    const batch = queue.splice(0, 8);
    await Promise.allSettled(
      batch.map(async (path) => {
        const response = (await cache.match(path)) ?? (await fetch(path));
        if (!response.ok) return;
        if (path.endsWith(".js")) {
          const source = await response.clone().text();
          for (const match of source.matchAll(/static\/chunks\/[A-Za-z0-9_.~/-]+\.(?:js|css)/g)) note(`/_next/${match[0]}`);
        }
        await cache.put(path, response);
      }),
    );
  }
  await Promise.allSettled(EXTRA.map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
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
