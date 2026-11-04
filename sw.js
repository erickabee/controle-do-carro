// Guarda os arquivos do aplicativo para funcionar sem internet.
// Ao mudar qualquer arquivo, aumente o número da versão abaixo.
var VERSAO = 'controle-carro-v1';
var ARQUIVOS = ['./', './index.html', './css/estilo.css', './js/calculos.js', './js/demo.js', './js/app.js',
  './manifest.webmanifest', './icone.svg', './icone-192.png', './icone-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Rede primeiro (para pegar atualizações); sem internet, usa a cópia guardada.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone();
    if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(VERSAO).then(function (c) { c.put(e.request, copia); });
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
