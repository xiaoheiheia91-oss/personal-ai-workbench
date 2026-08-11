"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const storage = fs.readFileSync(path.join(root, "storage.js"), "utf8");

test("loads the local memory layer before the application", function () {
  const storageIndex = html.indexOf('<script src="storage.js"></script>');
  const memoryIndex = html.indexOf('<script src="memory.js"></script>');
  const appIndex = html.indexOf('<script src="app.js"></script>');

  assert.ok(storageIndex >= 0);
  assert.ok(memoryIndex > storageIndex);
  assert.ok(appIndex > memoryIndex);
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i);
});

test("provides the personal memory entry and local controls", function () {
  [
    'href="#memory-center"',
    'id="memory-center"',
    'id="memory-search"',
    'id="memory-type"',
    'id="memory-order"',
    'id="memory-count"',
    'id="memory-records"'
  ].forEach(function (marker) { assert.ok(html.includes(marker), marker); });

  assert.match(app, /memory\.buildMemoryRecords\(state\)/);
  assert.match(app, /memory\.queryMemoryRecords\(allRecords/);
  assert.doesNotMatch(app, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
});

test("keeps Schema v3 and provides a native local backup control", function () {
  assert.match(storage, /const SCHEMA_VERSION = 3;/);
  assert.ok(html.includes('id="memory-backup-count"'));
  assert.ok(html.includes('id="memory-export-button"'));
  assert.ok(html.includes('id="memory-export-status"'));
  assert.match(app, /new Blob\(/);
  assert.match(app, /document\.createElement\("a"\)/);
  assert.match(app, /URL\.createObjectURL\(blob\)/);
  assert.doesNotMatch(app, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
});
