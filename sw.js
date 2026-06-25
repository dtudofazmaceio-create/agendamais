/* Service Worker — Agenda Profissional
   Objetivo: tornar o app instalável e permitir abrir offline (a "casca" do app).
   IMPORTANTE: não interceptamos chamadas de outras origens (Firebase, CDNs),
   para que o Firestore continue funcionando normalmente pela rede. */

const CACHE = "agenda-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

// instala e pré-cacheia a casca do app
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// remove caches antigos ao ativar uma nova versão
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Só tratamos requisições da MESMA origem. Tudo de fora (Firebase, gstatic,
  // cdnjs, googleapis...) passa direto pela rede — sem cache, sem interferência.
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app): tenta a rede; se offline, cai para a casca em cache.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // Demais arquivos da própria origem: cache primeiro, com rede como reserva.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
