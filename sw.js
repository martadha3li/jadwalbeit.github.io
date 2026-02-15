self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("jadwal-cache").then(cache => {
      return cache.addAll(["./","./index.html","./manifest.json","./style.css","./app.js"]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
