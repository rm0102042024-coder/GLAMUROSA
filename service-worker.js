const CACHE_NAME = 'glamurosa-pwa-v4';

// Lista de archivos clave a guardar en caché para la PWA
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './nosotros.html',
    './servicios.html',
    './login.html',
    './admin.html',
    './contacto.html',
    './reserva.html',
    './manifest.json',
    './css/style.css',
    './css/contacto.css',
    './js/pwa.js',
    './js/reserva.js',
    './assets/img/LOGO_GLAMUROSA.png',
    './assets/img/GLAMUROSA FONDO.jpeg',
];

// Evento Install: Se ejecuta la primera vez que la PWA se carga
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Abriendo caché local');
            return cache.addAll(ASSETS_TO_CACHE);
        }),
    );
    self.skipWaiting();
});

// Evento Activate: Limpia cachés de versiones anteriores
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                }),
            );
        }),
    );
    self.clients.claim();
});

// Evento Fetch: Intercepta las peticiones de red
self.addEventListener('fetch', (event) => {
    // Ignora las peticiones a Firebase u otros dominios externos
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Devuelve el archivo de la caché si existe o busca en la red
            return response || fetch(event.request);
        }),
    );
});
