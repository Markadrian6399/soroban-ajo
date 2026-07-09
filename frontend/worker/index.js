/**
 * Custom Service Worker for Ajo PWA
 * Handles push notifications, background sync, and offline caching.
 * next-pwa merges this with the generated sw.js via importScripts.
 */

const CACHE_VERSION = 'v2'
const STATIC_CACHE = `ajo-static-${CACHE_VERSION}`
const API_CACHE = `ajo-api-${CACHE_VERSION}`
const PENDING_SYNC_CACHE = 'ajo-pending-actions'

// ─── Install: pre-cache critical shell assets ─────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']).catch(() => {
        /* non-fatal if some assets missing */
      })
    )
  )
  self.skipWaiting()
})

// ─── Activate: clean up old caches ───────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k.startsWith('ajo-') &&
                k !== STATIC_CACHE &&
                k !== API_CACHE &&
                k !== PENDING_SYNC_CACHE
            )
            .map((k) => caches.delete(k))
        )
      )
  )
  self.clients.claim()
})

// ─── Fetch: network-first for API, cache-first for static ────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests (except API)
  if (request.method !== 'GET') return

  // API routes: network-first with cache fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('localhost:3001')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 60))
    return
  }

  // Navigation: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then((r) => r || new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  // Static assets: stale-while-revalidate
  if (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
  }
})

async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return (
      cached ||
      new Response(JSON.stringify({ error: 'offline', cached: false }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  return cached || (await fetchPromise) || new Response('Not found', { status: 404 })
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Ajo', body: event.data.text() }
  }

  const {
    title = 'Ajo',
    body = '',
    icon = '/icon-192.png',
    badge = '/icon-192.png',
    url = '/',
    tag,
    data: extraData,
  } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: tag || 'ajo-notification',
      data: { url, ...extraData },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})

// ─── Background Sync ─────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contributions') {
    event.waitUntil(syncPendingContributions())
  }
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions())
  }
})

async function syncPendingContributions() {
  try {
    const cache = await caches.open(PENDING_SYNC_CACHE)
    const keys = await cache.keys()
    for (const request of keys) {
      if (!request.url.includes('contribution')) continue
      const response = await cache.match(request)
      if (!response) continue
      const body = await response.json()
      const result = await fetch(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (result.ok) await cache.delete(request)
    }
  } catch {
    // Will retry on next sync event
  }
}

async function syncPendingActions() {
  try {
    const cache = await caches.open(PENDING_SYNC_CACHE)
    const keys = await cache.keys()
    for (const request of keys) {
      const response = await cache.match(request)
      if (!response) continue
      const { method = 'POST', body } = await response.json()
      const result = await fetch(request.url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (result.ok) await cache.delete(request)
    }
  } catch {
    // Will retry on next sync event
  }
}

// ─── Message handler (from app) ───────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'QUEUE_ACTION') {
    const { url, method, body } = event.data.payload
    caches.open(PENDING_SYNC_CACHE).then((cache) => {
      cache.put(
        new Request(url),
        new Response(JSON.stringify({ method, body }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  }
})
