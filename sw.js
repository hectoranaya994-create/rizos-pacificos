// sw.js — Rizos Pacíficos / SurtiElena
// Permite abrir ventas (y admin) SIN internet. Va en la RAÍZ del repositorio, junto a vendedor.html.
// · Páginas (vendedor.html, admin.html, demo/…): primero intenta internet (para recibir siempre la última versión);
//   si no hay señal o tarda más de 4 s, abre la copia guardada en el celular.
// · Librerías de Firebase (gstatic.com): se guardan la primera vez y se usan desde el celular.
// Los datos (clientes, pedidos…) NO pasan por aquí: los maneja la app con su propia memoria y cola de envío.
const CACHE = 'se-app-v1';
const BASE = new URL('./', self.location).pathname;   // /rizos-pacificos/

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['vendedor.html'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('se-app-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin && u.pathname.startsWith(BASE)) e.respondWith(internetPrimero(r));
  else if (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) e.respondWith(guardadoPrimero(r));
  // todo lo demás (Firebase en tiempo real, otras páginas) pasa normal
});

async function internetPrimero(r) {
  const c = await caches.open(CACHE);
  // cache: 'no-cache' = siempre pregunta al servidor si hay versión nueva (no usa la copia vieja del navegador)
  const red = fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; });
  const guardado = await c.match(r, { ignoreSearch: true });
  if (!guardado) return red;
  return Promise.race([
    red.catch(() => guardado),
    new Promise(ok => setTimeout(() => ok(guardado), 4000))   // señal muy lenta: abre lo guardado
  ]);
}

async function guardadoPrimero(r) {
  const c = await caches.open(CACHE);
  const g = await c.match(r);
  if (g) return g;
  const res = await fetch(r);
  if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone());
  return res;
}
