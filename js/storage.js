// Storage operations

function loadTasks() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed;
	} catch (error) {
		console.warn("Could not read saved tasks:", error);
		return [];
	}
}

function saveTasks(tasks) {
	// Update modifiedAt timestamp for all tasks
	tasks.forEach(task => {
		task.modifiedAt = new Date().toISOString();
	});
	localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadSortPreference() {
	return localStorage.getItem(SORT_STORAGE_KEY) || "priority";
}

function saveSortPreference(sortBy) {
	localStorage.setItem(SORT_STORAGE_KEY, sortBy);
}

function loadFilterPreferences() {
	const active = localStorage.getItem(FILTER_ACTIVE_KEY) || "all";
	let excluded = [];
	try {
		const raw = localStorage.getItem(FILTER_EXCLUDED_KEY);
		excluded = raw ? JSON.parse(raw) : [];
		if (!Array.isArray(excluded)) excluded = [];
	} catch (error) {
		console.warn("Could not read filter preferences:", error);
		excluded = [];
	}
	return { active, excluded };
}

function saveFilterPreferences(activeFilter, excludedSet) {
	localStorage.setItem(FILTER_ACTIVE_KEY, activeFilter);
	localStorage.setItem(FILTER_EXCLUDED_KEY, JSON.stringify(Array.from(excludedSet)));
}

function loadExpandedTasks() {
	try {
		const raw = localStorage.getItem(EXPANDED_TASKS_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed);
	} catch (error) {
		console.warn("Could not read expanded tasks:", error);
		return new Set();
	}
}

function saveExpandedTasks(expandedSet) {
	localStorage.setItem(EXPANDED_TASKS_KEY, JSON.stringify(Array.from(expandedSet)));
}
