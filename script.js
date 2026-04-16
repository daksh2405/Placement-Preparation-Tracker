let tasks = JSON.parse(localStorage.getItem("placementTasks")) || [];
let editingTaskId = null;
let chartInstance = null;

const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const submitBtn = document.getElementById("submitBtn");
const formTitle = document.getElementById("formTitle");

const titleInput = document.getElementById("title");
const deadlineInput = document.getElementById("deadline");
const categoryInput = document.getElementById("category");
const priorityInput = document.getElementById("priority");
const noteInput = document.getElementById("note");

const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const filterStatus = document.getElementById("filterStatus");
const filterPriority = document.getElementById("filterPriority");
const sortBy = document.getElementById("sortBy");

const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const dueSoonCount = document.getElementById("dueSoonCount");
const overdueCount = document.getElementById("overdueCount");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const streakText = document.getElementById("streakText");

const clearAllBtn = document.getElementById("clearAllBtn");
const resetBtn = document.getElementById("resetBtn");
const themeToggle = document.getElementById("themeToggle");

function saveTasks() {
  localStorage.setItem("placementTasks", JSON.stringify(tasks));
}

function daysFromToday(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);

  const diff = d - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function priorityValue(priority) {
  if (priority === "High") return 3;
  if (priority === "Medium") return 2;
  return 1;
}

function getFilteredTasks() {
  let result = [...tasks];
  const search = searchInput.value.trim().toLowerCase();

  if (search) {
    result = result.filter(task =>
      task.title.toLowerCase().includes(search) ||
      task.category.toLowerCase().includes(search) ||
      (task.note || "").toLowerCase().includes(search)
    );
  }

  if (filterCategory.value !== "All") {
    result = result.filter(task => task.category === filterCategory.value);
  }

  if (filterStatus.value !== "All") {
    result = result.filter(task =>
      filterStatus.value === "Completed" ? task.completed : !task.completed
    );
  }

  if (filterPriority.value !== "All") {
    result = result.filter(task => task.priority === filterPriority.value);
  }

  if (sortBy.value === "deadline") {
    result.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  } else if (sortBy.value === "priority") {
    result.sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority));
  } else if (sortBy.value === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }

  return result;
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const dueSoon = tasks.filter(t => !t.completed && daysFromToday(t.deadline) >= 0 && daysFromToday(t.deadline) <= 3).length;
  const overdue = tasks.filter(t => !t.completed && daysFromToday(t.deadline) < 0).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  totalCount.textContent = total;
  doneCount.textContent = completed;
  dueSoonCount.textContent = dueSoon;
  overdueCount.textContent = overdue;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${progress}%`;

  if (completed === total && total > 0) {
    streakText.textContent = "Perfect streak — all tasks completed!";
  } else if (overdue > 0) {
    streakText.textContent = `${overdue} task(s) need immediate attention`;
  } else {
    streakText.textContent = "Keep the momentum going";
  }
}

function renderChart() {
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.length - completed;

  const ctx = document.getElementById("statusChart").getContext("2d");

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Completed", "Pending"],
      datasets: [{
        data: [completed, pending],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: getComputedStyle(document.body).getPropertyValue("--text")
          }
        }
      }
    }
  });
}

function renderTasks() {
  const visibleTasks = getFilteredTasks();
  taskList.innerHTML = "";

  updateStats();
  renderChart();

  if (visibleTasks.length === 0) {
    taskList.innerHTML = `<div class="empty">No tasks found. Add a task or change the filters.</div>`;
    return;
  }

  visibleTasks.forEach(task => {
    const remainingDays = daysFromToday(task.deadline);
    const isOverdue = !task.completed && remainingDays < 0;
    const isSoon = !task.completed && remainingDays >= 0 && remainingDays <= 3;

    const taskEl = document.createElement("div");
    taskEl.className = `task${task.completed ? " completed" : ""}`;

    taskEl.innerHTML = `
      <div class="task-top">
        <div>
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <strong>Category:</strong> ${task.category}<br>
            <strong>Deadline:</strong> ${task.deadline} ${isOverdue ? `(Overdue by ${Math.abs(remainingDays)} day(s))` : isSoon ? `(Due in ${remainingDays} day(s))` : ""}<br>
            ${task.note ? `<strong>Note:</strong> ${task.note}` : ""}
          </div>
          <div class="badges">
            <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
            <span class="badge ${task.completed ? "done" : "pending"}">${task.completed ? "Completed" : "Pending"}</span>
            ${isOverdue ? `<span class="badge overdue">Overdue</span>` : ""}
            ${isSoon ? `<span class="badge soon">Due Soon</span>` : ""}
          </div>
        </div>
      </div>

      <div class="task-actions">
        <button class="small-btn" onclick="toggleComplete('${task.id}')">
          ${task.completed ? "Mark Pending" : "Mark Complete"}
        </button>
        <button class="small-btn" onclick="editTask('${task.id}')">Edit</button>
        <button class="small-btn" onclick="deleteTask('${task.id}')">Delete</button>
      </div>
    `;

    taskList.appendChild(taskEl);
  });
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const newTask = {
    id: editingTaskId || Date.now().toString(),
    title: titleInput.value.trim(),
    deadline: deadlineInput.value,
    category: categoryInput.value,
    priority: priorityInput.value,
    note: noteInput.value.trim(),
    completed: false
  };

  if (editingTaskId) {
    const oldTask = tasks.find(t => t.id === editingTaskId);
    newTask.completed = oldTask ? oldTask.completed : false;
    tasks = tasks.map(task => task.id === editingTaskId ? newTask : task);
    editingTaskId = null;
    submitBtn.textContent = "Add Task";
    formTitle.textContent = "Add New Task";
  } else {
    tasks.push(newTask);
  }

  saveTasks();
  taskForm.reset();
  renderTasks();
});

function toggleComplete(id) {
  tasks = tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  titleInput.value = task.title;
  deadlineInput.value = task.deadline;
  categoryInput.value = task.category;
  priorityInput.value = task.priority;
  noteInput.value = task.note || "";

  submitBtn.textContent = "Update Task";
  formTitle.textContent = "Edit Task";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  taskForm.reset();
  editingTaskId = null;
  submitBtn.textContent = "Add Task";
  formTitle.textContent = "Add New Task";
}

clearAllBtn.addEventListener("click", () => {
  if (confirm("Delete all tasks?")) {
    tasks = [];
    saveTasks();
    renderTasks();
  }
});

resetBtn.addEventListener("click", resetForm);

[searchInput, filterCategory, filterStatus, filterPriority, sortBy].forEach(el => {
  el.addEventListener("input", renderTasks);
  el.addEventListener("change", renderTasks);
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  renderTasks();
});

renderTasks();