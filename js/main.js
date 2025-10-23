// Main application initialization

// Application state
const tasks = loadTasks();
const filterPreferences = loadFilterPreferences();
let activeFilter = typeof filterPreferences.active === "string" && filterPreferences.active
	? filterPreferences.active
	: "all";
const initialExcluded = Array.isArray(filterPreferences.excluded)
	? filterPreferences.excluded.filter((value) => typeof value === "string" && value && value !== "all")
	: [];
let excludedFilters = new Set(initialExcluded);
let sortBy = loadSortPreference();
let expandedTasks = loadExpandedTasks();

const LONG_PRESS_MS = 550;

// DOM elements
const form = document.getElementById("task-form");
const dropzones = document.querySelectorAll(".task-dropzone");
const columnCounters = {
	immediate: document.getElementById("immediate-count"),
	later: document.getElementById("later-count"),
	ideas: document.getElementById("ideas-count")
};
const filtersSection = document.querySelector(".filters");
const exportButton = document.getElementById("export-json");
const importButton = document.getElementById("import-json");
const importInput = document.getElementById("import-file");
const colorFilters = new Map();
const manualArea = document.getElementById("manual-json-area");
const manualFill = document.getElementById("manual-fill");
const manualCopy = document.getElementById("manual-copy");
const manualImport = document.getElementById("manual-import");
const sortBySelect = document.getElementById("sort-by");
const deleteAllButton = document.getElementById("delete-all-tasks");

if (filtersSection) {
	const showAllButton = filtersSection.querySelector('button[data-filter="all"]');
	if (showAllButton) {
		showAllButton.title = "Tap or click to show every type";
	}
}

// Initialize application
function init() {
	// Migrate task data
	migrateTaskData(tasks);
	rebalanceLaneOrder(tasks);
	populateColorSelectors();
	
	// Check and create repeating task instances
	if (checkRepeatingTasks(tasks)) {
		saveTasks(tasks);
	}
	
	renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
	hydrateFilterChips(tasks, filtersSection, colorFilters, excludedFilters);
	reflectFilterStateInUI();
	
	// Set the sort dropdown to the saved value
	sortBySelect.value = sortBy;
	
	// Initialize flatpickr on form date input
	let formDatepicker;
	if (typeof flatpickr !== 'undefined') {
		formDatepicker = flatpickr("#task-due", {
			dateFormat: "Y-m-d",
			allowInput: false,
			locale: {
				firstDayOfWeek: 1 // Monday
			}
		});
		
		// Add clear date button functionality for the form
		const clearFormDateBtn = document.getElementById("clear-form-date");
		if (clearFormDateBtn) {
			clearFormDateBtn.addEventListener("click", () => {
				const taskDueInput = document.getElementById("task-due");
				if (taskDueInput) {
					taskDueInput.value = "";
					if (formDatepicker) {
						formDatepicker.clear();
					}
				}
			});
		}
	}

	// Check repeating tasks every minute
	setInterval(() => {
		if (checkRepeatingTasks(tasks)) {
			saveTasks(tasks);
			renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
		}
	}, 60000);

	// Setup event listeners
	setupEventListeners();
}

function setupEventListeners() {
	// Custom events for triggering re-renders
	window.addEventListener('tasksChanged', () => {
		renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
	});

	window.addEventListener('filtersChanged', () => {
		hydrateFilterChips(tasks, filtersSection, colorFilters, excludedFilters);
		reflectFilterStateInUI();
	});

	// Form submission
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const formData = new FormData(form);
		const title = formData.get("title").trim();
		if (!title) {
			form.querySelector("#task-title").focus();
			return;
		}

		const laneSelection = formData.get("list") || "immediate";
		const nextOrder = nextLaneOrder(tasks, laneSelection);

		const repeatDays = formData.getAll("repeat").filter(d => d);
		const typeColor = formData.get("color") || "#94a3b8"; // Default to General
		const typeLabel = COLOR_PALETTE.find(e => e.value === typeColor)?.label || "General";
		
		const now = new Date().toISOString();
		tasks.push({
			id: crypto.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
			title,
		description: formData.get("description").trim(),
		dueDate: formData.get("due") || "",
		type: typeLabel,
		priority: parseInt(formData.get("priority") || "3", 10),
		length: parseTimeToMinutes(formData.get("length")),
		lane: repeatDays.length > 0 ? "ideas" : laneSelection,
		createdAt: now,
		completed: false,
			completedAt: "",
			order: nextOrder,
			repeatDays: repeatDays,
			isRepeatingInstance: false,
			repeatSourceId: "",
			subtasks: [],
			modifiedAt: now
		});

		saveTasks(tasks);
		renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
		hydrateFilterChips(tasks, filtersSection, colorFilters, excludedFilters);
		reflectFilterStateInUI();
		form.reset();
	});

	// Drag and drop
	dropzones.forEach((zone) => {
		zone.addEventListener("dragover", (event) => {
			event.preventDefault();
			zone.classList.add("drop-active");
			const draggedCard = document.querySelector(".task-card.dragging");
			if (!draggedCard) return;
			
			const afterElement = getDragAfterElement(zone, event.clientY);
			if (afterElement == null) {
				zone.appendChild(draggedCard);
			} else {
				zone.insertBefore(draggedCard, afterElement);
			}
		});

		zone.addEventListener("dragleave", (event) => {
			if (!event.relatedTarget || !zone.contains(event.relatedTarget)) {
				zone.classList.remove("drop-active");
			}
		});

		zone.addEventListener("drop", (event) => {
			event.preventDefault();
			zone.classList.remove("drop-active");
			const dragDataStr = event.dataTransfer.getData("text/plain");
			const newLane = zone.dataset.status;

			// Check if this is a subtask being promoted
			try {
				const dragData = JSON.parse(dragDataStr);
				if (dragData.type === "subtask") {
					// Promote subtask to task
					const parentTask = tasks.find(t => t.id === dragData.taskId);
					if (parentTask && parentTask.subtasks && parentTask.subtasks[dragData.subtaskIndex]) {
						const subtask = parentTask.subtasks[dragData.subtaskIndex];

						// Create new task from subtask
						const newTask = {
							id: crypto.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
							title: subtask.title,
							description: "",
							dueDate: parentTask.dueDate,
							type: parentTask.type,
							priority: parentTask.priority,
							length: subtask.time || 0,
							lane: newLane,
							createdAt: new Date().toISOString(),
							completed: false,
							completedAt: "",
							order: nextLaneOrder(tasks, newLane),
							repeatDays: [],
							isRepeatingInstance: false,
							repeatSourceId: "",
							subtasks: [],
							modifiedAt: new Date().toISOString(),
							actualTime: "",
							streak: 0
						};
						tasks.push(newTask);

						// Remove subtask from parent
						parentTask.subtasks.splice(dragData.subtaskIndex, 1);

						rebalanceLaneOrder(tasks);
						saveTasks(tasks);
						renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
						return;
					}
				}
			} catch (error) {
				// Not JSON, treat as regular task ID
			}

			// Regular task drag
			const taskId = dragDataStr;
			const draggedTask = tasks.find(t => t.id === taskId);
			if (!draggedTask) return;

			draggedTask.lane = newLane;

			const cardsInZone = Array.from(zone.querySelectorAll(".task-card"));
			const newOrder = cardsInZone.map(card => card.dataset.id);

			const laneTasks = tasks.filter((t) => t.lane === newLane && !t.completed);
			laneTasks.sort((a, b) => {
				const aIndex = newOrder.indexOf(a.id);
				const bIndex = newOrder.indexOf(b.id);
				return aIndex - bIndex;
			});

			laneTasks.forEach((task, index) => {
				task.order = index;
			});

			rebalanceLaneOrder(tasks);
			saveTasks(tasks);
			renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
		});
	});

	if (filtersSection) {
		// Filter controls with long-press support
		let longPressTimer = null;
		let longPressTarget = null;
		let longPressPointerId = null;
		let lastLongPressTarget = null;

		const clearLongPress = () => {
			if (longPressTimer) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			}
			if (longPressTarget && longPressPointerId !== null && typeof longPressTarget.releasePointerCapture === "function") {
				try {
					longPressTarget.releasePointerCapture(longPressPointerId);
				} catch (error) {
					// ignore pointer capture release errors
				}
			}
			longPressTarget = null;
			longPressPointerId = null;
		};

		filtersSection.addEventListener("pointerdown", (event) => {
			if (event.pointerType === "mouse" && event.button !== 0) return;
			if (event.target.closest('.filter-chip-copy')) return;
			const button = event.target.closest("button[data-filter]");
			if (!button) return;
			longPressTarget = button;
			longPressPointerId = event.pointerId;
			if (typeof button.setPointerCapture === "function") {
				try {
					button.setPointerCapture(event.pointerId);
				} catch (error) {
					longPressPointerId = null;
				}
			}
			longPressTimer = window.setTimeout(() => {
				longPressTimer = null;
				if (toggleExcludeFilter(button.dataset.filter)) {
					lastLongPressTarget = button;
				}
			}, LONG_PRESS_MS);
		});

		filtersSection.addEventListener("pointerup", () => clearLongPress());
		filtersSection.addEventListener("pointercancel", () => clearLongPress());

		filtersSection.addEventListener("click", (event) => {
			// Check if clicking on the copy icon - if so, ignore and let the copy handler deal with it
			if (event.target.closest('.filter-chip-copy')) {
				return;
			}
			
			const button = event.target.closest("button[data-filter]");
			if (!button) return;

			if (button === lastLongPressTarget) {
				lastLongPressTarget = null;
				return;
			}

			const filterValue = button.dataset.filter;
			if (event.ctrlKey || event.metaKey) {
				event.preventDefault();
				toggleExcludeFilter(filterValue);
				return;
			}

			setActiveFilter(filterValue);
		});

		filtersSection.addEventListener("contextmenu", (event) => {
			const button = event.target.closest("button[data-filter]");
			if (!button) return;
			event.preventDefault();
			toggleExcludeFilter(button.dataset.filter);
		});
	}

	// Sort control
	sortBySelect.addEventListener("change", () => {
		sortBy = sortBySelect.value;
		saveSortPreference(sortBy);
		if (sortBy === "custom") {
			tasks.forEach((task, index) => {
				if (task.order === undefined) {
					task.order = index;
				}
			});
			saveTasks(tasks);
		}
		renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
	});

	// Export/Import
	exportButton.addEventListener("click", () => {
		const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `priority-notes-${new Date().toISOString().slice(0, 10)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	});

	importButton.addEventListener("click", () => {
		importInput.click();
	});

	importInput.addEventListener("change", async () => {
		const file = importInput.files?.[0];
		importInput.value = "";
		if (!file) return;

		try {
			const raw = await file.text();
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) throw new Error("JSON must be an array of tasks.");
			const importedTasks = sanitizeImportedTasks(parsed);
			
			const mergeResult = mergeTasks(tasks, importedTasks);
			const message = `Import will merge ${importedTasks.length} tasks:\n` +
				`- ${mergeResult.added} new tasks\n` +
				`- ${mergeResult.updated} updated tasks\n` +
				`- ${mergeResult.unchanged} unchanged tasks\n\nContinue?`;
			
			if (!window.confirm(message)) return;
			
			tasks.length = 0;
			tasks.push(...mergeResult.merged);
			saveTasks(tasks);
			renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
			hydrateFilterChips(tasks, filtersSection, colorFilters, excludedFilters);
			reflectFilterStateInUI();
			reflectFilterStateInUI();
		} catch (error) {
			console.error("Import failed", error);
			window.alert(`Could not import: ${error.message || error}`);
		}
	});

	manualFill.addEventListener("click", () => {
		manualArea.value = JSON.stringify(tasks, null, 2);
	});

	manualCopy.addEventListener("click", async () => {
		if (!manualArea.value) {
			manualArea.value = JSON.stringify(tasks, null, 2);
		}
		manualArea.focus();
		manualArea.select();
		try {
			await navigator.clipboard.writeText(manualArea.value);
		} catch (error) {
			const success = document.execCommand?.("copy");
			if (!success) {
				console.warn("Clipboard copy failed", error);
			}
		}
	});

	manualImport.addEventListener("click", () => {
		const raw = manualArea.value.trim();
		if (!raw) {
			window.alert("Paste JSON into the textarea first.");
			return;
		}
		try {
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) throw new Error("JSON must be an array of tasks.");
			const importedTasks = sanitizeImportedTasks(parsed);
			
			const mergeResult = mergeTasks(tasks, importedTasks);
			const message = `Import will merge ${importedTasks.length} tasks:\n` +
				`- ${mergeResult.added} new tasks\n` +
				`- ${mergeResult.updated} updated tasks\n` +
				`- ${mergeResult.unchanged} unchanged tasks\n\nContinue?`;
			
			if (!window.confirm(message)) return;
			
			tasks.length = 0;
			tasks.push(...mergeResult.merged);
			saveTasks(tasks);
			renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
			hydrateFilterChips(tasks, filtersSection, colorFilters, excludedFilters);
		} catch (error) {
			console.error("Manual import failed", error);
			window.alert(`Could not import: ${error.message || error}`);
		}
	});

	// Delete all tasks with double confirmation
	deleteAllButton.addEventListener("click", () => {
		const taskCount = tasks.filter(t => !t.completed).length;
		const completedCount = tasks.filter(t => t.completed).length;
		const totalCount = tasks.length;
		
		if (totalCount === 0) {
			window.alert("There are no tasks to delete.");
			return;
		}
		
		// First confirmation
		const firstConfirm = window.confirm(
			`⚠️ WARNING: You are about to delete ALL tasks!\n\n` +
			`This will permanently delete:\n` +
			`- ${taskCount} active task(s)\n` +
			`- ${completedCount} completed task(s)\n` +
			`- Total: ${totalCount} task(s)\n\n` +
			`This action CANNOT be undone!\n\n` +
			`Do you want to continue?`
		);
		
		if (!firstConfirm) {
			return;
		}
		
		// Second confirmation
		const secondConfirm = window.confirm(
			`⚠️ FINAL WARNING!\n\n` +
			`Are you ABSOLUTELY SURE you want to delete all ${totalCount} task(s)?\n\n` +
			`This action is PERMANENT and IRREVERSIBLE!\n\n` +
			`Click OK to DELETE ALL TASKS or Cancel to keep them.`
		);
		
		if (!secondConfirm) {
			return;
		}
		
		// Delete all tasks
		tasks.length = 0;
		saveTasks(tasks);
		renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
		hydrateFilterChips(tasks, filtersSection, colorFilters, excludedFilters);
		reflectFilterStateInUI();
		
		window.alert("✓ All tasks have been deleted.");
	});

	// Event listener for task lane change
	document.addEventListener("change", (event) => {
		if (event.target.classList.contains("task-lane")) {
			const card = event.target.closest(".task-card");
			if (!card) return;
			
			const taskId = card.dataset.id;
			const task = tasks.find(t => t.id === taskId);
			if (!task) return;
			
			const newLane = event.target.value;
			
			// Only update if the lane actually changed
			if (task.lane !== newLane) {
				task.lane = newLane;
				task.order = nextLaneOrder(tasks, newLane);
				rebalanceLaneOrder(tasks);
				saveTasks(tasks);
				window.dispatchEvent(new CustomEvent('tasksChanged'));
			}
		}
	});
}

function setActiveFilter(filterValue) {
	if (!filterValue || filterValue === "all") {
		activeFilter = "all";
		excludedFilters.clear();
	} else {
		activeFilter = filterValue;
		excludedFilters.clear();
	}
	saveFilterPreferences(activeFilter, excludedFilters);
	renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
	reflectFilterStateInUI();
}

function toggleExcludeFilter(filterValue) {
	if (!filterValue || filterValue === "all") return false;
	let changed = false;
	if (excludedFilters.has(filterValue)) {
		excludedFilters.delete(filterValue);
		changed = true;
	} else {
		excludedFilters.add(filterValue);
		changed = true;
		if (activeFilter === filterValue) {
			activeFilter = "all";
		}
	}
	if (!changed) return false;
	saveFilterPreferences(activeFilter, excludedFilters);
	renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones);
	reflectFilterStateInUI();
	return true;
}

function reflectFilterStateInUI() {
	if (!filtersSection) return;
	const buttons = filtersSection.querySelectorAll("button[data-filter]");
	buttons.forEach((button) => {
		const value = button.dataset.filter;
		if (value === "all") {
			button.classList.toggle("active", activeFilter === "all");
			button.classList.remove("excluded");
			return;
		}
		button.classList.toggle("active", value === activeFilter);
		button.classList.toggle("excluded", excludedFilters.has(value));
	});
}

// Calculate and update statistics
function updateStatistics() {
	// Get start of current week (Monday)
	const now = new Date();
	const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
	const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - daysToMonday);
	startOfWeek.setHours(0, 0, 0, 0);

	// Filter for tasks completed this week with time tracking
	const completedTasks = tasks.filter(t => {
		if (!t.completed || !t.actualTime || !t.length || !t.completedAt) return false;
		const completedDate = new Date(t.completedAt);
		return completedDate >= startOfWeek;
	});

	// Count currently overdue tasks (not completed)
	const today = new Date().toISOString().slice(0, 10);
	const currentlyLateTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
	const lateCount = currentlyLateTasks.length;

	// Update late tasks counter badge
	const lateCountEl = document.getElementById('late-tasks-count');
	if (lateCount === 0) {
		lateCountEl.textContent = '0 late';
		lateCountEl.className = 'stat-badge good';
	} else {
		lateCountEl.textContent = `${lateCount} late`;
		lateCountEl.className = 'stat-badge bad';
	}

	// Calculate task completion speed (only for tasks completed this week with time tracking)
	const accuracyEl = document.getElementById('accuracy-stat');

	if (completedTasks.length === 0) {
		accuracyEl.textContent = '—';
		accuracyEl.className = 'stat-value';
	} else {
		// Calculate task completion speed by comparing total estimated vs total actual
		const totalEstimated = completedTasks.reduce((sum, t) => sum + t.length, 0);
		const totalActual = completedTasks.reduce((sum, t) => sum + t.actualTime, 0);

		// Speed = (estimated / actual) * 100
		// 100% = on time, >100% = faster, <100% = slower
		const completionSpeed = (totalEstimated / totalActual) * 100;

		accuracyEl.textContent = `${Math.round(completionSpeed)}%`;
		accuracyEl.className = 'stat-value';
		// Green if >= 100% (faster or on time), red if < 100% (slower)
		if (completionSpeed >= 100) {
			accuracyEl.classList.add('good');
		} else {
			accuracyEl.classList.add('bad');
		}
	}

	// Calculate average lateness (for tasks completed this week only)

	const lateTasksData = tasks
		.filter(t => {
			if (!t.completed || !t.dueDate || !t.completedAt) return false;
			const completedDate = new Date(t.completedAt);
			return completedDate >= startOfWeek; // Only tasks completed this week
		})
		.map(t => {
			const dueDate = new Date(t.dueDate + 'T23:59:59');
			const completedDate = new Date(t.completedAt);
			const diffMs = completedDate.getTime() - dueDate.getTime();
			const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
			return diffDays;
		});

	const avgLateness = lateTasksData.length > 0
		? lateTasksData.reduce((sum, val) => sum + val, 0) / lateTasksData.length
		: 0;

	// Update lateness display
	const latenessEl = document.getElementById('lateness-stat');
	if (lateTasksData.length === 0) {
		latenessEl.textContent = '—';
		latenessEl.className = 'stat-value';
	} else {
		const absLateness = Math.abs(avgLateness);
		const latenessText = avgLateness > 0
			? `+${absLateness.toFixed(1)}d`
			: avgLateness < 0
				? `−${absLateness.toFixed(1)}d`
				: 'On time';
		latenessEl.textContent = latenessText;
		latenessEl.className = 'stat-value';
		// Green if on time or early, red if late
		if (avgLateness <= 0) {
			latenessEl.classList.add('good');
		} else {
			latenessEl.classList.add('bad');
		}
	}
}

// Start the application
init();

// Update statistics on load and whenever tasks change
updateStatistics();
window.addEventListener('tasksChanged', updateStatistics);
