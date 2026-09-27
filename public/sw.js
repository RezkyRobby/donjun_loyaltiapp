// Service worker PWA pelanggan Donjun Donat (PRD §9 PWA & Mode Offline).
//
// Tujuan: saat koneksi tidak stabil, cache aplikasi, QR Code akun, dan saldo
// poin terakhir tetap dapat ditampilkan (read-only). Hanya permintaan GET
// same-origin yang ditangani; seluruh mutasi (klaim voucher, injeksi poin)
// selalu memerlukan koneksi dan tidak pernah di-cache.

const CACHE_VERSION = "v1";
const STATIC_CACHE = `donjun-static-${CACHE_VERSION}`;
const DOCUMENT_CACHE = `donjun-document-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline";

// Hanya dokumen Beranda yang memuat QR Code akun dan saldo poin sehingga
// disimpan untuk akses offline. Halaman lain memakai halaman fallback offline.
const CACHEABLE_DOCUMENT_PATHS = ["/dashboard"];

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(DOCUMENT_CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DOCUMENT_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableDocument(pathname) {
  return CACHEABLE_DOCUMENT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstDocument(request, pathname) {
  const cache = await caches.open(DOCUMENT_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok && isCacheableDocument(pathname)) {
      await cache.put(pathname, response.clone());
    }
    return response;
  } catch {
    const cachedDocument = await cache.match(pathname);
    if (cachedDocument) return cachedDocument;

    const offlinePage = await cache.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;

    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstDocument(request, url.pathname));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(cacheFirst(request));
  }
});
