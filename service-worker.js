const CACHE_NAME = 'glamurosa-pwa-v10';

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
    './assets/img/icon.svg',
    './assets/img/icon-192x192.png',
    './assets/img/icon-512x512.png',
    './css/style.css',
    './css/auth.css',
    './js/auth.js',
    './js/firebase-config.js',
    './js/account-nav.js',
    './js/admin.js',
    './css/admin.css',
    './js/storage.js',
    './js/page-loader.js',
    './css/contacto.css',
    './js/pwa.js',
    './js/reserva.js',
    './assets/img/LOGO_GLAMUROSA.png',
    './assets/img/SERVICIO.jpeg',
    './assets/img/SETUP-GLAMUROSA.jpg',
    './assets/img/GLAMUROSA FONDO.jpeg',
];

// Activar solo cuando todos los recursos hayan terminado de guardarse.
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(ASSETS_TO_CACHE);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith('glamurosa-pwa-') && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

const assetURLs = new Set(ASSETS_TO_CACHE.map(path => new URL(path, self.location.href).href));
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
    url.search = '';
    if (!assetURLs.has(url.href)) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetch(event.request);
            if (response.ok) await cache.put(url.href, response.clone());
            if (response.status >= 500) return await cache.match(url.href) || response;
            return response;
        } catch (error) {
            const cached = await cache.match(url.href);
            if (cached) return cached;
            throw error;
        }
    })());
});
