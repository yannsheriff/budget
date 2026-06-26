const CACHE_NAME = "budget-v2";

// En dev (localhost), le SW ne fait que gêner : il sert d'anciens chunks JS
// en cache-first. On le neutralise complètement : il se désinscrit, vide tous
// les caches, et recharge les pages qu'il contrôle pour repartir propre.
const isLocalDev =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

if (isLocalDev) {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        await self.registration.unregister();
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.navigate(c.url));
      })()
    );
  });
} else {
  // ─── Comportement normal (prod / PWA) ───

  // Static assets to pre-cache on install
  const PRECACHE_URLS = ["/icon-192.png", "/icon-512.png"];

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls & auth: always network, never cache
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/login")) {
      return;
    }

    // Static assets (JS, CSS, images): cache-first.
    // Sûr en prod car les chunks Next sont hashés (nouveau contenu = nouvelle URL).
    if (
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "image" ||
      request.destination === "font"
    ) {
      event.respondWith(
        caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
              return response;
            })
        )
      );
      return;
    }

    // Navigation & other requests: network-first with cache fallback
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  });
}
