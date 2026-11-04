// Guarda os arquivos do aplicativo para funcionar sem internet.
// Ao mudar qualquer arquivo, aumente o número da versão abaixo.
var VERSAO = 'controle-carro-v2';
var ARQUIVOS = ['./', './index.html', './css/estilo.css', './js/calculos.js', './js/demo.js', './js/nuvem.js', './js/app.js',
  './firebase-config.js', './manifest.webmanifest', './icone.svg', './icone-192.png', './icone-512.png'];
var SDK = 'https://www.gstatic.com/firebasejs/';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) {
    // Um arquivo que falhar (ex.: firebase-config.js ausente) não impede os outros.
    return Promise.all(ARQUIVOS.map(function (a) { return c.add(a).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // SDK do Firebase (versão fixa no endereço): usa a cópia guardada, senão baixa e guarda.
  if (e.request.url.indexOf(SDK) === 0) {
    e.respondWith(caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (resp) {
        var copia = resp.clone();
        if (resp.ok) caches.open(VERSAO).then(function (c) { c.put(e.request, copia); });
        return resp;
      });
    }));
    return;
  }
  // Login e banco de dados do Google: nunca passam pelo cache.
  if (url.origin !== location.origin) return;
  // Arquivos do próprio site: rede primeiro (pega atualizações); sem internet, usa a cópia.
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone();
    if (r.ok) caches.open(VERSAO).then(function (c) { c.put(e.request, copia); });
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
