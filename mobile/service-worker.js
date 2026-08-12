"use strict";

const CACHE_NAME = "personal-ai-os-mobile-static-v2";
const STATIC_ASSETS = [
  "/app/index.html", "/app/style.css", "/app/storage.js", "/app/memory.js",
  "/app/app.js", "/app/pwa-register.js", "/mobile.css", "/manifest.webmanifest", "/version.json",
  "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(STATIC_ASSETS); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (name) {
      return name.startsWith("personal-ai-os-mobile-static-") && name !== CACHE_NAME;
    }).map(function (name) { return caches.delete(name); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(caches.match(request, { ignoreSearch: true }).then(function (response) {
    if (response) return response;
    if (request.mode === "navigate") return caches.match("/app/index.html");
    return new Response("Offline resource unavailable.", { status: 503, statusText: "Service Unavailable", headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
