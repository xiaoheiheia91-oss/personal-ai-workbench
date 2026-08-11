(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.PersonalAIMemory = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
  "use strict";

  const RECORD_TYPES = Object.freeze(["goal", "capture", "task", "note", "decision", "review"]);

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asText(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function asNullableText(value) {
    const text = asText(value).trim();
    return text || null;
  }

  function normalizeTags(value) {
    return Object.freeze(asArray(value).map(function (tag) {
      return asText(tag).trim();
    }).filter(Boolean));
  }

  function summarize(value) {
    const text = asText(value).trim().replace(/\s+/g, " ");
    return text.length > 120 ? text.slice(0, 117) + "..." : text;
  }

  function freezeDetails(value) {
    const details = {};
    Object.keys(value || {}).forEach(function (key) {
      const item = value[key];
      details[key] = Array.isArray(item) ? Object.freeze(item.slice()) : item;
    });
    return Object.freeze(details);
  }

  function createRecord(values) {
    const content = asText(values.content).trim();
    const createdAt = asNullableText(values.createdAt);
    const updatedAt = asNullableText(values.updatedAt) || createdAt;
    const occurredAt = asNullableText(values.occurredAt) || updatedAt || createdAt;

    return Object.freeze({
      id: asText(values.id),
      type: values.type,
      title: asText(values.title).trim() || "未命名记录",
      content: content,
      summary: summarize(content),
      status: asNullableText(values.status),
      tags: normalizeTags(values.tags),
      source: asNullableText(values.source),
      relatedGoal: asNullableText(values.relatedGoal),
      relatedProject: asNullableText(values.relatedProject),
      sourceCaptureId: asNullableText(values.sourceCaptureId),
      occurredAt: occurredAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      sortAt: occurredAt,
      details: freezeDetails(values.details)
    });
  }

  function recordId(type, item, index) {
    return asText(item && item.id).trim() || type + "-source-index-" + index;
  }

  function projectGoal(goal, index) {
    return createRecord({
      id: recordId("goal", goal, index),
      type: "goal",
      title: goal.title,
      content: goal.title,
      status: "active",
      source: "local",
      details: { progress: typeof goal.progress === "number" ? goal.progress : 0 }
    });
  }

  function projectCapture(capture, index) {
    return createRecord({
      id: recordId("capture", capture, index),
      type: "capture",
      title: summarize(capture.content) || "未命名捕获",
      content: capture.content,
      status: capture.status,
      source: capture.source,
      relatedGoal: capture.relatedGoal,
      relatedProject: capture.relatedProject,
      occurredAt: capture.createdAt,
      createdAt: capture.createdAt,
      updatedAt: capture.updatedAt || capture.createdAt,
      details: {
        category: asNullableText(capture.category),
        convertedTaskId: capture.context && capture.context.convertedTaskId || null,
        convertedNoteId: capture.context && capture.context.convertedNoteId || null
      }
    });
  }

  function projectTask(task, index) {
    return createRecord({
      id: recordId("task", task, index),
      type: "task",
      title: task.title,
      content: task.title,
      status: task.status,
      source: task.sourceCaptureId ? "capture" : "local",
      relatedGoal: task.context && task.context.relatedGoal,
      relatedProject: task.context && task.context.relatedProject,
      sourceCaptureId: task.sourceCaptureId,
      occurredAt: task.completedAt || task.updatedAt || task.createdAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      details: {
        priority: asNullableText(task.priority),
        dueDate: asNullableText(task.dueDate),
        completedAt: asNullableText(task.completedAt),
        today: task.today === true,
        todayDate: asNullableText(task.todayDate)
      }
    });
  }

  function projectNote(note, index) {
    return createRecord({
      id: recordId("note", note, index),
      type: "note",
      title: note.title,
      content: note.content,
      status: note.status,
      tags: note.tags,
      source: note.context && note.context.source || (note.sourceCaptureId ? "capture" : "local"),
      relatedGoal: note.relatedGoal,
      relatedProject: note.relatedProject,
      sourceCaptureId: note.sourceCaptureId,
      occurredAt: note.updatedAt || note.createdAt,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      details: {
        relatedTaskIds: note.context && asArray(note.context.relatedTaskIds),
        relatedDecisionIds: note.context && asArray(note.context.relatedDecisionIds)
      }
    });
  }

  function projectDecision(decision, index) {
    const context = decision.context || {};
    const parts = [decision.problem, decision.choice, decision.reason, decision.risk, decision.result].map(asText).filter(Boolean);
    return createRecord({
      id: recordId("decision", decision, index),
      type: "decision",
      title: decision.problem,
      content: parts.join("\n"),
      status: decision.result || context.reviewedAt ? "reviewed" : "open",
      source: "local",
      relatedGoal: context.relatedGoal,
      relatedProject: context.relatedProject,
      occurredAt: context.reviewedAt || context.createdAt,
      createdAt: context.createdAt,
      updatedAt: context.reviewedAt || context.createdAt,
      details: {
        choice: asText(decision.choice),
        reason: asText(decision.reason),
        risk: asText(decision.risk),
        result: decision.result === undefined ? null : decision.result,
        reviewedAt: asNullableText(context.reviewedAt)
      }
    });
  }

  function projectReview(review, index) {
    const date = asNullableText(review.date);
    return createRecord({
      id: recordId("review", review, index),
      type: "review",
      title: date ? "每日回顾 " + date : "每日回顾",
      content: review.tomorrowGoal,
      status: "saved",
      source: "local",
      occurredAt: review.updatedAt || review.createdAt || date,
      createdAt: review.createdAt || date,
      updatedAt: review.updatedAt || review.createdAt || date,
      details: { date: date, tomorrowGoal: asText(review.tomorrowGoal) }
    });
  }

  function sortTime(value) {
    const time = Date.parse(value || "");
    return Number.isNaN(time) ? 0 : time;
  }

  function compareRecords(left, right) {
    const leftTime = sortTime(left.sortAt);
    const rightTime = sortTime(right.sortAt);
    if (!leftTime && rightTime) return 1;
    if (leftTime && !rightTime) return -1;
    const timeDifference = rightTime - leftTime;
    if (timeDifference) return timeDifference;
    const typeDifference = left.type.localeCompare(right.type);
    return typeDifference || left.id.localeCompare(right.id);
  }

  function searchableText(record) {
    const detailValues = Object.keys(record.details || {}).map(function (key) {
      const value = record.details[key];
      return Array.isArray(value) ? value.join(" ") : asText(value);
    });
    return [
      record.type,
      record.title,
      record.content,
      record.status,
      record.source,
      record.relatedGoal,
      record.relatedProject,
      record.sourceCaptureId,
      record.tags.join(" ")
    ].concat(detailValues).join(" ").toLocaleLowerCase();
  }

  function queryMemoryRecords(records, options) {
    const values = options || {};
    const type = RECORD_TYPES.includes(values.type) ? values.type : null;
    const terms = asText(values.query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const order = values.order === "oldest" ? "oldest" : "newest";
    const result = asArray(records).filter(function (record) {
      if (!record || (type && record.type !== type)) return false;
      if (!terms.length) return true;
      const text = searchableText(record);
      return terms.every(function (term) { return text.includes(term); });
    }).slice().sort(compareRecords);

    if (order === "oldest") {
      const dated = result.filter(function (record) { return sortTime(record.sortAt); }).reverse();
      const undated = result.filter(function (record) { return !sortTime(record.sortAt); });
      return Object.freeze(dated.concat(undated));
    }
    return Object.freeze(result);
  }

  function buildMemoryRecords(state) {
    const value = state && typeof state === "object" ? state : {};
    const records = [];

    asArray(value.goals).forEach(function (item, index) { records.push(projectGoal(item, index)); });
    asArray(value.captures).forEach(function (item, index) { records.push(projectCapture(item, index)); });
    asArray(value.tasks).forEach(function (item, index) { records.push(projectTask(item, index)); });
    asArray(value.notes).forEach(function (item, index) { records.push(projectNote(item, index)); });
    asArray(value.decisions).forEach(function (item, index) { records.push(projectDecision(item, index)); });
    asArray(value.dailyReviews).forEach(function (item, index) { records.push(projectReview(item, index)); });

    return Object.freeze(records.sort(compareRecords));
  }

  return Object.freeze({
    RECORD_TYPES: RECORD_TYPES,
    buildMemoryRecords: buildMemoryRecords,
    queryMemoryRecords: queryMemoryRecords
  });
});
