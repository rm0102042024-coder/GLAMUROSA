const CACHE_NAME = 'glamurosa-pwa-v1';

// Lista de archivos clave de tu estructura de directorios a guardar en caché
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './reserva.html',
  './admin.html',
  './manifest.json',
  './css/style.css',
  './css/admin.css',
  './js/firebase-config.js',
  './js/auth.js',
  './js/reserva.js',
  './js/admin.js'
];

// Evento Install: Se ejecuta la primera vez que la PWA se carga
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Abriendo caché local');
        // Almacena todos los archivos estáticos declarados
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Fuerza a que el Service Worker se active de inmediato
  self.skipWaiting(); 
});

// Evento Activate: Ideal para limpiar cachés de versiones anteriores
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre de la caché cambió, borra la antigua
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Evento Fetch: Intercepta las peticiones de red
self.addEventListener('fetch', event => {
  // Ignora las peticiones a Firebase u otros dominios externos
  if (!(event.request.url.indexOf('http') === 0)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el archivo de la caché si existe
        if (response) {
          return response;
        }
        // Si no está en caché, lo busca en la red
        return fetch(event.request);
      })
  );
});