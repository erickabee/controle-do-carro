// Endereço antigo: este service worker substitui o do aplicativo antigo,
// apaga o que ficou guardado no celular e se desliga. A própria página
// (index.html) leva ao endereço novo, mantendo o que vem depois do "#".
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var chaves = await caches.keys();
    await Promise.all(chaves.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
  })());
});
