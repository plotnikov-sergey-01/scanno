/* Scanno SW — network-first for pages; do not freeze HTML without CSS. */
const CACHE = "scanno-static-v2";
const STATIC = ["/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always network-first for documents and Next assets so CSS/JS stay fresh.
  if (
    request.mode === "navigate" ||
    request.destination === "document" ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
