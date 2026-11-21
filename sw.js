// TapLab v1.2: network-first navigation avoids showing an outdated row layout.
const CACHE = 'taplab-web-v2';
const ASSETS = ['./', './index.html', './taplab-row-v2.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate', e => {e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('taplab-web-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch', e => {
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 const isHTML=e.request.mode==='navigate'||u.pathname.endsWith('.html');
 e.respondWith(fetch(isHTML?new Request(e.request,{cache:'no-store'}):e.request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}
  return response;
 }).catch(()=>caches.match(e.request)));
});
