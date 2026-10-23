# Chunk load recovery (#78)

Pages deploys swap the whole site atomically, so a fresh load is always
consistent. The risk is a tab left open across a deploy: a client-side
navigation asks for `/_next/static/chunks/<old-hash>.js`, gets a 404 and throws
`ChunkLoadError`.

## What recovers it

- `src/lib/chunk-load-recovery.ts` recognises a chunk failure (`name ===
  'ChunkLoadError'`, or a message containing "Loading chunk", "Loading CSS
  chunk" or "Failed to fetch dynamically imported module") and calls
  `location.reload()` once.
- The guard is a `sessionStorage` flag (`stw-chunk-recovery-attempted`). It is
  cleared only after the page has stayed up for 10 s (`STABLE_MS`), so a chunk
  that stays broken reloads once and then stops. If storage is blocked the
  module treats recovery as already attempted and never reloads.
- `src/components/atomic/ChunkLoadRecovery` mounts the `error` and
  `unhandledrejection` listeners once from `src/app/layout.tsx`.
- `src/app/global-error.tsx` passes the error it receives through the same
  once-per-session handler. There is no `src/app/error.tsx`.

## Service worker (`public/sw.js`)

The fetch handler has four branches: `/api/` (network first), images (cache
first), `request.mode === 'navigate'` (network first, lines 125-158) and a
default (stale while revalidate, lines 161-175). `_next/static` chunks are
plain GETs, so they take the default branch:

```js
// Default strategy - Stale While Revalidate
event.respondWith(
  caches.match(request).then((response) => {
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.status === 200) { ... cache.put(request, responseToCache) ... }
      return networkResponse;
    });
    return response || fetchPromise;
  })
);
```

- **Mitigates, partly.** A chunk the tab (or an earlier visit) already fetched
  is in `DYNAMIC_CACHE` and is served from cache even after the old file is
  gone. `CACHE_VERSION` is a constant (`'spoketowork-v1.0.0'`, line 4), so the
  activate step (lines 40-60) never purges that cache and old chunks stay.
- **Does not cover the failing case.** `STATIC_ASSETS` (lines 10-18) holds no
  chunks, so a route the tab never visited has nothing cached. That is exactly
  the stale-tab navigation, and it 404s through to `ChunkLoadError`.
- **Does not serve stale HTML with fresh assets while online.** Navigations are
  network first (`fetch(request).then(...)`, lines 128-137), so a deploy gives
  fresh HTML that references fresh chunks. Cached HTML is returned only in the
  `.catch` (line 139), i.e. offline, when fresh chunks could not load anyway.

Net: the service worker neither causes nor fully prevents the error.

## Asset retention

Not built. Atomic deploys plus the reload above cover the risk; the service
worker finding changed nothing about that.
