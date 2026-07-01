const CACHE_VER    = 'benzok-v1';
const TILE_CACHE   = 'benzok-tiles-v1';
const STATION_CACHE = 'benzok-stations-v1';

const isTile     = url => url.includes('carto') || url.includes('openstreetmap');
const isStations = url => url.includes('/api/stations');

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Удаляем устаревшие кэши при обновлении SW
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VER && k !== TILE_CACHE && k !== STATION_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { url, method } = e.request;
  if (method !== 'GET') return;

  // Тайлы карты: cache-first (URL тайла никогда не меняется)
  if (isTile(url)) {
    e.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Список станций: stale-while-revalidate (показываем из кэша, обновляем в фоне)
  if (isStations(url)) {
    e.respondWith(
      caches.open(STATION_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
          return cached ?? fresh;
        })
      )
    );
    return;
  }
  // Голоса и всё остальное — только сеть (данные должны быть свежими)
});
