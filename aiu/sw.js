/* Bei jeder Auslieferung erhoehen. Der alte Cache wird beim Aktivieren geloescht. */
const VERSION='v14-steueransicht';
const CACHE=`kiu-begleitapp-${VERSION}`;
const CORE=[
  './',
  './index.html',
  './styles.css',
  './gems.css',
  './app.js',
  './app-store.js',
  './app-juice.js',
  './app-kiosk.js',
  './app-core.js',
  './config-loader.js',
  './sync-config.js',
  './app-sync.js',
  './app-ship.js',
  './app-gems.js',
  './app-input.js',
  './app-teacher.js',
  './segelschiff-header.html',
  './segelschiff-steuermann.html',
  './config-base.json',
  './weeks-01-05.json',
  './weeks-06-10.json',
  './weeks-11-15.json',
  './startkarte.svg',
  './startkarte.json',
  './icon.svg',
  './app.webmanifest',
  './vendor/three.min.js',
  './vendor/supabase.js',
  './fonts/alegreya-latin-400-normal.woff2',
  './fonts/alegreya-latin-700-normal.woff2',
  './fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  './fonts/atkinson-hyperlegible-latin-700-normal.woff2'
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
