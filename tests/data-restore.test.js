"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const memory = require(path.join(root, "memory.js"));
const storageSource = fs.readFileSync(path.join(root, "storage.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const storageKey = "personal-ai-os.v2-alpha";

function emptyState() {
  return { schemaVersion: 3, goals: [], captures: [], tasks: [], notes: [], decisions: [], dailyReviews: [] };
}

function restoredState() {
  return {
    schemaVersion: 3,
    goals: [{ id: "goal-1", title: "恢复目标", progress: 25 }],
    captures: [{ id: "capture-1", content: "恢复捕获", status: "converted" }],
    tasks: [{ id: "task-1", title: "恢复任务", status: "completed" }],
    notes: [{ id: "note-1", title: "恢复笔记", content: "完整正文", status: "archived" }],
    decisions: [{ id: "decision-1", problem: "恢复决策" }],
    dailyReviews: [{ id: "review-1", date: "2026-08-12", tomorrowGoal: "继续" }],
    preservedRootField: { future: true }
  };
}

function backupFor(state) {
  return memory.createDataBackup(state, "2026-08-12T03:04:05.000Z");
}

function loadStorage(initialValues, failWrites) {
  const values = new Map(Object.entries(initialValues || {}));
  let writes = 0;
  const localStorage = {
    getItem: function (key) { return values.has(key) ? values.get(key) : null; },
    setItem: function (key, value) {
      if (failWrites) throw new Error("quota failure");
      writes += 1;
      values.set(key, String(value));
    }
  };
  const window = { crypto: { randomUUID: function () { return "test-id"; } } };
  vm.runInNewContext(storageSource, { window, localStorage, Date, Math, JSON, Object, Array, String, Boolean });
  return {
    api: window.PersonalAIStorage,
    raw: function () { return values.get(storageKey); },
    value: function (key) { return values.get(key); },
    writes: function () { return writes; }
  };
}

test("parses and validates a complete Alpha 3.5 Schema v3 backup", function () {
  const state = restoredState();
  const parsed = memory.parseDataBackup(memory.serializeDataBackup(backupFor(state)));

  assert.equal(parsed.exportFormatVersion, 1);
  assert.equal(parsed.schemaVersion, 3);
  assert.equal(parsed.appVersion, "alpha-3.5");
  assert.equal(parsed.recordCounts.total, 6);
  assert.deepEqual(parsed.data, state);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.data));
});

test("rejects damaged JSON without producing restore data", function () {
  assert.throws(function () { memory.parseDataBackup("{ damaged"); }, /JSON/);
});

test("rejects wrong schemas and incomplete business collections", function () {
  const wrongFormat = JSON.parse(memory.serializeDataBackup(backupFor(restoredState())));
  wrongFormat.exportFormatVersion = 2;
  assert.throws(function () { memory.validateDataBackup(wrongFormat); }, /导出格式版本/);

  const wrongSchema = JSON.parse(memory.serializeDataBackup(backupFor(restoredState())));
  wrongSchema.schemaVersion = 4;
  assert.throws(function () { memory.validateDataBackup(wrongSchema); }, /Schema v3/);

  const missingCollection = JSON.parse(memory.serializeDataBackup(backupFor(restoredState())));
  delete missingCollection.data.dailyReviews;
  assert.throws(function () { memory.validateDataBackup(missingCollection); }, /dailyReviews/);

  const wrongCounts = JSON.parse(memory.serializeDataBackup(backupFor(restoredState())));
  wrongCounts.recordCounts.total = 99;
  assert.throws(function () { memory.validateDataBackup(wrongCounts); }, /统计不一致/);
});

test("restores complete raw Schema v3 data into an empty data space", function () {
  const runtime = loadStorage({ [storageKey]: JSON.stringify(emptyState()) });
  const state = restoredState();

  runtime.api.restoreDataBackup(state);

  assert.deepEqual(JSON.parse(runtime.raw()), state);
  assert.equal(runtime.writes(), 1);
});

test("refuses to overwrite a non-empty data space", function () {
  const current = emptyState();
  current.notes.push({ id: "existing", content: "必须保留" });
  const before = JSON.stringify(current);
  const runtime = loadStorage({ [storageKey]: before });

  assert.throws(function () { runtime.api.restoreDataBackup(restoredState()); }, /不是空的/);
  assert.equal(runtime.raw(), before);
  assert.equal(runtime.writes(), 0);
});

test("keeps existing data byte-for-byte unchanged after every restore failure", function () {
  const before = JSON.stringify(emptyState());
  const invalidIncoming = restoredState();
  delete invalidIncoming.tasks;
  const invalidRuntime = loadStorage({ [storageKey]: before });
  assert.throws(function () { invalidRuntime.api.restoreDataBackup(invalidIncoming); }, /tasks/);
  assert.equal(invalidRuntime.raw(), before);
  assert.equal(invalidRuntime.writes(), 0);

  const corrupt = "{ unreadable";
  const corruptRuntime = loadStorage({ [storageKey]: corrupt });
  assert.throws(function () { corruptRuntime.api.restoreDataBackup(restoredState()); }, /无法读取/);
  assert.equal(corruptRuntime.raw(), corrupt);
  assert.equal(corruptRuntime.writes(), 0);

  const writeFailure = loadStorage({ [storageKey]: before }, true);
  assert.throws(function () { writeFailure.api.restoreDataBackup(restoredState()); }, /quota failure/);
  assert.equal(writeFailure.raw(), before);
  assert.equal(writeFailure.writes(), 0);
});

test("refuses to overwrite legacy records when the Schema v3 key is absent", function () {
  const runtime = loadStorage({ notes: JSON.stringify(["legacy memory"]) });

  assert.throws(function () { runtime.api.restoreDataBackup(restoredState()); }, /不是空的/);
  assert.equal(runtime.raw(), undefined);
  assert.equal(runtime.value("notes"), JSON.stringify(["legacy memory"]));
  assert.equal(runtime.writes(), 0);
});

test("provides a native file preview and explicit restore controls", function () {
  [
    'id="memory-restore-file"',
    'accept=".json,application/json"',
    'id="memory-restore-preview"',
    'id="memory-restore-source"',
    'id="memory-restore-created"',
    'id="memory-restore-counts"',
    'id="memory-restore-button"'
  ].forEach(function (marker) { assert.ok(html.includes(marker), marker); });
  assert.match(appSource, /await file\.text\(\)/);
  assert.match(appSource, /memory\.parseDataBackup/);
  assert.match(appSource, /storage\.restoreDataBackup/);
  assert.doesNotMatch(appSource, /fetch\s*\(/);
});
