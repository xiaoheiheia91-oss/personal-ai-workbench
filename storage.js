(function () {
  const STORAGE_KEY = "personal-ai-os.v2-alpha";
  const SCHEMA_VERSION = 2;
  const CAPTURE_SOURCES = ["manual", "voice", "web_clip", "ai", "import"];
  const CAPTURE_CATEGORIES = ["idea", "task", "note", "decision", "uncategorized"];
  const TASK_PRIORITIES = ["high", "medium", "low"];
  const TASK_STATUSES = ["todo", "in_progress", "completed", "cancelled"];

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + window.crypto.randomUUID();
    }
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function now() {
    return new Date().toISOString();
  }

  function getLocalDate(date) {
    const value = date || new Date();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return value.getFullYear() + "-" + month + "-" + day;
  }

  function isDateKey(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      goals: [],
      captures: [],
      tasks: [],
      notes: [],
      decisions: [],
      dailyReviews: []
    };
  }

  function readLegacyArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function migrateLegacyData() {
    const state = emptyState();
    const legacyGoal = (localStorage.getItem("goal") || "").trim();
    const migrationTime = now();

    if (legacyGoal) {
      state.goals.push({
        id: createId("goal-"),
        title: legacyGoal,
        progress: 0
      });
    }

    state.notes = readLegacyArray("notes").map(function (content) {
      return {
        id: createId("note-"),
        content: String(content),
        tags: [],
        createdAt: migrationTime,
        context: {
          sourceCaptureId: null,
          relatedGoal: null,
          relatedProject: null
        }
      };
    });

    state.decisions = readLegacyArray("decisions").map(function (problem) {
      return {
        id: createId("decision-"),
        problem: String(problem),
        choice: "",
        reason: "",
        risk: "",
        result: null,
        context: {
          relatedGoal: null,
          relatedProject: null,
          createdAt: migrationTime,
          reviewedAt: null
        }
      };
    });

    return state;
  }

  function normalizeState(value) {
    const state = value && typeof value === "object" ? value : emptyState();
    state.schemaVersion = SCHEMA_VERSION;
    ["goals", "captures", "tasks", "notes", "decisions", "dailyReviews"].forEach(function (key) {
      if (!Array.isArray(state[key])) state[key] = [];
    });
    state.tasks.forEach(function (task) {
      task.priority = TASK_PRIORITIES.includes(task.priority) ? task.priority : "medium";
      task.status = TASK_STATUSES.includes(task.status) ? task.status : "todo";
      task.createdAt = task.createdAt || now();
      task.updatedAt = task.updatedAt || task.createdAt;
      task.completedAt = task.status === "completed" ? (task.completedAt || task.updatedAt) : null;
      task.dueDate = isDateKey(task.dueDate) ? task.dueDate : null;
      task.today = task.today === true;
      task.todayDate = task.today && isDateKey(task.todayDate) ? task.todayDate : null;
      if (!task.todayDate) task.today = false;
      task.sourceCaptureId = task.sourceCaptureId || null;
      task.context = task.context || { relatedGoal: null, relatedProject: null };
    });
    state.captures.forEach(function (capture) {
      capture.category = CAPTURE_CATEGORIES.includes(capture.category) ? capture.category : "uncategorized";
      capture.status = ["inbox", "converted", "archived"].includes(capture.status) ? capture.status : "inbox";
      capture.source = CAPTURE_SOURCES.includes(capture.source) ? capture.source : "manual";
      capture.createdAt = capture.createdAt || now();
      capture.relatedGoal = capture.relatedGoal || null;
      capture.relatedProject = capture.relatedProject || null;
      capture.context = capture.context || { convertedTaskId: null };
    });
    state.goals.forEach(function (goal) {
      goal.progress = typeof goal.progress === "number" ? goal.progress : 0;
    });
    return state;
  }

  function getState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateLegacyData();
      saveState(migrated);
      return migrated;
    }

    try {
      const parsed = JSON.parse(raw);
      const storedVersion = parsed.schemaVersion;
      const normalized = normalizeState(parsed);
      if (storedVersion !== SCHEMA_VERSION) saveState(normalized);
      return normalized;
    } catch {
      const recovered = migrateLegacyData();
      saveState(recovered);
      return recovered;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
  }

  function saveTodayGoal(title) {
    const state = getState();
    const value = title.trim();
    const existing = state.goals[0];

    if (!value) {
      state.goals = [];
    } else if (existing) {
      existing.title = value;
    } else {
      state.goals.push({ id: createId("goal-"), title: value, progress: 0 });
    }

    saveState(state);
    return state.goals[0] || null;
  }

  function createCapture(input) {
    const content = String(input.content || "").trim();
    if (!content) throw new Error("请先输入想法。");

    const state = getState();
    const capture = {
      id: createId("capture-"),
      content: content,
      createdAt: now(),
      category: CAPTURE_CATEGORIES.includes(input.category) ? input.category : "uncategorized",
      status: "inbox",
      relatedGoal: input.relatedGoal || (state.goals[0] && state.goals[0].id) || null,
      relatedProject: input.relatedProject || null,
      source: CAPTURE_SOURCES.includes(input.source) ? input.source : "manual",
      context: {
        convertedTaskId: null
      }
    };

    state.captures.push(capture);
    saveState(state);
    return capture;
  }

  function convertCaptureToTask(captureId, options) {
    const state = getState();
    const capture = state.captures.find(function (item) { return item.id === captureId; });
    if (!capture) throw new Error("未找到该捕获记录。");
    if (capture.status === "converted") throw new Error("该捕获记录已经转换为任务。");
    capture.context = capture.context || { convertedTaskId: null };

    const task = {
      id: createId("task-"),
      title: String((options && options.title) || capture.content).trim(),
      priority: TASK_PRIORITIES.includes(options && options.priority) ? options.priority : "medium",
      status: "todo",
      createdAt: now(),
      updatedAt: now(),
      completedAt: null,
      dueDate: isDateKey(options && options.dueDate) ? options.dueDate : null,
      today: Boolean(options && options.today),
      todayDate: options && options.today ? getLocalDate() : null,
      sourceCaptureId: capture.id,
      context: {
        relatedGoal: capture.relatedGoal || null,
        relatedProject: capture.relatedProject || null
      }
    };

    if (!task.title) throw new Error("任务标题不能为空。");
    capture.status = "converted";
    capture.context.convertedTaskId = task.id;
    state.tasks.push(task);
    saveState(state);
    return task;
  }

  function completeTask(taskId) {
    return updateTask(taskId, { status: "completed" });
  }

  function updateTask(taskId, input) {
    const state = getState();
    const task = state.tasks.find(function (item) { return item.id === taskId; });
    if (!task) throw new Error("未找到该任务。");

    if (Object.prototype.hasOwnProperty.call(input, "title")) {
      const title = String(input.title || "").trim();
      if (!title) throw new Error("任务标题不能为空。");
      task.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(input, "priority")) {
      task.priority = TASK_PRIORITIES.includes(input.priority) ? input.priority : "medium";
    }
    if (Object.prototype.hasOwnProperty.call(input, "dueDate")) {
      task.dueDate = isDateKey(input.dueDate) ? input.dueDate : null;
    }
    if (Object.prototype.hasOwnProperty.call(input, "today")) {
      task.today = input.today === true;
      task.todayDate = task.today ? getLocalDate() : null;
    }
    if (Object.prototype.hasOwnProperty.call(input, "status")) {
      task.status = TASK_STATUSES.includes(input.status) ? input.status : "todo";
      task.completedAt = task.status === "completed" ? (task.completedAt || now()) : null;
    }
    task.updatedAt = now();
    saveState(state);
    return task;
  }

  function getDailyReview(date) {
    const dateKey = isDateKey(date) ? date : getLocalDate();
    const state = getState();
    return state.dailyReviews.find(function (review) { return review.date === dateKey; }) || null;
  }

  function saveDailyReview(input) {
    const state = getState();
    const date = isDateKey(input && input.date) ? input.date : getLocalDate();
    const tomorrowGoal = String((input && input.tomorrowGoal) || "").trim();
    const existing = state.dailyReviews.find(function (review) { return review.date === date; });

    if (existing) {
      existing.tomorrowGoal = tomorrowGoal;
      existing.updatedAt = now();
      saveState(state);
      return existing;
    }

    const review = {
      id: createId("review-"),
      date: date,
      tomorrowGoal: tomorrowGoal,
      createdAt: now(),
      updatedAt: now()
    };
    state.dailyReviews.push(review);
    saveState(state);
    return review;
  }

  function createNote(content) {
    const value = String(content || "").trim();
    if (!value) throw new Error("笔记内容不能为空。");
    const state = getState();
    state.notes.push({
      id: createId("note-"),
      content: value,
      tags: [],
      createdAt: now(),
      context: { sourceCaptureId: null, relatedGoal: null, relatedProject: null }
    });
    saveState(state);
  }

  function createDecision(problem) {
    const value = String(problem || "").trim();
    if (!value) throw new Error("决策事项不能为空。");
    const state = getState();
    state.decisions.push({
      id: createId("decision-"),
      problem: value,
      choice: "",
      reason: "",
      risk: "",
      result: null,
      context: { relatedGoal: null, relatedProject: null, createdAt: now(), reviewedAt: null }
    });
    saveState(state);
  }

  window.PersonalAIStorage = {
    getState: getState,
    saveTodayGoal: saveTodayGoal,
    createCapture: createCapture,
    convertCaptureToTask: convertCaptureToTask,
    completeTask: completeTask,
    updateTask: updateTask,
    getDailyReview: getDailyReview,
    saveDailyReview: saveDailyReview,
    getLocalDate: getLocalDate,
    createNote: createNote,
    createDecision: createDecision
  };
})();
