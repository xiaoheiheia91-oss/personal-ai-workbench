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
    tasks: document.getElementById("tasks"),
    dashboardTasks: document.getElementById("dashboard-tasks"),
    recentRecords: document.getElementById("recent-records"),
    todoCount: document.getElementById("todo-count"),
    completedCount: document.getElementById("completed-count"),
    captureCount: document.getElementById("capture-count"),
    todayDate: document.getElementById("today-date"),
    advisorButton: document.getElementById("advisor-button"),
    ask: document.getElementById("ask"),
    reply: document.getElementById("reply"),
    noteButton: document.getElementById("note-button"),
    note: document.getElementById("note"),
    notes: document.getElementById("notes"),
    decisionButton: document.getElementById("decision-button"),
    decision: document.getElementById("decision"),
    decisions: document.getElementById("decisions")
  };

  function setStatus(element, message, isError) {
    element.textContent = message;
    element.classList.toggle("error", Boolean(isError));
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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

  function createTaskElement(task, compact) {
    const item = document.createElement("article");
    item.className = "record-item task-item" + (task.status === "completed" ? " completed" : "");
    const body = document.createElement("div");
    const title = document.createElement(compact ? "p" : "h3");
    title.textContent = task.title;
    body.appendChild(title);
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = (task.priority === "high" ? "高优先级" : task.priority === "low" ? "低优先级" : "中优先级") + " · " + (task.completedAt ? "完成于 " + formatDate(task.completedAt) : "创建于 " + formatDate(task.createdAt));
    body.appendChild(meta);
    item.appendChild(body);

    if (!compact && task.status !== "completed") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = "标记完成";
      button.addEventListener("click", function () {
        storage.completeTask(task.id);
        render();
      });
      item.appendChild(button);
    }
    return item;
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
      meta.textContent = category + " · " + capture.source + " · " + formatDate(capture.createdAt);
      body.appendChild(meta);
      item.appendChild(body);
      if (capture.status === "inbox") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-button";
        button.textContent = "转为任务";
        button.addEventListener("click", function () {
          storage.convertCaptureToTask(capture.id, { priority: "medium", dueDate: null });
          setStatus(elements.captureStatus, "已转换为任务。", false);
          render();
        });
        item.appendChild(button);
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

  function render() {
    const state = storage.getState();
    const tasks = state.tasks.slice().sort(function (a, b) {
      if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
    const openCaptures = state.captures.filter(function (capture) { return capture.status === "inbox"; });
    const completedTasks = state.tasks.filter(function (task) { return task.status === "completed"; });
    const goal = state.goals[0];

    elements.todayDate.textContent = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(new Date());
    elements.goal.value = goal ? goal.title : "";
    elements.todoCount.textContent = String(tasks.filter(function (task) { return task.status !== "completed"; }).length);
    elements.completedCount.textContent = String(completedTasks.length);
    elements.captureCount.textContent = String(openCaptures.length);

    renderCaptures(state.captures);
    clearChildren(elements.tasks);
    if (tasks.length) tasks.forEach(function (task) { elements.tasks.appendChild(createTaskElement(task, false)); });
    else elements.tasks.appendChild(emptyState("还没有任务。先把捕获内容转成任务。"));

    clearChildren(elements.dashboardTasks);
    const dashboardTasks = tasks.filter(function (task) { return task.status !== "completed"; }).slice(0, 3);
    if (dashboardTasks.length) dashboardTasks.forEach(function (task) { elements.dashboardTasks.appendChild(createTaskElement(task, true)); });
    else elements.dashboardTasks.appendChild(emptyState("今天没有待完成任务。"));

    clearChildren(elements.recentRecords);
    const records = state.captures.map(function (capture) {
      return { label: "捕获 · " + capture.content, createdAt: capture.createdAt };
    }).concat(completedTasks.map(function (task) {
      return { label: "完成任务 · " + task.title, createdAt: task.completedAt };
    })).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 5);
    if (records.length) records.forEach(function (record) {
      const item = document.createElement("p");
      item.className = "compact-record";
      item.textContent = record.label + " · " + formatDate(record.createdAt);
      elements.recentRecords.appendChild(item);
    });
    else elements.recentRecords.appendChild(emptyState("还没有记录。"));

    renderNotes(state);
    renderDecisions(state);
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

  elements.advisorButton.addEventListener("click", function () {
    elements.reply.textContent = "AI 分析将在下一阶段接入。当前可以先把想法保存到捕获箱。";
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
