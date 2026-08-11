"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const memoryPath = path.join(__dirname, "..", "memory.js");

function fixtureState() {
  return {
    schemaVersion: 3,
    goals: [{ id: "goal-1", title: "完成 Alpha 3.5", progress: 25 }],
    captures: [{
      id: "capture-1",
      content: "保留所有捕获",
      category: "idea",
      status: "archived",
      source: "manual",
      createdAt: "2026-08-10T08:00:00.000Z",
      relatedGoal: "goal-1",
      relatedProject: "personal-ai-os",
      context: { convertedTaskId: null, convertedNoteId: null }
    }, {
      id: "capture-2",
      content: "已经转换的捕获",
      category: "task",
      status: "converted",
      source: "manual",
      createdAt: "2026-08-10T08:30:00.000Z",
      relatedGoal: null,
      relatedProject: null,
      context: { convertedTaskId: "task-2", convertedNoteId: null }
    }],
    tasks: [{
      id: "task-1",
      title: "建立个人记忆层",
      priority: "high",
      status: "cancelled",
      createdAt: "2026-08-10T09:00:00.000Z",
      updatedAt: "2026-08-11T09:00:00.000Z",
      completedAt: null,
      dueDate: "2026-08-12",
      today: false,
      todayDate: null,
      sourceCaptureId: "capture-1",
      context: { relatedGoal: "goal-1", relatedProject: "personal-ai-os" }
    }, {
      id: "task-2",
      title: "完成记录中心",
      priority: "medium",
      status: "completed",
      createdAt: "2026-08-11T09:00:00.000Z",
      updatedAt: "2026-08-12T09:00:00.000Z",
      completedAt: "2026-08-12T09:00:00.000Z",
      dueDate: null,
      today: true,
      todayDate: "2026-08-12",
      sourceCaptureId: "capture-2",
      context: { relatedGoal: null, relatedProject: null }
    }],
    notes: [{
      id: "note-1",
      title: "Local First",
      content: "AI Optional",
      tags: ["architecture", "local-first"],
      status: "archived",
      sourceCaptureId: null,
      relatedGoal: "goal-1",
      relatedProject: "personal-ai-os",
      createdAt: "2026-08-10T10:00:00.000Z",
      updatedAt: "2026-08-12T10:00:00.000Z",
      context: { source: "manual", relatedTaskIds: ["task-1"], relatedDecisionIds: ["decision-1"] }
    }],
    decisions: [{
      id: "decision-1",
      problem: "是否升级 Schema",
      choice: "保持 v3",
      reason: "投影无需持久化",
      risk: "未来可能升级",
      result: null,
      context: {
        relatedGoal: "goal-1",
        relatedProject: "personal-ai-os",
        createdAt: "2026-08-11T11:00:00.000Z",
        reviewedAt: null
      }
    }],
    dailyReviews: [{
      id: "review-1",
      date: "2026-08-12",
      tomorrowGoal: "验证 MemoryRecord",
      createdAt: "2026-08-12T12:00:00.000Z",
      updatedAt: "2026-08-12T12:30:00.000Z"
    }]
  };
}

test("projects every Alpha 3 record type without filtering statuses", function () {
  const memory = require(memoryPath);
  const records = memory.buildMemoryRecords(fixtureState());

  assert.equal(records.length, 8);
  assert.deepEqual(new Set(records.map(function (record) { return record.type; })), new Set(memory.RECORD_TYPES));
  assert.equal(records.find(function (record) { return record.id === "note-1"; }).status, "archived");
  assert.equal(records.find(function (record) { return record.id === "task-1"; }).status, "cancelled");
  assert.equal(records.find(function (record) { return record.id === "task-2"; }).status, "completed");
  assert.equal(records.find(function (record) { return record.id === "capture-1"; }).status, "archived");
  assert.equal(records.find(function (record) { return record.id === "capture-2"; }).status, "converted");
});

test("queries records locally by text, type, and time order without excluding statuses", function () {
  const memory = require(memoryPath);
  const records = memory.buildMemoryRecords(fixtureState());

  assert.deepEqual(memory.queryMemoryRecords(records).map(function (record) { return record.id; }), records.map(function (record) { return record.id; }));
  assert.deepEqual(memory.queryMemoryRecords(records, { type: "capture" }).map(function (record) { return record.id; }).sort(), ["capture-1", "capture-2"]);
  assert.deepEqual(memory.queryMemoryRecords(records, { query: "local-first" }).map(function (record) { return record.id; }), ["note-1"]);
  assert.deepEqual(memory.queryMemoryRecords(records, { query: "cancelled" }).map(function (record) { return record.id; }), ["task-1"]);
  assert.deepEqual(memory.queryMemoryRecords(records, { query: "converted" }).map(function (record) { return record.id; }), ["capture-2"]);

  const newest = memory.queryMemoryRecords(records, { order: "newest" });
  const oldest = memory.queryMemoryRecords(records, { order: "oldest" });
  assert.equal(newest[0].id, "review-1");
  assert.equal(oldest[0].id, "capture-1");
  assert.equal(newest[newest.length - 1].id, "goal-1");
  assert.equal(oldest[oldest.length - 1].id, "goal-1");
});

test("returns detached, frozen MemoryRecords and preserves the Schema v3 input", function () {
  const memory = require(memoryPath);
  const state = fixtureState();
  const before = JSON.stringify(state);
  const records = memory.buildMemoryRecords(state);
  const note = records.find(function (record) { return record.id === "note-1"; });

  assert.equal(JSON.stringify(state), before);
  assert.equal(state.schemaVersion, 3);
  assert.ok(Object.isFrozen(records));
  assert.ok(Object.isFrozen(note));
  assert.ok(Object.isFrozen(note.tags));
  assert.ok(Object.isFrozen(note.details));
  assert.notEqual(note.tags, state.notes[0].tags);
  assert.notEqual(note.details.relatedTaskIds, state.notes[0].context.relatedTaskIds);
  assert.throws(function () { note.title = "changed"; }, TypeError);
  assert.equal(state.notes[0].title, "Local First");
});

test("does not read or write localStorage and does not request the network", function () {
  const storageData = { "personal-ai-os.v2-alpha": JSON.stringify(fixtureState()) };
  const storageBefore = JSON.stringify(storageData);
  let storageReads = 0;
  let storageWrites = 0;
  let networkRequests = 0;

  global.localStorage = {
    getItem: function (key) { storageReads += 1; return storageData[key] || null; },
    setItem: function (key, value) { storageWrites += 1; storageData[key] = String(value); }
  };
  global.fetch = function () { networkRequests += 1; throw new Error("Network access is forbidden in memory.js"); };

  delete require.cache[require.resolve(memoryPath)];
  const memory = require(memoryPath);
  const state = fixtureState();
  memory.buildMemoryRecords(state);
  memory.createDataBackup(state, "2026-08-12T03:04:05.000Z");

  assert.equal(storageReads, 0);
  assert.equal(storageWrites, 0);
  assert.equal(networkRequests, 0);
  assert.equal(JSON.stringify(storageData), storageBefore);
});

test("contains no storage, network, or AI integration dependency", function () {
  const source = fs.readFileSync(memoryPath, "utf8");

  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /PersonalAIStorage|OpenAI|Anthropic|Gemini/);
});

test("handles missing collections without changing the provided object", function () {
  const memory = require(memoryPath);
  const state = { schemaVersion: 3 };

  assert.deepEqual(memory.buildMemoryRecords(state), []);
  assert.deepEqual(state, { schemaVersion: 3 });
});
