"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const mobile = path.join(root, "mobile");

function read(relativePath) {
  return fs.readFileSync(path.join(mobile, relativePath), "utf8");
}

test("ships an isolated Mobile PWA release with explicit compatible versions", function () {
  const version = JSON.parse(read("version.json"));
  const manifest = JSON.parse(read("manifest.webmanifest"));
  const vercel = JSON.parse(read("vercel.json"));

  assert.deepEqual(version, {
    appVersion: "alpha-3.5.2-mobile",
    coreVersion: "alpha-3.5.2",
    schemaVersion: 3
  });
  assert.equal(manifest.start_url, "./app/index.html");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#07101d");
  assert.equal(manifest.icons.length, 3);
  assert.deepEqual(vercel.rewrites, [{ source: "/", destination: "/app/index.html" }]);
});

test("keeps Alpha 3.5.2 business runtime copies byte-identical", function () {
  ["app.js", "storage.js", "memory.js", "style.css"].forEach(function (name) {
    assert.equal(fs.readFileSync(path.join(root, name), "utf8"), read(path.join("app", name)), name);
  });
});

test("adds only isolated Mobile PWA metadata around the copied page", function () {
  const html = read(path.join("app", "index.html"));
  assert.match(html, /personal-ai-os-app-version" content="alpha-3\.5\.2-mobile"/);
  assert.match(html, /personal-ai-os-core-version" content="alpha-3\.5\.2"/);
  assert.match(html, /rel="manifest" href="\.\.\/manifest\.webmanifest"/);
  assert.match(html, /src="pwa-register\.js"/);
  assert.match(html, /Mobile PWA · alpha-3\.5\.2-mobile/);
});

test("uses a static-only service worker with no data or network API access", function () {
  const worker = read("service-worker.js");
  const register = read(path.join("app", "pwa-register.js"));

  assert.match(worker, /cache\.addAll\(STATIC_ASSETS\)/);
  assert.match(worker, /caches\.match/);
  assert.match(worker, /version\.json/);
  assert.doesNotMatch(worker, /localStorage|indexedDB|fetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(register, /localStorage|fetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.match(register, /serviceWorker\.register/);
});

test("includes locally packaged SVG and PNG install icons", function () {
  ["icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"].forEach(function (name) {
    const file = path.join(mobile, "icons", name);
    assert.ok(fs.existsSync(file), name);
    assert.ok(fs.statSync(file).size > 100, name);
  });
});
