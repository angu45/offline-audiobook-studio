const CACHE_NAME = 'offline-audio-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/speech.js',
    '/js/player.js',
    '/pyscript/script_analyzer.py',
    '/pyscript/pyscript.json'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(response => response || fetch(e.request)));
});

