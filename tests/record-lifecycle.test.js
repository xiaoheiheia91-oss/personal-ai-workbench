"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const storageSource = fs.readFileSync(path.join(root, "storage.js"), "utf8");
const storageKey = "personal-ai-os.v2-alpha";

function fixtureState() {
  return {
    schemaVersion: 3,
    goals: [{ id: "goal-1", title: "保留记录", progress: 0 }],
    captures: [{ id: "capture-1", content: "原始捕获", category: "idea", status: "inbox", source: "manual", createdAt: "2026-08-12T01:00:00.000Z", relatedGoal: null, relatedProject: null, context: { convertedTaskId: null, convertedNoteId: null } }],
    tasks: [{ id: "task-1", title: "生命周期任务", priority: "medium", status: "todo", createdAt: "2026-08-12T01:00:00.000Z", updatedAt: "2026-08-12T01:00:00.000Z", completedAt: null, dueDate: null, today: false, todayDate: null, sourceCaptureId: null, context: { relatedGoal: null, relatedProject: null } }],
    notes: [{ id: "note-1", title: "生命周期笔记", content: "永久保留", tags: ["history"], status: "active", sourceCaptureId: null, relatedGoal: null, relatedProject: null, createdAt: "2026-08-12T01:00:00.000Z", updatedAt: "2026-08-12T01:00:00.000Z", context: { sourceCaptureId: null, relatedTaskIds: [], relatedDecisionIds: [], source: "manual" } }],
    decisions: [{ id: "decision-1", problem: "保留决策", choice: "", reason: "", risk: "", result: null, context: { relatedGoal: null, relatedProject: null, createdAt: "2026-08-12T01:00:00.000Z", reviewedAt: null } }],
    dailyReviews: [{ id: "review-1", date: "2026-08-11", tomorrowGoal: "保留历史复盘", createdAt: "2026-08-11T01:00:00.000Z", updatedAt: "2026-08-11T01:00:00.000Z" }]
  };
}

function loadStorage(state) {
  const values = new Map([[storageKey, JSON.stringify(state)]]);
  let networkRequests = 0;
  const localStorage = {
    getItem: function (key) { return values.has(key) ? values.get(key) : null; },
    setItem: function (key, value) { values.set(key, String(value)); }
  };
  const window = { crypto: { randomUUID: function () { return "test-id"; } } };
  vm.runInNewContext(storageSource, {
    window: window,
    localStorage: localStorage,
    fetch: function () { networkRequests += 1; throw new Error("network forbidden"); },
    Date: Date,
    Math: Math,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    Boolean: Boolean
  });
  return {
    api: window.PersonalAIStorage,
    read: function () { return JSON.parse(values.get(storageKey)); },
    networkRequests: function () { return networkRequests; }
  };
}

test("provides default-all lifecycle filters and history containers", function () {
  [
    'id="capture-status-filter"',
    'id="task-status-filter"',
    'id="cancelled-tasks"',
    'id="note-status-filter"',
    'id="decision-status-filter"',
    'id="review-range-filter"',
    'id="review-history"'
  ].forEach(function (marker) { assert.ok(html.includes(marker), marker); });

  assert.match(html, /id="capture-status-filter"><option value="">全部状态/);
  assert.match(html, /id="task-status-filter"><option value="">全部状态/);
  assert.match(html, /id="note-status-filter"><option value="">全部状态/);
  assert.match(html, /id="decision-status-filter"><option value="">全部状态/);
  assert.match(html, /id="review-range-filter"><option value="">全部历史/);
  assert.match(appSource, /renderReviewHistory\(state\.dailyReviews\)/);
});

test("changes lifecycle status without removing business records", function () {
  const runtime = loadStorage(fixtureState());
  const before = runtime.read();

  runtime.api.completeTask("task-1");
  runtime.api.updateTask("task-1", { status: "cancelled" });
  runtime.api.archiveCapture("capture-1");
  runtime.api.archiveNote("note-1");

  const archived = runtime.read();
  assert.equal(archived.tasks.length, before.tasks.length);
  assert.equal(archived.captures.length, before.captures.length);
  assert.equal(archived.notes.length, before.notes.length);
  assert.equal(archived.decisions.length, before.decisions.length);
  assert.equal(archived.dailyReviews.length, before.dailyReviews.length);
  assert.equal(archived.tasks[0].status, "cancelled");
  assert.equal(archived.captures[0].status, "archived");
  assert.equal(archived.notes[0].status, "archived");

  runtime.api.restoreNote("note-1");
  assert.equal(runtime.read().notes[0].status, "active");
  assert.equal(runtime.read().notes.length, before.notes.length);
  assert.equal(runtime.networkRequests(), 0);
});

test("does not expose physical note deletion or clear an existing goal", function () {
  const runtime = loadStorage(fixtureState());
  const before = JSON.stringify(runtime.read());

  assert.equal(runtime.api.deleteNote, undefined);
  assert.throws(function () { runtime.api.saveTodayGoal("   "); }, /不会被删除/);
  assert.equal(JSON.stringify(runtime.read()), before);
  assert.doesNotMatch(storageSource, /\.splice\s*\(/);
  assert.doesNotMatch(storageSource, /state\.goals\s*=\s*\[\s*\]/);
  assert.doesNotMatch(appSource, /deleteNote|删除这条笔记|无法恢复/);
});

test("keeps Schema v3 and contains no network dependency", function () {
  assert.match(storageSource, /const SCHEMA_VERSION = 3;/);
  assert.doesNotMatch(storageSource + appSource, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
});
