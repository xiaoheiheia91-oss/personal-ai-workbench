(function () {
  const STORAGE_KEY = "personal-ai-os.v2-alpha";
  const SCHEMA_VERSION = 1;
  const CAPTURE_SOURCES = ["manual", "voice", "web_clip", "ai", "import"];
  const CAPTURE_CATEGORIES = ["idea", "task", "note", "decision", "uncategorized"];
  const TASK_PRIORITIES = ["high", "medium", "low"];

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + window.crypto.randomUUID();
    }
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function now() {
    return new Date().toISOString();
  }

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      goals: [],
      captures: [],
      tasks: [],
      notes: [],
      decisions: []
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
    ["goals", "captures", "tasks", "notes", "decisions"].forEach(function (key) {
      if (!Array.isArray(state[key])) state[key] = [];
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
      return normalizeState(JSON.parse(raw));
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
      completedAt: null,
      dueDate: (options && options.dueDate) || null,
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
    const state = getState();
    const task = state.tasks.find(function (item) { return item.id === taskId; });
    if (!task) throw new Error("未找到该任务。");

    task.status = "completed";
    task.completedAt = now();
    saveState(state);
    return task;
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
    createNote: createNote,
    createDecision: createDecision
  };
})();
