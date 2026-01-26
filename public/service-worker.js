// 'Killer' Service Worker
// Este archivo está diseñado para reemplazar cualquier Service Worker anterior
// y forzar una actualización inmediata y limpieza en los clientes.

const CACHE_NAME = 'killer-sw-v1';

self.addEventListener('install', (event) => {
    // Saltar espera para activarse inmediatamente
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Tomar control de todos los clientes inmediatamente
    event.waitUntil(
        self.clients.claim().then(() => {
            // Opcional: Desregistrar para que en la próxima carga no haya SW
            self.registration.unregister().then(() => {
                console.log('Killer SW: Se ha desregistrado a sí mismo.');
            });
        })
    );

    // Limpiar cualquier caché antigua
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Killer SW: Borrando caché', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// Interceptar fetch y no hacer nada (pasar a la red)
self.addEventListener('fetch', (event) => {
    // No cachear nada, paso directo a la red (Network Only)
    event.respondWith(fetch(event.request));
});
