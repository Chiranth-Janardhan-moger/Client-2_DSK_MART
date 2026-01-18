const CACHE_NAME = 'dsk-admin-v2';
const MAP_CACHE_NAME = 'dsk-map-tiles-v1';

const urlsToCache = [
  '/',
  '/index.html',
];

// Bangalore area bounds for tile caching (zoom levels 12-16)
const BANGALORE_BOUNDS = {
  minLat: 12.75,
  maxLat: 13.05,
  minLng: 77.45,
  maxLng: 77.75,
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MAP_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Handle OpenStreetMap tile requests
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(MAP_CACHE_NAME).then(async (cache) => {
        // Try cache first
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Fetch and cache
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Return a gray tile placeholder if offline
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }
  
  // Handle Leaflet library files
  if (url.hostname === 'unpkg.com' && url.pathname.includes('leaflet')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }
  
  // Default: network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Message handler for pre-caching map tiles
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MAP_TILES') {
    event.waitUntil(cacheMapTiles());
  }
});

// Pre-cache Bangalore map tiles for zoom levels 12-15
async function cacheMapTiles() {
  const cache = await caches.open(MAP_CACHE_NAME);
  const tiles = [];
  
  // Generate tile URLs for Bangalore area (zoom 12-15)
  for (let zoom = 12; zoom <= 15; zoom++) {
    const minTileX = lonToTile(BANGALORE_BOUNDS.minLng, zoom);
    const maxTileX = lonToTile(BANGALORE_BOUNDS.maxLng, zoom);
    const minTileY = latToTile(BANGALORE_BOUNDS.maxLat, zoom);
    const maxTileY = latToTile(BANGALORE_BOUNDS.minLat, zoom);
    
    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        const servers = ['a', 'b', 'c'];
        const server = servers[Math.floor(Math.random() * servers.length)];
        tiles.push(`https://${server}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
      }
    }
  }
  
  console.log(`Caching ${tiles.length} map tiles for Bangalore...`);
  
  // Cache tiles in batches to avoid overwhelming the network
  const batchSize = 10;
  for (let i = 0; i < tiles.length; i += batchSize) {
    const batch = tiles.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (e) {
          // Ignore failed tiles
        }
      })
    );
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Map tiles cached successfully!');
}

// Convert longitude to tile X
function lonToTile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

// Convert latitude to tile Y
function latToTile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}
