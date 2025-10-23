// UI rendering and interactions

function populateColorSelectors() {
	const formSelect = document.getElementById("task-color");
	formSelect.innerHTML = "";

	COLOR_PALETTE.forEach((entry) => {
		const option = document.createElement("option");
		option.value = entry.value;
		option.textContent = `${entry.label}`;
		option.style.background = entry.value;
		option.style.color = "#fff";
		option.style.fontWeight = "600";
		formSelect.appendChild(option);
	});
	formSelect.value = "#94a3b8"; // Default to "General"
}

function populateTaskColorSelect(selectElement) {
	selectElement.innerHTML = "";

	COLOR_PALETTE.forEach((entry) => {
		const option = document.createElement("option");
		option.value = entry.value;
		option.textContent = `${entry.label}`;
		option.style.background = entry.value;
		option.style.color = "#fff";
		option.style.fontWeight = "600";
		selectElement.appendChild(option);
	});
}

function renderBoard(tasks, activeFilter, excludedFilters, sortBy, columnCounters, dropzones) {
	dropzones.forEach((zone) => {
		const fragment = document.createDocumentFragment();
		const listTasks = filteredTasksForLane(tasks, zone.dataset.status, activeFilter, excludedFilters, sortBy);
		if (!listTasks.length) {
			const empty = document.createElement("div");
			empty.className = "empty-state";
			empty.textContent = zone.dataset.status === "immediate"
				? "Drop urgent work here to lock it to the top."
				: zone.dataset.status === "ideas"
				? "Add long-term ideas and projects here."
				: "Backlog ideas and later tasks here.";
			fragment.appendChild(empty);
		} else {
			listTasks.forEach((task) => fragment.appendChild(buildTaskCard(task, tasks)));
		}

		zone.innerHTML = "";
		zone.appendChild(fragment);

		// Calculate total time for the lane
		const totalMinutes = listTasks.reduce((sum, task) => sum + (task.length || 0), 0);
		const hasUnestimatedTasks = listTasks.some(task => !task.length);
		const timeStr = totalMinutes
			? ` • ${formatMinutes(totalMinutes)}${hasUnestimatedTasks ? '+' : ''}`
			: hasUnestimatedTasks ? ' • ?' : "";

		const counter = columnCounters[zone.dataset.status];
		counter.textContent = listTasks.length === 1
			? `1 task${timeStr}`
			: `${listTasks.length} tasks${timeStr}`;

		// Mark immediate focus column red if more than 5 hours
		if (zone.dataset.status === "immediate" && totalMinutes > 300) {
			counter.classList.add("time-overload");
		} else {
			counter.classList.remove("time-overload");
		}
	});

	renderCompletedTasks(tasks);
}

function filteredTasksForLane(tasks, lane, activeFilter, excludedFilters, sortBy) {
	return tasks
		.filter((task) => task.lane === lane && !task.completed)
		.filter((task) => {
			const taskColor = getTypeColor(task.type);
			// Exclude filtered types
			if (excludedFilters.has(taskColor)) return false;
			// If active filter is set, only show that type
			if (activeFilter === "all") return true;
			return taskColor === activeFilter;
		})
		.sort(prioritySort(sortBy));
}

// Helper function to update compact info without re-rendering
function updateCompactInfo(task, compactInfoElement, isOverdue) {
	const compactParts = [];
	
	if (task.dueDate) {
		const dueStr = isOverdue ? `⚠️ ${formatDate(task.dueDate)}` : formatDate(task.dueDate);
		compactParts.push(dueStr);
	}
	
	if (task.length) {
		compactParts.push(`⏱ ${formatMinutes(task.length)}`);
	}
	
	if (task.type) {
		const icon = getTypeIcon(task.type);
		compactParts.push(`${icon} ${task.type}`);
	}
	
	if (task.repeatDays && task.repeatDays.length > 0) {
		const days = task.repeatDays.map(d => DAY_ABBREVIATIONS[d] || d).join(', ');
		const streakInfo = task.streak > 0 ? ` 🏆${task.streak}` : '';
		compactParts.push(`🔄 ${days}${streakInfo}`);
	} else if (task.isRepeatingInstance) {
		compactParts.push(`↩ recurring`);
	}
	
	compactInfoElement.textContent = compactParts.join(" • ");
}

function renderCompletedTasks(tasks) {
	const completedContainer = document.getElementById("completed-tasks");
	if (!completedContainer) return;

	const completed = tasks
		.filter((task) => task.completed)
		.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

	completedContainer.innerHTML = "";

	// Update the completed tasks summary with count breakdown by timeframe
	const completedPanel = document.querySelector(".completed-panel");
	const completedSummary = completedPanel?.querySelector("summary");
	if (completedSummary) {
		// Get today and start of week
		const now = new Date();
		const today = now.toISOString().slice(0, 10);
		const dayOfWeek = now.getDay();
		const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - daysToMonday);
		startOfWeek.setHours(0, 0, 0, 0);

		// Filter completed tasks by timeframe
		const todayCompleted = completed.filter(t => {
			const completedDate = t.completedAt ? t.completedAt.slice(0, 10) : "";
			return completedDate === today;
		});

		const weekCompleted = completed.filter(t => {
			if (!t.completedAt) return false;
			const completedDate = new Date(t.completedAt);
			return completedDate >= startOfWeek;
		});

		// Calculate total actual time for each timeframe
		const totalTime = completed.reduce((sum, task) => sum + (task.actualTime || 0), 0);
		const weekTime = weekCompleted.reduce((sum, task) => sum + (task.actualTime || 0), 0);
		const todayTime = todayCompleted.reduce((sum, task) => sum + (task.actualTime || 0), 0);

		// Check if any tasks don't have actual time tracked
		const totalHasUnestimated = completed.some(task => !task.actualTime);
		const weekHasUnestimated = weekCompleted.some(task => !task.actualTime);
		const todayHasUnestimated = todayCompleted.some(task => !task.actualTime);

		// Format time strings
		const totalStr = totalTime ? formatMinutes(totalTime) + (totalHasUnestimated ? '+' : '') : (totalHasUnestimated ? '?' : '0');
		const weekStr = weekTime ? formatMinutes(weekTime) + (weekHasUnestimated ? '+' : '') : (weekHasUnestimated ? '?' : '0');
		const todayStr = todayTime ? formatMinutes(todayTime) + (todayHasUnestimated ? '+' : '') : (todayHasUnestimated ? '?' : '0');

		completedSummary.textContent = `Completed tasks (${totalStr} overall, ${weekStr} this week, ${todayStr} today)`;
	}

	if (!completed.length) {
		const empty = document.createElement("div");
		empty.className = "completed-empty";
		empty.textContent = "Nothing completed yet. Finish a task and it will land here.";
		completedContainer.appendChild(empty);
		return;
	}

	completed.forEach((task) => {
		completedContainer.appendChild(buildCompletedCard(task, tasks));
	});
}

function buildCompletedCard(task, tasks) {
	const card = document.createElement("article");
	card.className = "completed-card";

	const title = document.createElement("div");
	title.className = "completed-title";
	title.textContent = task.title;
	card.appendChild(title);

	if (task.description) {
		const description = document.createElement("p");
		description.className = "completed-description";
		description.textContent = task.description;
		card.appendChild(description);
	}

	const meta = document.createElement("div");
	meta.className = "completed-meta";
	const completedDate = task.completedAt ? formatDate(task.completedAt) : "Today";
	const typeColor = getTypeColor(task.type);
	const typeIcon = getTypeIcon(task.type);
	const laneName = task.lane === "immediate" ? "Immediate" : task.lane === "ideas" ? "Ideas/Long Term" : "Later";
	meta.innerHTML = `
		<span>Finished ${completedDate}</span>
		<span>Lane: ${laneName}</span>
		${task.type ? `<span>${typeIcon} ${task.type}</span>` : ""}
		${typeColor && !task.type ? `<span><span class="color-swatch" style="background:${typeColor}"></span></span>` : ""}
	`;
	card.appendChild(meta);

	const actions = document.createElement("div");
	actions.className = "completed-actions";
	
	// Restore button
	const restore = document.createElement("button");
	restore.type = "button";
	restore.className = "button-ghost";
	restore.textContent = "Mark active";
	restore.addEventListener("click", () => {
		task.completed = false;
		task.completedAt = "";
		task.order = nextLaneOrder(tasks, task.lane);
		rebalanceLaneOrder(tasks);
		saveTasks(tasks);
		// Trigger re-render via event
		window.dispatchEvent(new CustomEvent('tasksChanged'));
	});
	actions.appendChild(restore);
	
	// Delete button
	const deleteBtn = document.createElement("button");
	deleteBtn.type = "button";
	deleteBtn.className = "button-ghost";
	deleteBtn.textContent = "Delete";
	deleteBtn.style.color = "var(--red-500)";
	deleteBtn.addEventListener("click", () => {
		if (confirm("Are you sure you want to permanently delete this task?")) {
			// Note: Completed tasks don't affect streak since they were already counted
			const index = tasks.findIndex(t => t.id === task.id);
			if (index !== -1) {
				tasks.splice(index, 1);
				saveTasks(tasks);
				window.dispatchEvent(new CustomEvent('tasksChanged'));
			}
		}
	});
	actions.appendChild(deleteBtn);
	
	card.appendChild(actions);

	return card;
}

function buildTaskCard(task, tasks) {
	const template = document.getElementById("task-template");
	const node = template.content.firstElementChild.cloneNode(true);
	node.dataset.id = task.id;
	
	// Check if this task was previously expanded
	const wasExpanded = expandedTasks.has(task.id);
	
	// Apply expanded or collapsed state based on previous state
	if (wasExpanded) {
		node.classList.add("expanded");
	} else {
		node.classList.add("collapsed");
	}

	if (task.completed) {
		node.classList.add("completed");
	}

	const overdue = task.dueDate && !task.completed && isPastDue(task.dueDate);
	if (overdue) {
		node.classList.add("overdue");
	}
	
	// Add edit instructions hint as title attribute
	node.setAttribute("title", "Click to expand. You can edit title and description text directly.");

	const colorTag = node.querySelector(".color-tag");
	colorTag.style.background = PRIORITY_COLORS[task.priority || 3];
	
	// Apply deadline-based background color for non-completed tasks with due dates
	if (task.dueDate && !task.completed) {
		const deadlineColor = getDeadlineColor(task.dueDate);
		if (deadlineColor) {
			node.style.backgroundColor = deadlineColor;
			node.classList.add("has-deadline-color");
		}
	}
	
	const titleElement = node.querySelector(".task-title");
	titleElement.textContent = task.title;
	titleElement.addEventListener("blur", () => {
		if (task.title !== titleElement.textContent.trim()) {
			task.title = titleElement.textContent.trim();
			saveTasks(tasks);
			window.dispatchEvent(new CustomEvent('tasksChanged'));
		}
	});
	titleElement.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			titleElement.blur();
		}
	});
	
	const descriptionElement = node.querySelector(".task-description");
	descriptionElement.textContent = task.description;
	descriptionElement.addEventListener("focus", () => {
		if (!descriptionElement.textContent.trim()) {
			// Clear the placeholder when focusing on an empty description
			descriptionElement.textContent = "";
		}
	});
	descriptionElement.addEventListener("blur", () => {
		if (task.description !== descriptionElement.textContent.trim()) {
			task.description = descriptionElement.textContent.trim();
			saveTasks(tasks);
			window.dispatchEvent(new CustomEvent('tasksChanged'));
		}
	});
	
	// Build compact info
	const compactInfo = node.querySelector(".task-compact-info");
	updateCompactInfo(task, compactInfo, overdue);
	
	// Apply special styling to repeating task templates in the "Ideas/Long Term" lane
	if (task.repeatDays && task.repeatDays.length > 0 && !task.isRepeatingInstance && task.lane === "ideas") {
		node.classList.add("template-task");
	}
	
	// Click to expand/collapse
	node.addEventListener("click", (e) => {
		// Don't toggle if clicking on interactive elements or editable content
		if (e.target.matches('input, select, button, label, [contenteditable]')) {
			return;
		}
		
		// Toggle collapsed/expanded state
		const isExpanded = node.classList.toggle("expanded");
		node.classList.toggle("collapsed", !isExpanded);
		
		// Update tracking of expanded tasks
		if (isExpanded) {
			expandedTasks.add(task.id);
		} else {
			expandedTasks.delete(task.id);
		}
		
		// Save expanded state
		saveExpandedTasks(expandedTasks);
	});

	const dueDisplay = node.querySelector(".due-display");
	if (task.dueDate) {
		dueDisplay.innerHTML = `<strong>Due</strong> ${formatDate(task.dueDate)}${overdue ? " · overdue" : ""}`;
	} else {
		dueDisplay.textContent = "No date";
	}

	const priorityDisplay = node.querySelector(".priority-display");
	priorityDisplay.innerHTML = `<strong>Priority</strong> ${PRIORITY_LABELS[task.priority || 3]}`;

	const lengthDisplay = node.querySelector(".length-display");
	if (task.length) {
		lengthDisplay.innerHTML = `<strong>Est.</strong> ${formatMinutes(task.length)}`;
	} else {
		lengthDisplay.textContent = "";
	}

	const repeatDisplay = node.querySelector(".repeat-display");
	if (task.repeatDays && task.repeatDays.length > 0) {
		const dayLabel = task.repeatDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
		const streakDisplay = task.streak > 0 ? ` <span class="streak-badge">🏆 ${task.streak}</span>` : '';
		repeatDisplay.innerHTML = `<strong>🔄 Every ${dayLabel}</strong>${streakDisplay}`;
	} else if (task.isRepeatingInstance) {
		repeatDisplay.innerHTML = `<em>↩ From recurring task</em>`;
	} else {
		repeatDisplay.textContent = "";
	}

	const completeCheckbox = node.querySelector(".task-complete");
	completeCheckbox.checked = task.completed;
	completeCheckbox.addEventListener("change", () => {
		task.completed = completeCheckbox.checked;
		if (task.completed) {
			task.completedAt = new Date().toISOString();
			node.classList.add("completed");

			// Update streak for repeating task instances
			if (task.isRepeatingInstance && task.repeatSourceId) {
				const sourceTemplate = tasks.find(t => t.id === task.repeatSourceId);
				if (sourceTemplate) {
					sourceTemplate.streak = (sourceTemplate.streak || 0) + 1;
				}
			}

			// Play completion sound
			playCompletionSound();

			// Show modal to track actual time
			showCompletionModal(task, tasks);
		} else {
			task.completedAt = "";
			task.order = nextLaneOrder(tasks, task.lane);
			node.classList.remove("completed");

			// Decrement streak if uncompleting a repeating task instance
			if (task.isRepeatingInstance && task.repeatSourceId) {
				const sourceTemplate = tasks.find(t => t.id === task.repeatSourceId);
				if (sourceTemplate && sourceTemplate.streak > 0) {
					sourceTemplate.streak--;
				}
			}

			// Completed tasks always need a full refresh because they move to completed section
			rebalanceLaneOrder(tasks);
			saveTasks(tasks);
			window.dispatchEvent(new CustomEvent('tasksChanged'));
		}
	});

	const copyTaskButton = node.querySelector(".copy-task-btn");
	if (copyTaskButton) {
		copyTaskButton.addEventListener("click", async (event) => {
			event.stopPropagation();
			// Wrap the task in an array to make it easier to paste as a collection
			const json = JSON.stringify([task], null, 2);
			const copied = await copyTextToClipboard(json);
			if (copied) {
				flashCopyFeedback(copyTaskButton);
			} else {
				if (typeof globalThis.alert === "function") {
					globalThis.alert("Could not copy task JSON to the clipboard.");
				}
			}
		});
	}

	const dueInput = node.querySelector(".task-due");
	dueInput.value = task.dueDate;
	
	// Function to update date-related UI elements
	const updateDateUI = (newDate, newOverdue) => {
		// Update due display without full re-render
		const dueDisplay = node.querySelector(".due-display");
		
		if (newDate) {
			dueDisplay.innerHTML = `<strong>Due</strong> ${formatDate(newDate)}${newOverdue ? " · overdue" : ""}`;
		} else {
			dueDisplay.textContent = "No date";
		}
		
		// Update overdue class
		if (newOverdue !== overdue) {
			if (newOverdue) {
				node.classList.add("overdue");
			} else {
				node.classList.remove("overdue");
			}
		}
		
		// Update deadline color
		if (newDate && !task.completed) {
			const deadlineColor = getDeadlineColor(newDate);
			node.style.backgroundColor = deadlineColor || "";
			if (deadlineColor) {
				node.classList.add("has-deadline-color");
			} else {
				node.classList.remove("has-deadline-color");
			}
		} else {
			node.style.backgroundColor = "";
			node.classList.remove("has-deadline-color");
		}
		
		// Update compact info
		const compactInfo = node.querySelector(".task-compact-info");
		updateCompactInfo(task, compactInfo, newOverdue);
	};
	
	// Initialize flatpickr for this date input
	flatpickr(dueInput, {
		dateFormat: "Y-m-d",
		allowInput: false,
		locale: {
			firstDayOfWeek: 1 // Monday
		},
		onChange: function(selectedDates, dateStr) {
			if (dateStr !== task.dueDate) {
				task.dueDate = dateStr;

				const newOverdue = task.dueDate && !task.completed && isPastDue(task.dueDate);
				updateDateUI(task.dueDate, newOverdue);

				saveTasks(tasks);
				// No need to dispatch tasksChanged event as we've updated the UI inline
			}
		}
	});
	
	// Add clear date button functionality
	const clearDateBtn = node.querySelector(".clear-date-btn");
	clearDateBtn.addEventListener("click", () => {
		if (task.dueDate) {
			// Clear the date value
			task.dueDate = "";
			dueInput.value = "";
			
			// Update UI elements
			updateDateUI("", false);
			
			// Save changes
			saveTasks(tasks);
			
			// If we're using flatpickr, we need to clear it too
			const fpInstance = dueInput._flatpickr;
			if (fpInstance) {
				fpInstance.clear();
			}
		}
	});

	const colorSelect = node.querySelector(".task-color");
	populateTaskColorSelect(colorSelect);
	colorSelect.value = getTypeColor(task.type);
	colorSelect.addEventListener("change", () => {
		const selectedColor = colorSelect.value;
		const entry = COLOR_PALETTE.find(e => e.value === selectedColor);
		const newType = entry ? entry.label : "";
		
		// Only update if type actually changed
		if (newType !== task.type) {
			task.type = newType;
			
			// Update compact info without full re-render
			const compactInfo = node.querySelector(".task-compact-info");
			updateCompactInfo(task, compactInfo, overdue);
			
			saveTasks(tasks);
			
			// We still need to update the filters
			window.dispatchEvent(new CustomEvent('filtersChanged'));
			
			// Don't need a full task re-render since we updated the UI inline
		}
	});

	const prioritySelect = node.querySelector(".task-priority");
	prioritySelect.value = String(task.priority || 3);
	prioritySelect.addEventListener("change", () => {
		const newPriority = parseInt(prioritySelect.value, 10);
		
		// Only update if priority actually changed
		if (newPriority !== task.priority) {
			task.priority = newPriority;
			
			// Update priority display without full re-render
			const priorityDisplay = node.querySelector(".priority-display");
			priorityDisplay.innerHTML = `<strong>Priority</strong> ${PRIORITY_LABELS[task.priority || 3]}`;
			
			// Update the color tag
			const colorTag = node.querySelector(".color-tag");
			colorTag.style.background = PRIORITY_COLORS[task.priority || 3];
			
			saveTasks(tasks);
			
			// If sort is by priority, we need a full re-render to reorder tasks
			if (sortBy === "priority") {
				window.dispatchEvent(new CustomEvent('tasksChanged'));
			}
		}
	});

	const lengthInput = node.querySelector(".task-length");
	lengthInput.value = task.length ? formatMinutes(task.length) : "";
	lengthInput.addEventListener("change", () => {
		const newLength = parseTimeToMinutes(lengthInput.value);
		
		// Only update if length actually changed
		if (newLength !== task.length) {
			task.length = newLength;
			
			// Update length display without full re-render
			const lengthDisplay = node.querySelector(".length-display");
			if (task.length) {
				lengthDisplay.innerHTML = `<strong>Est.</strong> ${formatMinutes(task.length)}`;
			} else {
				lengthDisplay.textContent = "";
			}
			
			// Update compact info
			const compactInfo = node.querySelector(".task-compact-info");
			updateCompactInfo(task, compactInfo, overdue);
			
			saveTasks(tasks);
			// No need to dispatch tasksChanged event as we've updated the UI inline
		}
	});

	const repeatCheckboxes = node.querySelectorAll(".repeat-checkbox");
	repeatCheckboxes.forEach(checkbox => {
		checkbox.checked = task.repeatDays && task.repeatDays.includes(checkbox.value);
		checkbox.addEventListener("change", () => {
			const checkedDays = Array.from(repeatCheckboxes)
				.filter(cb => cb.checked)
				.map(cb => cb.value);
			
			// Check if days actually changed to avoid unnecessary updates
			const oldDays = task.repeatDays || [];
			const daysChanged = 
				oldDays.length !== checkedDays.length || 
				oldDays.some(day => !checkedDays.includes(day)) ||
				checkedDays.some(day => !oldDays.includes(day));
			
			if (daysChanged) {
				task.repeatDays = checkedDays;
				
				// Update the repeat display without re-rendering the whole task
				const repeatDisplay = node.querySelector(".repeat-display");
				if (task.repeatDays.length > 0) {
					const dayLabel = task.repeatDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
					repeatDisplay.innerHTML = `<strong>🔄 Every ${dayLabel}</strong>`;
				} else {
					repeatDisplay.textContent = "";
				}
				
				// Update the compact info without full re-render
				const compactInfo = node.querySelector(".task-compact-info");
				if (compactInfo) {
					updateCompactInfo(task, compactInfo, overdue);
				}
				
				// Move repeating tasks to "ideas" lane only if needed
				if (task.repeatDays.length > 0 && task.lane !== "ideas") {
					task.lane = "ideas";
					task.order = nextLaneOrder(tasks, "ideas");
					rebalanceLaneOrder(tasks);
					
					// This requires a full board re-render due to lane change
					saveTasks(tasks);
					window.dispatchEvent(new CustomEvent('tasksChanged'));
				} else {
					// Just save the changes without re-rendering
					saveTasks(tasks);
				}
			}
		});
	});

	node.querySelector(".flip-lane").addEventListener("click", () => {
		const nextLane = task.lane === "immediate" ? "later" : "immediate";
		task.lane = nextLane;
		task.completed = false;
		task.completedAt = "";
		task.order = nextLaneOrder(tasks, nextLane);
		rebalanceLaneOrder(tasks);
		saveTasks(tasks);
		window.dispatchEvent(new CustomEvent('tasksChanged'));
	});
	
	// Add delete button functionality for active tasks
	const deleteButton = node.querySelector(".delete-task");
	if (deleteButton) {
		deleteButton.addEventListener("click", () => {
			if (confirm("Are you sure you want to permanently delete this task?")) {
				// If this is an uncompleted repeating task instance, decrement the streak
				if (task.isRepeatingInstance && !task.completed && task.repeatSourceId) {
					const sourceTemplate = tasks.find(t => t.id === task.repeatSourceId);
					if (sourceTemplate && sourceTemplate.streak > 0) {
						sourceTemplate.streak--;
					}
				}

				const index = tasks.findIndex(t => t.id === task.id);
				if (index !== -1) {
					tasks.splice(index, 1);
					saveTasks(tasks);
					window.dispatchEvent(new CustomEvent('tasksChanged'));
					window.dispatchEvent(new CustomEvent('filtersChanged'));
				}
			}
		});
	}

	// Subtasks functionality
	renderSubtasksSection(node, task, tasks);

	node.addEventListener("dragstart", (event) => {
		event.dataTransfer.setData("text/plain", task.id);
		requestAnimationFrame(() => node.classList.add("dragging"));
	});

	node.addEventListener("dragend", () => {
		node.classList.remove("dragging");
	});

	return node;
}

function renderSubtasksSection(node, task, tasks) {
	const subtasksList = node.querySelector(".subtasks-list");
	const subtaskInput = node.querySelector(".subtask-input");
	const addSubtaskBtn = node.querySelector(".add-subtask-btn");
	const subtasksProgress = node.querySelector(".subtasks-progress");

	function renderSubtasks() {
		subtasksList.innerHTML = "";
		if (!task.subtasks || task.subtasks.length === 0) {
			subtasksProgress.textContent = "";
			return;
		}

		const completed = task.subtasks.filter(st => st.completed).length;
		const total = task.subtasks.length;
		
		// Calculate time summary
		const allHaveTime = task.subtasks.every(st => st.time);
		let progressText = `${completed}/${total} completed`;
		
		if (allHaveTime) {
			const totalTime = task.subtasks.reduce((sum, st) => sum + (st.time || 0), 0);
			progressText += ` • ${formatMinutes(totalTime)} total`;
			// Auto-update task length from subtasks
			if (task.length !== totalTime) {
				task.length = totalTime;
				saveTasks(tasks);
				// Update the length display
				const lengthDisplay = node.querySelector(".length-display");
				if (lengthDisplay) {
					lengthDisplay.innerHTML = `<strong>Est.</strong> ${formatMinutes(task.length)}`;
				}
				const lengthInput = node.querySelector(".task-length");
				if (lengthInput) {
					lengthInput.value = formatMinutes(task.length);
				}
			}
		}
		
		subtasksProgress.textContent = progressText;

		task.subtasks.forEach((subtask, index) => {
			const item = document.createElement("div");
			item.className = `subtask-item ${subtask.completed ? "completed" : ""}`;
			item.draggable = true;
			item.dataset.subtaskIndex = index;

			// Drag handle
			const dragHandle = document.createElement("span");
			dragHandle.className = "subtask-drag-handle";
			dragHandle.textContent = "⋮⋮";

			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.checked = subtask.completed;
			checkbox.addEventListener("change", () => {
				subtask.completed = checkbox.checked;
				saveTasks(tasks);
				renderSubtasks();
			});

			const label = document.createElement("label");
			label.textContent = subtask.title;
			label.addEventListener("click", (e) => {
				e.preventDefault();
				checkbox.checked = !checkbox.checked;
				subtask.completed = checkbox.checked;
				saveTasks(tasks);
				renderSubtasks();
			});

			const timeInput = document.createElement("input");
			timeInput.type = "text";
			timeInput.placeholder = "time";
			timeInput.value = subtask.time ? formatMinutes(subtask.time) : "";
			timeInput.addEventListener("change", () => {
				subtask.time = parseTimeToMinutes(timeInput.value);
				saveTasks(tasks);
				renderSubtasks();
			});
			timeInput.addEventListener("click", (e) => {
				e.stopPropagation();
			});

			const promoteBtn = document.createElement("button");
			promoteBtn.type = "button";
			promoteBtn.className = "promote-subtask-btn";
			promoteBtn.textContent = "↗";
			promoteBtn.title = "Promote to task";
			promoteBtn.addEventListener("click", () => {
				// Create new task from subtask, copying parent task settings
				const newTask = {
					id: crypto.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
					title: subtask.title,
					description: "",
					dueDate: task.dueDate,
					type: task.type,
					priority: task.priority,
					length: subtask.time || 0,
					lane: task.lane,
					createdAt: new Date().toISOString(),
					completed: false,
					completedAt: "",
					order: nextLaneOrder(tasks, task.lane),
					repeatDays: [],
					isRepeatingInstance: false,
					repeatSourceId: "",
					subtasks: [],
					modifiedAt: new Date().toISOString()
				};
				tasks.push(newTask);
				// Remove subtask from current task
				task.subtasks.splice(index, 1);
				saveTasks(tasks);
				window.dispatchEvent(new CustomEvent('tasksChanged'));
			});

			const deleteBtn = document.createElement("button");
			deleteBtn.type = "button";
			deleteBtn.className = "delete-subtask-btn";
			deleteBtn.textContent = "×";
			deleteBtn.addEventListener("click", () => {
				task.subtasks.splice(index, 1);
				saveTasks(tasks);
				renderSubtasks();
			});

			// Drag event handlers
			item.addEventListener("dragstart", (e) => {
				e.stopPropagation(); // Prevent parent task from being dragged
				e.dataTransfer.effectAllowed = "move";
				// Store both subtask index and task ID for potential promotion
				e.dataTransfer.setData("text/plain", JSON.stringify({
					type: "subtask",
					taskId: task.id,
					subtaskIndex: index
				}));
				item.classList.add("dragging-subtask");
			});

			item.addEventListener("dragend", () => {
				item.classList.remove("dragging-subtask");
			});

			item.addEventListener("dragover", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const draggingItem = subtasksList.querySelector(".dragging-subtask");
				if (draggingItem && draggingItem !== item) {
					const rect = item.getBoundingClientRect();
					const midpoint = rect.top + rect.height / 2;
					if (e.clientY < midpoint) {
						item.parentNode.insertBefore(draggingItem, item);
					} else {
						item.parentNode.insertBefore(draggingItem, item.nextSibling);
					}
				}
			});

			item.addEventListener("drop", (e) => {
				e.preventDefault();
				e.stopPropagation();
				try {
					const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
					if (dragData.type === "subtask" && dragData.taskId === task.id) {
						// Reordering within same task
						const fromIndex = dragData.subtaskIndex;
						const toIndex = parseInt(item.dataset.subtaskIndex);

						if (fromIndex !== toIndex) {
							const [movedSubtask] = task.subtasks.splice(fromIndex, 1);
							task.subtasks.splice(toIndex, 0, movedSubtask);
							saveTasks(tasks);
							renderSubtasks();
						}
					}
				} catch (error) {
					// Old format or invalid data, ignore
				}
			});

			item.appendChild(dragHandle);
			item.appendChild(checkbox);
			item.appendChild(label);
			item.appendChild(timeInput);
			item.appendChild(promoteBtn);
			item.appendChild(deleteBtn);
			subtasksList.appendChild(item);
		});
	}

	function addSubtask() {
		const title = subtaskInput.value.trim();
		if (!title) return;

		if (!task.subtasks) task.subtasks = [];
		task.subtasks.push({
			id: crypto.randomUUID?.() || `subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`,
			title: title,
			completed: false
		});

		subtaskInput.value = "";
		saveTasks(tasks);
		renderSubtasks();
	}

	addSubtaskBtn.addEventListener("click", addSubtask);
	subtaskInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addSubtask();
		}
	});

	renderSubtasks();
}

function hydrateFilterChips(tasks, filtersSection, colorFilters, excludedFilters) {
	const uniqueTypes = new Set(tasks.map((task) => task.type).filter(t => t));
	uniqueTypes.forEach((type) => {
		const color = getTypeColor(type);
		if (colorFilters.has(color)) {
			// Update existing chip state
			const chip = colorFilters.get(color);
			if (excludedFilters.has(color)) {
				chip.classList.add("excluded");
			} else {
				chip.classList.remove("excluded");
			}
			return;
		}
		const chip = document.createElement("button");
		chip.type = "button";
		chip.dataset.filter = color;
		chip.dataset.type = type;
		chip.className = "filter-chip";
		chip.title = "Click to focus; right-click or ctrl+click to hide; click 📋 to copy";
		chip.innerHTML = `<span class="filter-chip-content">
			<span class="filter-chip-dot" style="background:${color};"></span>
			<span class="filter-chip-label">${type}</span>
			<span class="filter-chip-copy" title="Copy ${type} tasks">📋</span>
		</span>`;
		
		filtersSection.appendChild(chip);
		colorFilters.set(color, chip);
	});

	// Add copy functionality to all chips (both new and existing)
	colorFilters.forEach((chip, color) => {
		const type = chip.dataset.type;
		const copyIcon = chip.querySelector('.filter-chip-copy');
		if (copyIcon && !copyIcon.dataset.listenerAttached) {
			copyIcon.dataset.listenerAttached = 'true';
			copyIcon.addEventListener('click', async (event) => {
				event.stopPropagation();
				event.preventDefault();
				
				const typeTasks = tasks.filter(t => !t.completed && t.type === type);
				const json = JSON.stringify(typeTasks, null, 2);
				const copied = await copyTextToClipboard(json);
				
				if (copied) {
					const originalContent = copyIcon.textContent;
					copyIcon.textContent = '✓';
					copyIcon.style.color = '#22c55e';
					setTimeout(() => {
						copyIcon.textContent = originalContent;
						copyIcon.style.color = '';
					}, 1400);
				} else {
					if (typeof globalThis.alert === "function") {
						globalThis.alert("Could not copy tasks to clipboard.");
					}
				}
			});
		}
	});

	const usedColors = new Set([...uniqueTypes].map(type => getTypeColor(type)));
	[...colorFilters.entries()].forEach(([color, chip]) => {
		if (!usedColors.has(color)) {
			chip.remove();
			colorFilters.delete(color);
		}
	});
}

// Completion sound effect
function playCompletionSound() {
	try {
		const audioContext = new (window.AudioContext || window.webkitAudioContext)();
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		// Create a pleasant "ding" sound
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

		gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

		oscillator.start(audioContext.currentTime);
		oscillator.stop(audioContext.currentTime + 0.3);
	} catch (error) {
		console.log('Audio not available:', error);
	}
}

// Show completion modal
function showCompletionModal(task, tasks) {
	const modal = document.getElementById('completion-modal');
	const actualTimeInput = document.getElementById('actual-time-input');
	const estimatedTimeHint = modal.querySelector('.estimated-time-hint');
	const saveButton = document.getElementById('save-actual-time');
	const skipButton = document.getElementById('skip-time-tracking');

	// Show estimated time if available
	if (task.length) {
		estimatedTimeHint.textContent = `Estimated: ${formatMinutes(task.length)}`;
		actualTimeInput.value = formatMinutes(task.length);
	} else {
		estimatedTimeHint.textContent = '';
		actualTimeInput.value = '';
	}

	modal.classList.add('show');
	actualTimeInput.focus();
	actualTimeInput.select();

	// Handle save
	const handleSave = () => {
		const actualTime = parseTimeToMinutes(actualTimeInput.value);
		if (actualTime) {
			task.actualTime = actualTime;
		}
		closeModal();
		finishTaskCompletion(tasks);
	};

	// Handle skip
	const handleSkip = () => {
		closeModal();
		finishTaskCompletion(tasks);
	};

	// Handle enter key
	const handleEnter = (e) => {
		if (e.key === 'Enter') {
			handleSave();
		} else if (e.key === 'Escape') {
			handleSkip();
		}
	};

	// Close modal
	const closeModal = () => {
		modal.classList.remove('show');
		saveButton.removeEventListener('click', handleSave);
		skipButton.removeEventListener('click', handleSkip);
		actualTimeInput.removeEventListener('keydown', handleEnter);
	};

	// Attach event listeners
	saveButton.addEventListener('click', handleSave);
	skipButton.addEventListener('click', handleSkip);
	actualTimeInput.addEventListener('keydown', handleEnter);

	// Close on background click
	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			handleSkip();
		}
	});
}

// Finish task completion after modal
function finishTaskCompletion(tasks) {
	rebalanceLaneOrder(tasks);
	saveTasks(tasks);
	window.dispatchEvent(new CustomEvent('tasksChanged'));
}
