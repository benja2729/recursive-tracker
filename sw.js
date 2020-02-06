const PRECACHE_VERSION = 'recursive-tracker--precache-v0.0.0';
const RUNTIME_VERSION = 'recursive-tracker--runtime-v0.0.0';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/web_modules/lit-html.js',
  '/src/packages/templating.js',
  '/src/packages/Component.js',
  '/styles/app.css',
  '/styles/variables.css',
  '/src/browser/app.js',
  '/src/browser/components/g-card.js',
  '/src/workers/MessageTarget.js',
  '/src/workers/store-worker.js'
];

const log = (...args) => console.log('[ServiceWorker]', ...args);

async function clearStaleCaches() {
  const currentCaches = [PRECACHE_VERSION, RUNTIME_VERSION];
  const cacheNames = await caches.keys();
  const cachesToDelete = cacheNames.filter(
    cacheName => !currentCaches.includes(cacheName)
  );
  cachesToDelete.map(async cacheToDelete => {
    const success = await caches.delete(cacheToDelete);
    log(`[clearStaleCaches] clear ${cacheToDelete}`, success);
  });
}

/**
 * @param {Request} request
 * @param {RegExp | string} matcher
 */
function matchRequest(request, matcher) {
  const rgx = matcher instanceof RegExp ? matcher : new RegExp(matcher);
  return rgx.test(request.url);
}

/**
 * @param {FetchEvent} event
 * @param {(cache: Cache, request: Request) => Promise<Response>} callback
 */
async function findInCache(event, callback) {
  log(findInCache.name, event.request.url);
  let response = await caches.match(event.request);

  if (response) {
    log(`Found ${event.url} in cache`);
    return response;
  }

  if (typeof callback === 'function') {
    const cache = await caches.open(RUNTIME_VERSION);
    response = await callback(cache, event.request);

    if (response && response.ok) {
      log(`caching response for ${event.request.url}`);
      await cache.put(event.request, response.clone());
      return response;
    }
  }

  log(`defaulting to a regular fetch for ${event.request.url}`);
  return fetch(event.request);
}

/**
 * @param {Request} request
 */
async function fetchOnNetwork(request) {
  try {
    log(`Fetching ${request.url} from network`);
    const response = await fetch(request);

    if (!response.ok) {
      log(`Responded with status:`, response.status);
    }

    return response;
  } catch (error) {
    log('Implement offline response');
    throw error;
  }
}

self.addEventListener('install', event => {
  log('install');
  event.waitUntil(
    caches.open(PRECACHE_VERSION).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  log('activate');
  event.waitUntil(clearStaleCaches().then(() => self.skipWaiting()));
});

self.addEventListener('fetch', async event => {
  log('fetch');
  const { request } = event;

  const responsePromise = findInCache(event, () => {
    if (matchRequest(request, 'jsonplaceholder')) {
      return fetchOnNetwork(request);
    }
  });

  event.respondWith(responsePromise);
});

self.addEventListener('message', event => {
  log('message');
  log(event);
});
