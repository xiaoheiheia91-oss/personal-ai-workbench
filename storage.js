(function () {
  const STORAGE_KEY = "personal-ai-os.v2-alpha";
  const SCHEMA_VERSION = 3;
  const CAPTURE_SOURCES = ["manual", "voice", "web_clip", "ai", "import"];
  const CAPTURE_CATEGORIES = ["idea", "task", "note", "decision", "uncategorized"];
  const TASK_PRIORITIES = ["high", "medium", "low"];
  const TASK_STATUSES = ["todo", "in_progress", "completed", "cancelled"];
  const DATA_COLLECTIONS = ["goals", "captures", "tasks", "notes", "decisions", "dailyReviews"];

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

  function normalizeTags(value) {
    const values = Array.isArray(value) ? value : String(value || "").split(",");
    return values.map(function (tag) { return String(tag).trim(); }).filter(Boolean).filter(function (tag, index, list) {
      return list.indexOf(tag) === index;
    });
  }

  function noteTitle(content) {
    return String(content || "").trim().slice(0, 30) || "未命名笔记";
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
        title: noteTitle(content),
        content: String(content),
        tags: [],
        status: "active",
        sourceCaptureId: null,
        relatedGoal: null,
        relatedProject: null,
        createdAt: migrationTime,
        updatedAt: migrationTime,
        context: {
          sourceCaptureId: null,
          relatedTaskIds: [],
          relatedDecisionIds: [],
          source: "import"
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
      capture.context = capture.context || { convertedTaskId: null, convertedNoteId: null };
      if (!Object.prototype.hasOwnProperty.call(capture.context, "convertedNoteId")) capture.context.convertedNoteId = null;
    });
    state.notes = state.notes.map(function (note) {
      const content = String(note.content || "");
      note.id = note.id || createId("note-");
      note.title = String(note.title || noteTitle(content));
      note.content = content;
      note.tags = normalizeTags(note.tags);
      note.status = note.status === "archived" ? "archived" : "active";
      note.sourceCaptureId = note.sourceCaptureId || (note.context && note.context.sourceCaptureId) || null;
      note.relatedGoal = note.relatedGoal || (note.context && note.context.relatedGoal) || null;
      note.relatedProject = note.relatedProject || (note.context && note.context.relatedProject) || null;
      note.createdAt = note.createdAt || now();
      note.updatedAt = note.updatedAt || note.createdAt;
      note.context = note.context || {};
      note.context.sourceCaptureId = note.sourceCaptureId;
      note.context.relatedTaskIds = Array.isArray(note.context.relatedTaskIds) ? note.context.relatedTaskIds : [];
      note.context.relatedDecisionIds = Array.isArray(note.context.relatedDecisionIds) ? note.context.relatedDecisionIds : [];
      note.context.source = note.context.source || "manual";
      return note;
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

  function getReadOnlyState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacyData();
    try {
      return normalizeState(JSON.parse(raw));
    } catch {
      return migrateLegacyData();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
  }

  function saveTodayGoal(title) {
    const state = getState();
    const value = title.trim();
    const existing = state.goals[0];

    if (!value) throw new Error("今日主线不能为空，已有记录不会被删除。");
    if (existing) {
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
        convertedTaskId: null,
        convertedNoteId: null
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
    capture.context = capture.context || { convertedTaskId: null, convertedNoteId: null };
    if (!Object.prototype.hasOwnProperty.call(capture.context, "convertedNoteId")) capture.context.convertedNoteId = null;

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

  function createNote(input) {
    const values = typeof input === "string" ? { content: input } : (input || {});
    const value = String(values.content || "").trim();
    if (!value) throw new Error("笔记内容不能为空。");
    const state = getState();
    const timestamp = now();
    const note = {
      id: createId("note-"),
      title: String(values.title || noteTitle(value)).trim() || noteTitle(value),
      content: value,
      tags: normalizeTags(values.tags),
      status: "active",
      sourceCaptureId: values.sourceCaptureId || null,
      relatedGoal: values.relatedGoal || null,
      relatedProject: values.relatedProject || null,
      createdAt: timestamp,
      updatedAt: timestamp,
      context: {
        sourceCaptureId: values.sourceCaptureId || null,
        relatedTaskIds: Array.isArray(values.relatedTaskIds) ? values.relatedTaskIds : [],
        relatedDecisionIds: Array.isArray(values.relatedDecisionIds) ? values.relatedDecisionIds : [],
        source: values.source || "manual"
      }
    };
    state.notes.push(note);
    saveState(state);
    return note;
  }

  function updateNote(noteId, input) {
    const state = getState();
    const note = state.notes.find(function (item) { return item.id === noteId; });
    if (!note) throw new Error("未找到该笔记。");
    const values = input || {};
    if (Object.prototype.hasOwnProperty.call(values, "title")) note.title = String(values.title || "").trim() || noteTitle(note.content);
    if (Object.prototype.hasOwnProperty.call(values, "content")) {
      note.content = String(values.content || "").trim();
      if (!note.content) throw new Error("笔记内容不能为空。");
    }
    if (Object.prototype.hasOwnProperty.call(values, "tags")) note.tags = normalizeTags(values.tags);
    if (Object.prototype.hasOwnProperty.call(values, "relatedGoal")) note.relatedGoal = values.relatedGoal || null;
    if (Object.prototype.hasOwnProperty.call(values, "relatedProject")) note.relatedProject = values.relatedProject || null;
    if (Object.prototype.hasOwnProperty.call(values, "status")) note.status = values.status === "archived" ? "archived" : "active";
    note.updatedAt = now();
    saveState(state);
    return note;
  }

  function archiveNote(noteId) {
    return updateNote(noteId, { status: "archived" });
  }

  function restoreNote(noteId) {
    return updateNote(noteId, { status: "active" });
  }

  function convertCaptureToNote(captureId, input) {
    const state = getState();
    const capture = state.captures.find(function (item) { return item.id === captureId; });
    if (!capture) throw new Error("未找到该捕获记录。");
    capture.context = capture.context || { convertedTaskId: null, convertedNoteId: null };
    if (capture.context.convertedNoteId) throw new Error("该捕获记录已经转换为笔记。");

    const values = input || {};
    const note = createNote({
      title: values.title || noteTitle(capture.content),
      content: values.content || capture.content,
      tags: values.tags,
      sourceCaptureId: capture.id,
      relatedGoal: values.relatedGoal || capture.relatedGoal,
      relatedProject: values.relatedProject || capture.relatedProject,
      source: "capture"
    });
    const updatedState = getState();
    const updatedCapture = updatedState.captures.find(function (item) { return item.id === captureId; });
    updatedCapture.status = "converted";
    updatedCapture.context = updatedCapture.context || {};
    updatedCapture.context.convertedNoteId = note.id;
    saveState(updatedState);
    return note;
  }

  function archiveCapture(captureId) {
    const state = getState();
    const capture = state.captures.find(function (item) { return item.id === captureId; });
    if (!capture) throw new Error("未找到该捕获记录。");
    capture.status = "archived";
    saveState(state);
    return capture;
  }

  function projectTask(task) {
    return task ? {
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      today: task.today === true,
      todayDate: task.todayDate || null,
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
      sourceCaptureId: task.sourceCaptureId || null
    } : null;
  }

  function projectNote(note) {
    return note ? {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags.slice(),
      status: note.status,
      sourceCaptureId: note.sourceCaptureId || null,
      relatedGoal: note.relatedGoal || null,
      relatedProject: note.relatedProject || null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    } : null;
  }

  function projectCapture(capture) {
    return capture ? {
      id: capture.id,
      content: capture.content,
      category: capture.category,
      status: capture.status,
      source: capture.source,
      relatedGoal: capture.relatedGoal || null,
      relatedProject: capture.relatedProject || null,
      createdAt: capture.createdAt
    } : null;
  }

  function projectDecision(decision) {
    return decision ? {
      id: decision.id,
      problem: decision.problem,
      choice: decision.choice,
      reason: decision.reason,
      risk: decision.risk,
      result: decision.result
    } : null;
  }

  function projectReview(review) {
    return review ? {
      id: review.id,
      date: review.date,
      tomorrowGoal: review.tomorrowGoal,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    } : null;
  }

  function getAIContext(options) {
    const state = getReadOnlyState();
    const values = options || {};
    const scope = values.scope || "dashboard";
    const dateKey = isDateKey(values.date) ? values.date : getLocalDate();
    const activeTasks = state.tasks.filter(function (task) { return task.status === "todo" || task.status === "in_progress"; });
    const todayTasks = activeTasks.filter(function (task) { return task.today === true && task.todayDate === dateKey; });
    const completedToday = state.tasks.filter(function (task) { return task.completedAt && getLocalDate(new Date(task.completedAt)) === dateKey; });
    const capturesToday = state.captures.filter(function (capture) { return capture.createdAt && getLocalDate(new Date(capture.createdAt)) === dateKey; });
    const recentNotes = state.notes.filter(function (note) { return note.status !== "archived"; }).sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); }).slice(0, 10);
    const base = { schemaVersion: SCHEMA_VERSION, generatedAt: now(), scope: scope };

    if (scope === "today") return Object.assign(base, { date: dateKey, goal: state.goals[0] ? { id: state.goals[0].id, title: state.goals[0].title, progress: state.goals[0].progress } : null, todayTasks: todayTasks.map(projectTask), completedToday: completedToday.map(projectTask), capturesToday: capturesToday.map(projectCapture), dailyReview: projectReview(state.dailyReviews.find(function (review) { return review.date === dateKey; })) });
    if (scope === "capture") {
      const capture = state.captures.find(function (item) { return item.id === values.captureId; });
      return Object.assign(base, { capture: projectCapture(capture), sourceTask: capture ? projectTask(state.tasks.find(function (task) { return task.sourceCaptureId === capture.id; })) : null, sourceNote: capture ? projectNote(state.notes.find(function (note) { return note.sourceCaptureId === capture.id; })) : null });
    }
    if (scope === "task") {
      const task = state.tasks.find(function (item) { return item.id === values.taskId; });
      return Object.assign(base, { task: projectTask(task), sourceCapture: task ? projectCapture(state.captures.find(function (capture) { return capture.id === task.sourceCaptureId; })) : null });
    }
    if (scope === "note") {
      const note = state.notes.find(function (item) { return item.id === values.noteId; });
      return Object.assign(base, { note: projectNote(note) });
    }
    if (scope === "decision") {
      const decision = state.decisions.find(function (item) { return item.id === values.decisionId; });
      return Object.assign(base, { decision: projectDecision(decision) });
    }
    if (scope === "review") return Object.assign(base, { date: dateKey, dailyReview: projectReview(state.dailyReviews.find(function (review) { return review.date === dateKey; })), completedToday: completedToday.map(projectTask), todayTasks: todayTasks.map(projectTask), capturesToday: capturesToday.map(projectCapture) });
    if (scope === "all") return Object.assign(base, { goals: state.goals.map(function (goal) { return { id: goal.id, title: goal.title, progress: goal.progress }; }), captures: state.captures.map(projectCapture), tasks: state.tasks.map(projectTask), notes: state.notes.map(projectNote), decisions: state.decisions.map(projectDecision), dailyReviews: state.dailyReviews.map(projectReview) });
    return Object.assign(base, { goals: state.goals.map(function (goal) { return { id: goal.id, title: goal.title, progress: goal.progress }; }), todayTasks: todayTasks.map(projectTask), pendingTasks: activeTasks.filter(function (task) { return !todayTasks.includes(task); }).map(projectTask), recentCaptures: state.captures.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 10).map(projectCapture), recentNotes: recentNotes.map(projectNote), decisions: state.decisions.slice().sort(function (a, b) { return (b.context && b.context.createdAt || "").localeCompare(a.context && a.context.createdAt || ""); }).slice(0, 10).map(projectDecision) });
  }

  function validateRestoreData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data) || data.schemaVersion !== SCHEMA_VERSION) {
      throw new Error("只能恢复完整的 Schema v3 数据。");
    }
    DATA_COLLECTIONS.forEach(function (key) {
      if (!Array.isArray(data[key])) throw new Error("数据集合缺失或格式无效：" + key);
    });
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      throw new Error("恢复数据无法安全复制。");
    }
  }

  function hasRecords(state) {
    return DATA_COLLECTIONS.some(function (key) {
      if (!Array.isArray(state[key])) throw new Error("当前数据空间结构异常，已拒绝覆盖。");
      return state[key].length > 0;
    });
  }

  function hasLegacyRecords() {
    if ((localStorage.getItem("goal") || "").trim()) return true;
    return ["notes", "decisions"].some(function (key) {
      const raw = localStorage.getItem(key);
      if (raw === null || !raw.trim()) return false;
      try {
        const values = JSON.parse(raw);
        return !Array.isArray(values) || values.length > 0;
      } catch (error) {
        return true;
      }
    });
  }

  function restoreDataBackup(data) {
    const restored = validateRestoreData(data);
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      let current;
      try {
        current = JSON.parse(raw);
      } catch (error) {
        throw new Error("当前数据无法读取，已拒绝覆盖。");
      }
      if (!current || typeof current !== "object" || Array.isArray(current) || hasRecords(current)) {
        throw new Error("当前数据空间不是空的，不能覆盖或自动合并。");
      }
    } else if (hasLegacyRecords()) {
      throw new Error("当前数据空间不是空的，不能覆盖或自动合并。");
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    return restored;
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
    updateNote: updateNote,
    archiveNote: archiveNote,
    restoreNote: restoreNote,
    convertCaptureToNote: convertCaptureToNote,
    archiveCapture: archiveCapture,
    restoreDataBackup: restoreDataBackup,
    getAIContext: getAIContext,
    createDecision: createDecision
  };
})();
