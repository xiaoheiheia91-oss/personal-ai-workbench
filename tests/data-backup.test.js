"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const memory = require(path.join(__dirname, "..", "memory.js"));

function backupState() {
  return {
    schemaVersion: 3,
    goals: [{ id: "goal-1", title: "Local First", progress: 50 }],
    captures: [{ id: "capture-1", content: "完整捕获", status: "converted", extraField: "preserved" }],
    tasks: [{ id: "task-1", title: "完整任务", status: "completed" }],
    notes: [{ id: "note-1", title: "完整笔记", content: "正文", tags: ["backup"], status: "archived" }],
    decisions: [{ id: "decision-1", problem: "是否备份", choice: "是" }],
    dailyReviews: [{ id: "review-1", date: "2026-08-12", tomorrowGoal: "继续验证" }],
    preservedRootField: { source: "future-compatible", values: [1, 2, 3] }
  };
}

test("exports parseable JSON with complete detached Schema v3 data", function () {
  const state = backupState();
  const before = JSON.stringify(state);
  const backup = memory.createDataBackup(state, "2026-08-12T03:04:05.000Z");
  const parsed = JSON.parse(memory.serializeDataBackup(backup));

  assert.equal(parsed.exportFormatVersion, 1);
  assert.equal(parsed.appVersion, "alpha-3.5");
  assert.equal(parsed.schemaVersion, 3);
  assert.equal(parsed.exportedAt, "2026-08-12T03:04:05.000Z");
  assert.deepEqual(parsed.data, state);
  assert.deepEqual(parsed.data.preservedRootField, state.preservedRootField);
  assert.equal(JSON.stringify(state), before);
  assert.notEqual(backup.data.notes, state.notes);
  assert.notEqual(backup.data.preservedRootField, state.preservedRootField);
  assert.ok(Object.isFrozen(backup));
  assert.ok(Object.isFrozen(backup.data));
});

test("exposes version metadata, statistics, and raw data for future readers", function () {
  const serialized = memory.serializeDataBackup(memory.createDataBackup(backupState(), "2026-08-12T03:04:05.000Z"));
  const futureReader = JSON.parse(serialized);

  assert.equal(futureReader.exportFormatVersion, 1);
  assert.equal(futureReader.appVersion, "alpha-3.5");
  assert.equal(futureReader.schemaVersion, futureReader.data.schemaVersion);
  assert.equal(futureReader.recordCounts.total, 6);
  memory.DATA_COLLECTIONS.forEach(function (key) {
    assert.ok(Array.isArray(futureReader.data[key]), key);
  });
  assert.match(serialized, /\n  "exportFormatVersion"/);
});

test("counts every required Schema v3 collection before export", function () {
  const counts = memory.countDataRecords(backupState());

  assert.deepEqual(counts, {
    goals: 1,
    captures: 1,
    tasks: 1,
    notes: 1,
    decisions: 1,
    dailyReviews: 1,
    total: 6
  });
});

test("creates a timestamped JSON filename", function () {
  assert.equal(memory.dataBackupFilename("2026-08-12T03:04:05.000Z"), "personal-ai-os-backup-20260812-030405.json");
});

test("rejects incomplete or non-v3 backups", function () {
  assert.throws(function () { memory.createDataBackup({ schemaVersion: 2 }); }, /Schema v3/);
  assert.throws(function () { memory.createDataBackup({ schemaVersion: 3 }); }, /goals/);
});
