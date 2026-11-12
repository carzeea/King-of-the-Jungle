// King of the Jungle offline/fast-load helper.
// Art and sounds (versioned with ?v=) are kept on the phone after the first download, so later matches start instantly.
// The page, code and styles always come from the internet first, so players get every update right away;
// the saved copy is only used when there is no signal.
const ART = 'kotj-art-1', CODE = 'kotj-code-1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== ART && k !== CODE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  if (/^\/(assets|audio)\//.test(url.pathname)) e.respondWith(art(req, url));
  else if (req.mode === 'navigate' || /\.(js|css|json|webmanifest|html)$/.test(url.pathname) || url.pathname === '/') e.respondWith(code(req));
});

async function art(req, url) {
  const cache = await caches.open(ART);
  const hit = await cache.match(req);
  // versioned files (?v=) never change, so the saved copy is always right;
  // files without a version get refreshed quietly in the background for next time
  if (hit) { if (!url.search) e_refresh(cache, req); return hit; }
  const res = await fetch(req);
  if (res.ok && res.status === 200) {
    const copy = res.clone();
    (async () => {
      // drop older versions of the same file so the phone doesn't fill up
      for (const k of await cache.keys()) { const u = new URL(k.url); if (u.pathname === url.pathname && u.search !== url.search) await cache.delete(k); }
      await cache.put(req, copy);
    })().catch(() => {});
  }
  return res;
}

function e_refresh(cache, req) {
  fetch(req).then(r => { if (r.ok && r.status === 200) return cache.put(req, r); }).catch(() => {});
}

async function code(req) {
  const cache = await caches.open(CODE);
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    throw err;
  }
}
