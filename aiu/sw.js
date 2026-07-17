const CACHE='kiu-begleitapp-v3-1';
const CORE=[
  './',
  './index.html',
  './styles.css',
  './gems.css',
  './app.js',
  './app-core.js',
  './config-loader.js',
  './sync-config.js',
  './app-sync.js',
  './app-ship.js',
  './app-gems.js',
  './app-input.js',
  './app-teacher.js',
  './segelschiff-header.html',
  './config-base.json',
  './weeks-01-05.json',
  './weeks-06-10.json',
  './weeks-11-15.json',
  './karte.svg',
  './icon.svg',
  './app.webmanifest'
];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request))
  );
});
