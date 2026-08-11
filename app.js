document.addEventListener("DOMContentLoaded", function () {
  const storage = window.PersonalAIStorage;
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
    todoCount: document.getElementById("todo-count"),
    completedCount: document.getElementById("completed-count"),
    captureCount: document.getElementById("capture-count"),
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
    advisorButton: document.getElementById("advisor-button"),
    reply: document.getElementById("reply"),
    noteButton: document.getElementById("note-button"),
    note: document.getElementById("note"),
    notes: document.getElementById("notes"),
    decisionButton: document.getElementById("decision-button"),
    decision: document.getElementById("decision"),
    decisions: document.getElementById("decisions")
  };

  const todayKey = storage.getLocalDate();

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
        item.appendChild(createButton("转为任务", function () { openConversionDialog(capture); }));
      } else {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "已转换";
        item.appendChild(badge);
      }
      elements.captures.appendChild(item);
    });
  }

  function renderNotes(state) {
    clearChildren(elements.notes);
    state.notes.slice().reverse().forEach(function (note) {
      const item = document.createElement("div");
      item.className = "item";
      item.textContent = note.content;
      elements.notes.appendChild(item);
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
    const tasks = state.tasks.slice().sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });
    const goal = state.goals[0];
    const todayTasks = tasks.filter(isTodayTask);
    const pendingTasks = tasks.filter(function (task) { return isActiveTask(task) && !isTodayTask(task); });
    const completedTasks = tasks.filter(function (task) { return task.status === "completed"; });
    const todayCompleted = completedTasks.filter(completedToday);
    const todayCaptures = state.captures.filter(createdToday);
    const openCaptures = state.captures.filter(function (capture) { return capture.status === "inbox"; });

    elements.todayDate.textContent = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(new Date());
    elements.goal.value = goal ? goal.title : "";
    elements.todoCount.textContent = String(todayTasks.length);
    elements.completedCount.textContent = String(todayCompleted.length);
    elements.captureCount.textContent = String(todayCaptures.length);

    renderDashboardTasks(todayTasks);
    renderTaskList(elements.todayTasks, todayTasks, "今天还没有安排任务。可从捕获箱转换并加入今日任务。");
    renderTaskList(elements.pendingTasks, pendingTasks, "没有待处理任务。");
    renderTaskList(elements.completedTasks, completedTasks, "还没有已完成任务。");
    renderCaptures(state.captures);
    renderRecentRecords(state.captures, completedTasks);
    renderReview(todayCompleted, todayTasks, todayCaptures);
    renderNotes(state);
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

  document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
    button.addEventListener("click", function () {
      closeDialog(document.getElementById(button.dataset.closeDialog));
    });
  });

  elements.advisorButton.addEventListener("click", function () {
    elements.reply.textContent = "AI 分析将在后续阶段接入。当前可以先整理今日任务和捕获内容。";
  });

  elements.noteButton.addEventListener("click", function () {
    try {
      storage.createNote(elements.note.value);
      elements.note.value = "";
      render();
    } catch (error) {
      elements.notes.textContent = error.message;
    }
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
