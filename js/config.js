// Configuration and constants
const STORAGE_KEY = "localPriorityNotes.tasks";
const SORT_STORAGE_KEY = "localPriorityNotes.sortBy";
const FILTER_ACTIVE_KEY = "localPriorityNotes.activeFilter";
const FILTER_EXCLUDED_KEY = "localPriorityNotes.excludedFilters";
const EXPANDED_TASKS_KEY = "localPriorityNotes.expandedTasks";

const COLOR_PALETTE = [
	{ value: "#94a3b8", label: "General", icon: "📋" },
	{ value: "#f87171", label: "University", icon: "🎓" },
	{ value: "#facc15", label: "Work", icon: "💼" },
	{ value: "#60a5fa", label: "Prakeiktas akmuo", icon: "💻" },
	{ value: "#a78bfa", label: "Buisiness", icon: "📊" },
	{ value: "#f97316", label: "Personal", icon: "👤" },
	{ value: "#fb923c", label: "Fun", icon: "🎉" },
	{ value: "#20c997", label: "Mstewarts Development", icon: "🔧" }
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
	default: "",                           // No specific color for tasks with more than 7 days or no deadline
	week: "rgba(147, 197, 253, 0.30)",     // 7-5 days remaining - subtle light blue
	fewDays: "rgba(147, 197, 253, 0.55)",  // 4-3 days remaining - medium blue
	soon: "rgba(192, 132, 252, 0.50)",     // 2-1 days remaining - purple (bridge between blue and red)
	today: "rgba(251, 146, 60, 0.60)",     // Due today - orange (warm urgency)
	overdue: "rgba(239, 68, 68, 0.75)"     // Overdue - red (maximum urgency)
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
