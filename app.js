document.addEventListener("DOMContentLoaded", function () {
  const storage = window.PersonalAIStorage;
  const memory = window.PersonalAIMemory;
  const elements = {
    goalForm: document.getElementById("goal-form"),
    goal: document.getElementById("goal"),
    goalStatus: document.getElementById("goal-status"),
    captureForm: document.getElementById("capture-form"),
    captureContent: document.getElementById("capture-content"),
    captureCategory: document.getElementById("capture-category"),
    captureSource: document.getElementById("capture-source"),
    captureStatus: document.getElementById("capture-status"),
    captures: document.getElementById("captures"),
    dashboardTodayTasks: document.getElementById("today-tasks"),
    todayTasks: document.getElementById("today-tasks-list"),
    pendingTasks: document.getElementById("pending-tasks"),
    completedTasks: document.getElementById("completed-tasks"),
    recentRecords: document.getElementById("recent-records"),
    dashboardNotes: document.getElementById("dashboard-notes"),
    todoCount: document.getElementById("todo-count"),
    completedCount: document.getElementById("completed-count"),
    captureCount: document.getElementById("capture-count"),
    noteCount: document.getElementById("note-count"),
    todayDate: document.getElementById("today-date"),
    reviewCompleted: document.getElementById("review-completed"),
    reviewIncomplete: document.getElementById("review-incomplete"),
    reviewCaptures: document.getElementById("review-captures"),
    reviewForm: document.getElementById("review-form"),
    tomorrowGoal: document.getElementById("tomorrow-goal"),
    reviewStatus: document.getElementById("review-status"),
    taskDialog: document.getElementById("task-dialog"),
    taskForm: document.getElementById("task-form"),
    taskId: document.getElementById("task-id"),
    taskTitle: document.getElementById("task-title-input"),
    taskPriority: document.getElementById("task-priority"),
    taskDueDate: document.getElementById("task-due-date"),
    taskStatus: document.getElementById("task-status"),
    taskToday: document.getElementById("task-today"),
    taskEditorStatus: document.getElementById("task-editor-status"),
    conversionDialog: document.getElementById("conversion-dialog"),
    conversionForm: document.getElementById("conversion-form"),
    conversionCaptureId: document.getElementById("conversion-capture-id"),
    conversionTitle: document.getElementById("conversion-title"),
    conversionPriority: document.getElementById("conversion-priority"),
    conversionDueDate: document.getElementById("conversion-due-date"),
    conversionToday: document.getElementById("conversion-today"),
    conversionStatus: document.getElementById("conversion-status"),
    noteConversionDialog: document.getElementById("note-conversion-dialog"),
    noteConversionForm: document.getElementById("note-conversion-form"),
    noteConversionCaptureId: document.getElementById("note-conversion-capture-id"),
    noteConversionTitle: document.getElementById("note-conversion-title"),
    noteConversionContent: document.getElementById("note-conversion-content"),
    noteConversionTags: document.getElementById("note-conversion-tags"),
    noteConversionGoal: document.getElementById("note-conversion-goal"),
    noteConversionProject: document.getElementById("note-conversion-project"),
    noteConversionStatus: document.getElementById("note-conversion-status"),
    advisorButton: document.getElementById("advisor-button"),
    reply: document.getElementById("reply"),
    noteSearch: document.getElementById("note-search"),
    noteTagFilter: document.getElementById("note-tag-filter"),
    noteNewButton: document.getElementById("note-new-button"),
    notes: document.getElementById("notes"),
    noteDialog: document.getElementById("note-dialog"),
    noteForm: document.getElementById("note-form"),
    noteId: document.getElementById("note-id"),
    noteTitle: document.getElementById("note-title-input"),
    noteContent: document.getElementById("note-content-input"),
    noteTags: document.getElementById("note-tags-input"),
    noteGoal: document.getElementById("note-goal-input"),
    noteProject: document.getElementById("note-project-input"),
    noteEditorStatus: document.getElementById("note-editor-status"),
    memorySearch: document.getElementById("memory-search"),
    memoryType: document.getElementById("memory-type"),
    memoryOrder: document.getElementById("memory-order"),
    memoryCount: document.getElementById("memory-count"),
    memoryRecords: document.getElementById("memory-records"),
    decisionButton: document.getElementById("decision-button"),
    decision: document.getElementById("decision"),
    decisions: document.getElementById("decisions")
  };

  const todayKey = storage.getLocalDate();
  let currentState = null;

  function setStatus(element, message, isError) {
    element.textContent = message || "";
    element.classList.toggle("error", Boolean(isError));
  }

  function formatDate(value) {
    if (!value) return "未设置";
    return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }

  function formatDueDate(value) {
    if (!value) return "无截止日期";
    return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value + "T00:00:00"));
  }

  function isActiveTask(task) {
    return task.status === "todo" || task.status === "in_progress";
  }

  function isTodayTask(task) {
    return isActiveTask(task) && task.today === true && task.todayDate === todayKey;
  }

  function createdToday(item) {
    return item.createdAt && storage.getLocalDate(new Date(item.createdAt)) === todayKey;
  }

  function completedToday(task) {
    return task.completedAt && storage.getLocalDate(new Date(task.completedAt)) === todayKey;
  }

  function clearChildren(element) {
    element.replaceChildren();
  }

  function emptyState(message) {
    const item = document.createElement("p");
    item.className = "empty-state";
    item.textContent = message;
    return item;
  }

  function taskPriorityLabel(priority) {
    return { high: "高优先级", medium: "中优先级", low: "低优先级" }[priority] || "中优先级";
  }

  function taskStatusLabel(status) {
    return { todo: "待开始", in_progress: "进行中", completed: "已完成", cancelled: "已取消" }[status] || "待开始";
  }

  function captureSourceLabel(source) {
    return { manual: "手动", voice: "语音", web_clip: "网页剪藏", ai: "AI", import: "导入" }[source] || "手动";
  }

  function memoryTypeLabel(type) {
    return { goal: "目标", capture: "捕获", task: "任务", note: "笔记", decision: "决策", review: "复盘" }[type] || "记录";
  }

  function memoryStatusLabel(status) {
    return {
      active: "进行中",
      inbox: "待整理",
      converted: "已转换",
      archived: "已归档",
      todo: "待开始",
      in_progress: "进行中",
      completed: "已完成",
      cancelled: "已取消",
      open: "待决定",
      reviewed: "已复盘",
      saved: "已保存"
    }[status] || status || "状态未记录";
  }

  function createButton(label, onClick, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className || "secondary-button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function createTaskElement(task) {
    const item = document.createElement("article");
    item.className = "record-item task-item" + (task.status === "completed" ? " completed" : "");
    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = task.title;
    body.appendChild(title);
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = taskPriorityLabel(task.priority) + " · " + taskStatusLabel(task.status) + " · " + formatDueDate(task.dueDate);
    body.appendChild(meta);
    item.appendChild(body);
    const actions = document.createElement("div");
    actions.className = "record-actions";
    if (isActiveTask(task)) {
      actions.appendChild(createButton("完成", function () {
        storage.completeTask(task.id);
        render();
      }));
    }
    actions.appendChild(createButton("编辑", function () { openTaskDialog(task); }));
    item.appendChild(actions);
    return item;
  }

  function renderTaskList(element, tasks, emptyMessage) {
    clearChildren(element);
    if (!tasks.length) {
      element.appendChild(emptyState(emptyMessage));
      return;
    }
    tasks.forEach(function (task) { element.appendChild(createTaskElement(task)); });
  }

  function renderCaptures(captures) {
    clearChildren(elements.captures);
    if (!captures.length) {
      elements.captures.appendChild(emptyState("捕获箱为空。把第一个想法记录下来。"));
      return;
    }

    captures.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).forEach(function (capture) {
      const item = document.createElement("article");
      item.className = "record-item";
      const body = document.createElement("div");
      const content = document.createElement("p");
      content.textContent = capture.content;
      body.appendChild(content);
      const meta = document.createElement("p");
      meta.className = "meta";
      const category = { idea: "想法", task: "任务", note: "笔记", decision: "决策", uncategorized: "未分类" }[capture.category] || "未分类";
      meta.textContent = category + " · " + captureSourceLabel(capture.source) + " · " + formatDate(capture.createdAt);
      body.appendChild(meta);
      item.appendChild(body);
      if (capture.status === "inbox") {
        const actions = document.createElement("div");
        actions.className = "record-actions";
        actions.appendChild(createButton("转为任务", function () { openConversionDialog(capture); }));
        actions.appendChild(createButton("转为笔记", function () { openNoteConversionDialog(capture); }));
        actions.appendChild(createButton("归档", function () {
          storage.archiveCapture(capture.id);
          render();
        }));
        item.appendChild(actions);
      } else {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = capture.status === "archived" ? "已归档" : "已转换";
        item.appendChild(badge);
      }
      elements.captures.appendChild(item);
    });
  }

  function addGoalOptions(select, selectedGoal) {
    clearChildren(select);
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "不关联目标";
    select.appendChild(emptyOption);
    storage.getState().goals.forEach(function (goal) {
      const option = document.createElement("option");
      option.value = goal.id;
      option.textContent = goal.title;
      option.selected = goal.id === selectedGoal;
      select.appendChild(option);
    });
  }

  function appendTagList(element, tags) {
    if (!tags.length) return;
    const list = document.createElement("div");
    list.className = "tag-list";
    tags.forEach(function (tag) {
      const badge = document.createElement("span");
      badge.className = "tag";
      badge.textContent = tag;
      list.appendChild(badge);
    });
    element.appendChild(list);
  }

  function openNoteDialog(note) {
    const current = note || {};
    elements.noteId.value = current.id || "";
    elements.noteTitle.value = current.title || "";
    elements.noteContent.value = current.content || "";
    elements.noteTags.value = current.tags ? current.tags.join(", ") : "";
    elements.noteProject.value = current.relatedProject || "";
    addGoalOptions(elements.noteGoal, current.relatedGoal || "");
    setStatus(elements.noteEditorStatus, "", false);
    elements.noteDialog.showModal();
  }

  function openNoteConversionDialog(capture) {
    elements.noteConversionCaptureId.value = capture.id;
    elements.noteConversionTitle.value = (capture.content || "").slice(0, 30);
    elements.noteConversionContent.value = capture.content || "";
    elements.noteConversionTags.value = "";
    elements.noteConversionProject.value = capture.relatedProject || "";
    addGoalOptions(elements.noteConversionGoal, capture.relatedGoal || "");
    setStatus(elements.noteConversionStatus, "", false);
    elements.noteConversionDialog.showModal();
  }

  function renderNotes(state) {
    clearChildren(elements.notes);
    const keyword = elements.noteSearch.value.trim().toLowerCase();
    const tag = elements.noteTagFilter.value;
    const notes = state.notes.filter(function (note) {
      if (note.status === "archived") return false;
      const searchable = (note.title + " " + note.content + " " + note.tags.join(" ")).toLowerCase();
      return (!keyword || searchable.includes(keyword)) && (!tag || note.tags.includes(tag));
    }).sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });

    if (!notes.length) {
      elements.notes.appendChild(emptyState(keyword || tag ? "没有符合条件的笔记。" : "还没有笔记。可以新建笔记或从捕获箱转换。"));
      return;
    }

    notes.forEach(function (note) {
      const item = document.createElement("article");
      item.className = "record-item note-item";
      const body = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = note.title;
      body.appendChild(title);
      const content = document.createElement("p");
      content.className = "note-preview";
      content.textContent = note.content;
      body.appendChild(content);
      appendTagList(body, note.tags);
      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = "更新于 " + formatDate(note.updatedAt);
      body.appendChild(meta);
      item.appendChild(body);
      const actions = document.createElement("div");
      actions.className = "record-actions";
      actions.appendChild(createButton("编辑", function () { openNoteDialog(note); }));
      actions.appendChild(createButton("归档", function () { storage.archiveNote(note.id); render(); }));
      actions.appendChild(createButton("删除", function () {
        if (window.confirm("删除这条笔记？此操作无法恢复。")) {
          storage.deleteNote(note.id);
          render();
        }
      }));
      item.appendChild(actions);
      elements.notes.appendChild(item);
    });
  }

  function renderNoteTagFilter(notes) {
    const selected = elements.noteTagFilter.value;
    const tags = Array.from(new Set(notes.filter(function (note) { return note.status === "active"; }).flatMap(function (note) { return note.tags; }))).sort();
    clearChildren(elements.noteTagFilter);
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "全部标签";
    elements.noteTagFilter.appendChild(all);
    tags.forEach(function (tag) {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      option.selected = tag === selected;
      elements.noteTagFilter.appendChild(option);
    });
  }

  function renderMemoryCenter(state) {
    const allRecords = memory.buildMemoryRecords(state);
    const records = memory.queryMemoryRecords(allRecords, {
      query: elements.memorySearch.value,
      type: elements.memoryType.value,
      order: elements.memoryOrder.value
    });

    elements.memoryCount.textContent = "显示 " + records.length + " / 共 " + allRecords.length + " 条";
    clearChildren(elements.memoryRecords);
    if (!records.length) {
      elements.memoryRecords.appendChild(emptyState("没有符合当前条件的记录。清除搜索或选择全部记录后可查看完整记忆。"));
      return;
    }

    records.forEach(function (record) {
      const item = document.createElement("article");
      item.className = "record-item memory-record";
      item.dataset.memoryType = record.type;
      item.dataset.memoryStatus = record.status || "unknown";

      const body = document.createElement("div");
      const heading = document.createElement("div");
      heading.className = "memory-record-heading";
      const type = document.createElement("span");
      type.className = "memory-type";
      type.textContent = memoryTypeLabel(record.type);
      heading.appendChild(type);
      const status = document.createElement("span");
      status.className = "badge memory-status";
      status.textContent = memoryStatusLabel(record.status);
      heading.appendChild(status);
      body.appendChild(heading);

      const title = document.createElement("h3");
      title.textContent = record.title;
      body.appendChild(title);
      if (record.summary && record.summary !== record.title) {
        const summary = document.createElement("p");
        summary.className = "memory-summary";
        summary.textContent = record.summary;
        body.appendChild(summary);
      }
      appendTagList(body, record.tags);

      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = record.sortAt ? "记录时间 " + formatDate(record.sortAt) : "记录时间未设置";
      body.appendChild(meta);
      item.appendChild(body);
      elements.memoryRecords.appendChild(item);
    });
  }

  function renderDecisions(state) {
    clearChildren(elements.decisions);
    state.decisions.slice().reverse().forEach(function (decision) {
      const item = document.createElement("div");
      item.className = "item";
      item.textContent = decision.problem;
      elements.decisions.appendChild(item);
    });
  }

  function renderRecentRecords(captures, completedTasks) {
    clearChildren(elements.recentRecords);
    const records = captures.map(function (capture) {
      return { label: "捕获 · " + capture.content, createdAt: capture.createdAt };
    }).concat(completedTasks.map(function (task) {
      return { label: "完成任务 · " + task.title, createdAt: task.completedAt };
    })).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 5);

    if (!records.length) {
      elements.recentRecords.appendChild(emptyState("还没有记录。"));
      return;
    }
    records.forEach(function (record) {
      const item = document.createElement("p");
      item.className = "compact-record";
      item.textContent = record.label + " · " + formatDate(record.createdAt);
      elements.recentRecords.appendChild(item);
    });
  }

  function renderDashboardTasks(tasks) {
    clearChildren(elements.dashboardTodayTasks);
    if (!tasks.length) {
      elements.dashboardTodayTasks.appendChild(emptyState("今天还没有安排任务。"));
      return;
    }
    tasks.slice(0, 3).forEach(function (task) {
      const item = document.createElement("p");
      item.className = "compact-record";
      item.textContent = task.title + " · " + taskPriorityLabel(task.priority);
      elements.dashboardTodayTasks.appendChild(item);
    });
  }

  function renderDashboardNotes(notes) {
    clearChildren(elements.dashboardNotes);
    if (!notes.length) {
      elements.dashboardNotes.appendChild(emptyState("还没有沉淀笔记。"));
      return;
    }
    notes.slice(0, 3).forEach(function (note) {
      const item = document.createElement("p");
      item.className = "compact-record";
      item.textContent = note.title + " · " + formatDate(note.updatedAt);
      elements.dashboardNotes.appendChild(item);
    });
  }

  function renderReview(todayCompleted, todayIncomplete, todayCaptures) {
    function addSummary(element, items, emptyMessage, label) {
      clearChildren(element);
      if (!items.length) {
        element.appendChild(emptyState(emptyMessage));
        return;
      }
      items.forEach(function (item) {
        const record = document.createElement("p");
        record.className = "compact-record";
        record.textContent = label(item);
        element.appendChild(record);
      });
    }

    addSummary(elements.reviewCompleted, todayCompleted, "今天还没有完成任务。", function (task) { return task.title; });
    addSummary(elements.reviewIncomplete, todayIncomplete, "今天没有未完成的今日任务。", function (task) { return task.title; });
    addSummary(elements.reviewCaptures, todayCaptures, "今天还没有新增捕获。", function (capture) { return capture.content; });
    const review = storage.getDailyReview(todayKey);
    elements.tomorrowGoal.value = review ? review.tomorrowGoal : "";
  }

  function openTaskDialog(task) {
    elements.taskId.value = task.id;
    elements.taskTitle.value = task.title || "";
    elements.taskPriority.value = task.priority || "medium";
    elements.taskDueDate.value = task.dueDate || "";
    elements.taskStatus.value = task.status || "todo";
    elements.taskToday.checked = task.today === true && task.todayDate === todayKey;
    setStatus(elements.taskEditorStatus, "", false);
    elements.taskDialog.showModal();
  }

  function openConversionDialog(capture) {
    elements.conversionCaptureId.value = capture.id;
    elements.conversionTitle.value = capture.content || "";
    elements.conversionPriority.value = "medium";
    elements.conversionDueDate.value = "";
    elements.conversionToday.checked = true;
    setStatus(elements.conversionStatus, "", false);
    elements.conversionDialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function render() {
    const state = storage.getState();
    currentState = state;
    const tasks = state.tasks.slice().sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });
    const goal = state.goals[0];
    const todayTasks = tasks.filter(isTodayTask);
    const pendingTasks = tasks.filter(function (task) { return isActiveTask(task) && !isTodayTask(task); });
    const completedTasks = tasks.filter(function (task) { return task.status === "completed"; });
    const todayCompleted = completedTasks.filter(completedToday);
    const todayCaptures = state.captures.filter(createdToday);
    const openCaptures = state.captures.filter(function (capture) { return capture.status === "inbox"; });
    const todayNotes = state.notes.filter(function (note) { return createdToday(note); });
    const recentNotes = state.notes.filter(function (note) { return note.status === "active"; }).sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });

    elements.todayDate.textContent = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(new Date());
    elements.goal.value = goal ? goal.title : "";
    elements.todoCount.textContent = String(todayTasks.length);
    elements.completedCount.textContent = String(todayCompleted.length);
    elements.captureCount.textContent = String(openCaptures.length);
    elements.noteCount.textContent = String(todayNotes.length);

    renderDashboardTasks(todayTasks);
    renderTaskList(elements.todayTasks, todayTasks, "今天还没有安排任务。可从捕获箱转换并加入今日任务。");
    renderTaskList(elements.pendingTasks, pendingTasks, "没有待处理任务。");
    renderTaskList(elements.completedTasks, completedTasks, "还没有已完成任务。");
    renderCaptures(state.captures);
    renderRecentRecords(state.captures, completedTasks);
    renderDashboardNotes(recentNotes);
    renderReview(todayCompleted, todayTasks, todayCaptures);
    renderNoteTagFilter(state.notes);
    renderNotes(state);
    renderMemoryCenter(state);
    renderDecisions(state);

    if (!openCaptures.length && !state.captures.length) setStatus(elements.captureStatus, "", false);
  }

  elements.goalForm.addEventListener("submit", function (event) {
    event.preventDefault();
    storage.saveTodayGoal(elements.goal.value);
    setStatus(elements.goalStatus, elements.goal.value.trim() ? "今日主线已保存。" : "今日主线已清除。", false);
    render();
  });

  elements.captureForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      storage.createCapture({
        content: elements.captureContent.value,
        category: elements.captureCategory.value,
        source: elements.captureSource.value
      });
      elements.captureForm.reset();
      setStatus(elements.captureStatus, "想法已保存到捕获箱。", false);
      render();
    } catch (error) {
      setStatus(elements.captureStatus, error.message, true);
    }
  });

  elements.conversionForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      storage.convertCaptureToTask(elements.conversionCaptureId.value, {
        title: elements.conversionTitle.value,
        priority: elements.conversionPriority.value,
        dueDate: elements.conversionDueDate.value || null,
        today: elements.conversionToday.checked
      });
      closeDialog(elements.conversionDialog);
      setStatus(elements.captureStatus, "已转换为任务。", false);
      render();
    } catch (error) {
      setStatus(elements.conversionStatus, error.message, true);
    }
  });

  elements.noteConversionForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      storage.convertCaptureToNote(elements.noteConversionCaptureId.value, {
        title: elements.noteConversionTitle.value,
        content: elements.noteConversionContent.value,
        tags: elements.noteConversionTags.value,
        relatedGoal: elements.noteConversionGoal.value || null,
        relatedProject: elements.noteConversionProject.value || null
      });
      closeDialog(elements.noteConversionDialog);
      setStatus(elements.captureStatus, "已转换为笔记。", false);
      render();
    } catch (error) {
      setStatus(elements.noteConversionStatus, error.message, true);
    }
  });

  elements.taskForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      storage.updateTask(elements.taskId.value, {
        title: elements.taskTitle.value,
        priority: elements.taskPriority.value,
        dueDate: elements.taskDueDate.value || null,
        status: elements.taskStatus.value,
        today: elements.taskToday.checked
      });
      closeDialog(elements.taskDialog);
      render();
    } catch (error) {
      setStatus(elements.taskEditorStatus, error.message, true);
    }
  });

  elements.reviewForm.addEventListener("submit", function (event) {
    event.preventDefault();
    storage.saveDailyReview({ date: todayKey, tomorrowGoal: elements.tomorrowGoal.value });
    setStatus(elements.reviewStatus, "明日主线已保存。", false);
    render();
  });

  elements.noteNewButton.addEventListener("click", function () { openNoteDialog(); });

  elements.noteForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      const input = {
        title: elements.noteTitle.value,
        content: elements.noteContent.value,
        tags: elements.noteTags.value,
        relatedGoal: elements.noteGoal.value || null,
        relatedProject: elements.noteProject.value || null
      };
      if (elements.noteId.value) storage.updateNote(elements.noteId.value, input);
      else storage.createNote(input);
      closeDialog(elements.noteDialog);
      render();
    } catch (error) {
      setStatus(elements.noteEditorStatus, error.message, true);
    }
  });

  elements.noteSearch.addEventListener("input", render);
  elements.noteTagFilter.addEventListener("change", render);
  elements.memorySearch.addEventListener("input", function () { renderMemoryCenter(currentState); });
  elements.memoryType.addEventListener("change", function () { renderMemoryCenter(currentState); });
  elements.memoryOrder.addEventListener("change", function () { renderMemoryCenter(currentState); });

  document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
    button.addEventListener("click", function () {
      closeDialog(document.getElementById(button.dataset.closeDialog));
    });
  });

  elements.advisorButton.addEventListener("click", function () {
    elements.reply.textContent = "AI 分析将在后续阶段接入。当前可以先整理今日任务和捕获内容。";
  });

  elements.decisionButton.addEventListener("click", function () {
    try {
      storage.createDecision(elements.decision.value);
      elements.decision.value = "";
      render();
    } catch (error) {
      elements.decisions.textContent = error.message;
    }
  });

  render();
});
