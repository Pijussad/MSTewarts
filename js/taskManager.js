// Task management operations

function migrateTaskData(tasks) {
	tasks.forEach((task) => {
		// Migrate old color-based system to type-based system
		if (task.color && !task.type) {
			const entry = COLOR_PALETTE.find(e => e.value === task.color);
			task.type = entry ? entry.label : "";
			delete task.color;
		}
		if (task.type === undefined) task.type = "";
		if (task.priority === undefined) task.priority = 3;
		if (task.order === undefined) task.order = null;
		if (task.completedAt === undefined) task.completedAt = task.completed ? task.createdAt : "";
		// Migrate old single repeatDay to array format
		if (task.repeatDay !== undefined && typeof task.repeatDay === "string") {
			task.repeatDays = task.repeatDay ? [task.repeatDay] : [];
			delete task.repeatDay;
		}
		if (task.repeatDays === undefined) task.repeatDays = [];
		if (task.isRepeatingInstance === undefined) task.isRepeatingInstance = false;
		if (task.repeatSourceId === undefined) task.repeatSourceId = "";
		if (task.subtasks === undefined) task.subtasks = [];
		// Add modifiedAt field for merge tracking
		if (task.modifiedAt === undefined) task.modifiedAt = task.createdAt;
		// Add time field to existing subtasks
		if (task.subtasks) {
			task.subtasks.forEach(st => {
				if (st.time === undefined) st.time = "";
				st.time = parseTimeToMinutes(st.time);
			});
		}
		task.length = parseTimeToMinutes(task.length);
	});
}

function nextLaneOrder(tasks, lane) {
	const laneTasks = tasks.filter((task) => task.lane === lane && !task.completed);
	if (!laneTasks.length) return 0;
	return Math.max(...laneTasks.map((task) => task.order ?? 0)) + 1;
}

function rebalanceLaneOrder(tasks) {
	["immediate", "later", "ideas"].forEach((lane) => {
		const laneTasks = tasks
			.filter((task) => task.lane === lane && !task.completed)
			.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

		laneTasks.forEach((task, index) => {
			task.order = index;
		});
	});
}

function checkRepeatingTasks(tasks) {
	const today = new Date();
	const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
	const todayStr = today.toISOString().slice(0, 10);
	let needsRender = false;
	
	// Move overdue recurring instances back to "Later" lane
	const overdueInstances = tasks.filter(t => 
		t.isRepeatingInstance && 
		t.lane === "immediate" && 
		!t.completed &&
		t.dueDate &&
		t.dueDate < todayStr
	);
	
	overdueInstances.forEach(instance => {
		instance.lane = "later";
		instance.order = nextLaneOrder(tasks, "later");
		needsRender = true;
	});
	
	if (overdueInstances.length > 0) {
		rebalanceLaneOrder(tasks);
	}
	
	// Find all repeating task templates (not instances)
	const repeatingTemplates = tasks.filter(t => t.repeatDays && t.repeatDays.length > 0 && !t.isRepeatingInstance);
	
	repeatingTemplates.forEach(template => {
		if (template.repeatDays.includes(dayOfWeek)) {
			// Check if we already created an instance today
			const existsToday = tasks.some(t => 
				t.isRepeatingInstance && 
				t.repeatSourceId === template.id && 
				t.createdAt.slice(0, 10) === todayStr
			);
			
			if (!existsToday) {
				// Create a new instance in "immediate" lane at the bottom
				const immediateOrder = nextLaneOrder(tasks, "immediate");
				const now = new Date().toISOString();
				tasks.push({
					id: crypto.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
					title: template.title,
					description: template.description,
					dueDate: todayStr,
					type: template.type,
					priority: template.priority,
					length: template.length,
					lane: "immediate",
					createdAt: now,
					completed: false,
					completedAt: "",
					order: immediateOrder,
					repeatDays: [],
					isRepeatingInstance: true,
					repeatSourceId: template.id,
					subtasks: JSON.parse(JSON.stringify(template.subtasks || [])),
					modifiedAt: now
				});
				needsRender = true;
			}
		}
	});
	
	return needsRender;
}

function prioritySort(sortBy) {
	return function(a, b) {
		// Always put repeating task templates at the bottom
		const aIsTemplate = a.repeatDays && a.repeatDays.length > 0 && !a.isRepeatingInstance;
		const bIsTemplate = b.repeatDays && b.repeatDays.length > 0 && !b.isRepeatingInstance;
		
		if (aIsTemplate && !bIsTemplate) return 1;  // a goes to bottom
		if (!aIsTemplate && bIsTemplate) return -1; // b goes to bottom
		
		// Both are templates or both are regular tasks - apply normal sorting
		if (sortBy === "custom") {
			return (a.order ?? 0) - (b.order ?? 0);
		}
		
		if (sortBy === "priority") {
			// Calculate urgency weight based on due date proximity and priority level
			const urgencyWeight = (task) => {
				if (!task.dueDate || task.completed) return 0;
				
				const priorityLevel = task.priority || 3;
				// Get priority boost factor - lower priority tasks (higher number) get more urgency boost
				// This helps low priority tasks rise more significantly as deadline approaches
				const priorityBoostFactor = priorityLevel >= 4 ? 1.4 : // Low priority tasks get 40% more boost
									        priorityLevel === 3 ? 1.2 : // Medium priority tasks get 20% more boost
									        priorityLevel === 2 ? 1.0 : // High priority tasks get standard boost
									        0.8; // Critical tasks get less boost since they're already top priority
				
				// Overdue tasks get maximum urgency
				if (isPastDue(task.dueDate)) {
					return URGENCY_WEIGHTS.overdue * priorityBoostFactor;
				}
				
				// For tasks with due dates, calculate days until due
				const daysUntilDue = getDaysUntilDue(task.dueDate);
				
				// No urgency boost for tasks due more than 14 days away
				if (daysUntilDue > 14) return URGENCY_WEIGHTS.future;
				
				let baseUrgency;
				// Exponential urgency increase as deadline approaches
				if (daysUntilDue === 0) {
					baseUrgency = URGENCY_WEIGHTS.today;
				} else if (daysUntilDue <= 3) {
					// Steeper curve for 1-3 days away
					baseUrgency = URGENCY_WEIGHTS.threeDays + ((3 - daysUntilDue) * 0.17);
				} else if (daysUntilDue <= 7) {
					// Enhanced boost for 4-7 days away
					baseUrgency = URGENCY_WEIGHTS.week + ((7 - daysUntilDue) * 0.12);
				} else {
					// Enhanced boost for 8-14 days away too
					baseUrgency = URGENCY_WEIGHTS.twoWeeks + ((14 - daysUntilDue) * 0.05);
				}
				
				// Apply priority-based boost factor
				return baseUrgency * priorityBoostFactor;
			};
			
			// Apply urgency weight to priority
			const effectivePriorityA = a.priority - urgencyWeight(a);
			const effectivePriorityB = b.priority - urgencyWeight(b);
			
			// Use effective priority for sorting
			return effectivePriorityA - effectivePriorityB;
			
			// Note: We've removed the fallback to regular priority since we want 
			// the deadline urgency to have a more significant impact on sorting

			const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
			const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
			if (dateA !== dateB) return dateA - dateB;
			return (a.order ?? 0) - (b.order ?? 0);
		} else if (sortBy === "dueDate") {
			const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
			const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
			if (dateA !== dateB) return dateA - dateB;
			return (a.order ?? 0) - (b.order ?? 0);
		} else if (sortBy === "created") {
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		}
		return (a.order ?? 0) - (b.order ?? 0);
	};
}

function mergeTasks(existingTasks, importedTasks) {
	const result = {
		merged: [],
		added: 0,
		updated: 0,
		unchanged: 0
	};
	
	// Create a map of existing tasks by ID
	const existingMap = new Map();
	existingTasks.forEach(task => {
		existingMap.set(task.id, task);
	});
	
	// Process imported tasks
	importedTasks.forEach(importedTask => {
		const existing = existingMap.get(importedTask.id);
		
		if (!existing) {
			// New task - add it
			result.merged.push(importedTask);
			result.added++;
		} else {
			// Task exists - compare modification dates
			const existingDate = new Date(existing.modifiedAt || existing.createdAt).getTime();
			const importedDate = new Date(importedTask.modifiedAt || importedTask.createdAt).getTime();
			
			if (importedDate > existingDate) {
				// Imported version is newer - use it
				result.merged.push(importedTask);
				result.updated++;
			} else {
				// Existing version is newer or same - keep it
				result.merged.push(existing);
				result.unchanged++;
			}
			
			// Mark as processed
			existingMap.delete(importedTask.id);
		}
	});
	
	// Add remaining existing tasks that weren't in the import
	existingMap.forEach(task => {
		result.merged.push(task);
	});
	
	return result;
}

function sanitizeImportedTasks(list) {
	return list
		.map((task) => {
			// Handle old color-based format
			let type = task.type || "";
			if (!type && task.color) {
				const entry = COLOR_PALETTE.find(e => e.value === task.color);
				type = entry ? entry.label : "";
			}
			
			return {
				id: String(task.id || "").trim() || crypto.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
				title: String(task.title || "").trim(),
				description: String(task.description || "").trim(),
				dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
				type: type,
				priority: typeof task.priority === "number" ? task.priority : 3,
				length: task.length || "",
				lane: (task.lane === "later" || task.lane === "ideas") ? task.lane : "immediate",
				createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
				completed: Boolean(task.completed),
				completedAt: typeof task.completedAt === "string" ? task.completedAt : "",
				order: typeof task.order === "number" ? task.order : 0,
				repeatDays: Array.isArray(task.repeatDays) ? task.repeatDays : (task.repeatDay ? [task.repeatDay] : []),
				isRepeatingInstance: Boolean(task.isRepeatingInstance),
				repeatSourceId: typeof task.repeatSourceId === "string" ? task.repeatSourceId : "",
				subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
				modifiedAt: typeof task.modifiedAt === "string" ? task.modifiedAt : (typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString())
			};
		})
		.filter((task) => task.title);
}
