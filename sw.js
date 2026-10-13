const CACHE = 'educacion-x-core-v3';
const SHELL = [
  './', './index.html', './styles.css', './app.js',
  './core/pedagogy.js', './core/tutor.js', './core/dialogue.js', './core/academy.js', './core/storage.js', './data/curriculum.js',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './manifest.webmanifest'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key=>key.startsWith('educacion-x-core-') && key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Una PWA estática autocontenida: jamás interceptar APIs de otra aplicación.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch(e) {
      if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      throw e;
    }
  })());
});
