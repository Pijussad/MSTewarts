// Configuration and constants
const STORAGE_KEY = "localPriorityNotes.tasks";
const SORT_STORAGE_KEY = "localPriorityNotes.sortBy";
const FILTER_ACTIVE_KEY = "localPriorityNotes.activeFilter";
const FILTER_EXCLUDED_KEY = "localPriorityNotes.excludedFilters";
const EXPANDED_TASKS_KEY = "localPriorityNotes.expandedTasks";

const COLOR_PALETTE = [
	{ value: "#94a3b8", label: "General", icon: "📋" },
	{ value: "#4ecdc4", label: "Home", icon: "🏠" },
	{ value: "#f87171", label: "University", icon: "🎓" },
	{ value: "#facc15", label: "Work", icon: "💼" },
	{ value: "#60a5fa", label: "Work 2", icon: "💻" },
	{ value: "#a78bfa", label: "Work 3", icon: "📊" },
	{ value: "#f97316", label: "Personal", icon: "👤" },
	{ value: "#34d399", label: "Health", icon: "💚" },
	{ value: "#f472b6", label: "Social", icon: "👥" },
	{ value: "#faccf7", label: "Other", icon: "✨" },
	{ value: "#fb923c", label: "Fun", icon: "🎉" },
	{ value: "#20c997", label: "mstewarts development", icon: "🔧" }
];

const PRIORITY_LABELS = {
	1: "🔴 Critical",
	2: "🟠 High",
	3: "🟡 Medium",
	4: "🟢 Low"
};

const PRIORITY_COLORS = {
	1: "#EF4444", // Red
	2: "#F97316", // Orange
	3: "#FACC15", // Yellow
	4: "#34D399"  // Green
};

const DAY_ABBREVIATIONS = {
	monday: 'Mon',
	tuesday: 'Tue',
	wednesday: 'Wed',
	thursday: 'Thu',
	friday: 'Fri',
	saturday: 'Sat',
	sunday: 'Sun'
};

// Deadline color gradient (from one week away to overdue)
// Colors are highly saturated for optimal text contrast
const DEADLINE_COLORS = {
	default: "",                 // No specific color for tasks with more than 7 days or no deadline
	week: "rgba(147, 197, 253, 0.85)",     // 7-5 days remaining - light blue (high opacity)
	fewDays: "rgba(192, 132, 252, 0.75)",  // 4-3 days remaining - light purple (high opacity)
	soon: "rgba(168, 85, 247, 0.65)",      // 2-1 days remaining - medium purple (high opacity)
	today: "rgba(168, 85, 247, 0.80)",     // Due today - strong purple (very high opacity)
	overdue: "rgba(239, 68, 68, 0.70)"     // Overdue - red with high opacity for urgency
};

// Deadline urgency weights for priority sorting
const URGENCY_WEIGHTS = {
	overdue: 2.5,       // Overdue tasks get highest priority boost (can jump 2+ priority levels)
	today: 2.0,         // Due today (can jump 1-2 priority levels)
	threeDays: 1.5,     // 1-3 days away (can jump ~1 priority level)
	week: 0.7,          // 4-7 days away (significant boost, but less than priority level)
	twoWeeks: 0.3,      // 8-14 days away (moderate boost)
	future: 0           // More than 2 weeks away
};
