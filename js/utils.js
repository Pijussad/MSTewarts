// Utility functions

// Parse time input to minutes (typo-resistant)
function parseTimeToMinutes(input) {
	if (!input) return "";
	const str = String(input).toLowerCase().trim();
	
	// If it's already a number, treat as minutes
	const justNumber = parseInt(str, 10);
	if (!isNaN(justNumber) && str === String(justNumber)) {
		return justNumber > 0 ? justNumber : "";
	}
	
	let totalMinutes = 0;
	
	// Match patterns like "2h 30m", "2 h 30 min", "2hours 30minutes", etc.
	const hourMatch = str.match(/(\d+)\s*h(?:ou?r?s?)?/i);
	const minMatch = str.match(/(\d+)\s*m(?:in?s?)?/i);
	
	if (hourMatch) {
		totalMinutes += parseInt(hourMatch[1], 10) * 60;
	}
	if (minMatch) {
		totalMinutes += parseInt(minMatch[1], 10);
	}
	
	return totalMinutes > 0 ? totalMinutes : "";
}

// Format minutes for display
function formatMinutes(minutes) {
	if (!minutes) return "";
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	
	if (hours > 0 && mins > 0) {
		return `${hours}h ${mins}min`;
	} else if (hours > 0) {
		return `${hours}h`;
	} else {
		return `${mins}min`;
	}
}

function getTypeColor(typeLabel) {
	if (!typeLabel) return "";
	const entry = COLOR_PALETTE.find(e => e.label === typeLabel);
	return entry ? entry.value : "";
}

function getTypeIcon(typeLabel) {
	if (!typeLabel) return "📁";
	const entry = COLOR_PALETTE.find(e => e.label === typeLabel);
	return entry && entry.icon ? entry.icon : "📁";
}

function isPastDue(isoDate) {
	const endOfDay = new Date(isoDate + "T23:59:59");
	const now = new Date();
	return endOfDay.getTime() < now.getTime();
}

function getDaysUntilDue(isoDate) {
	if (!isoDate) return null; // No due date

	const today = new Date();
	today.setHours(0, 0, 0, 0); // Start of today
	
	const dueDate = new Date(isoDate + "T00:00:00");
	
	// Calculate the difference in days
	const diffTime = dueDate.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	
	return diffDays;
}

function getDeadlineColor(isoDate) {
	if (!isoDate) return DEADLINE_COLORS.default;
	
	const daysRemaining = getDaysUntilDue(isoDate);
	
	if (daysRemaining < 0) {
		return DEADLINE_COLORS.overdue; // Overdue
	} else if (daysRemaining === 0) {
		return DEADLINE_COLORS.today; // Due today
	} else if (daysRemaining <= 2) {
		return DEADLINE_COLORS.soon; // Due in 1-2 days
	} else if (daysRemaining <= 4) {
		return DEADLINE_COLORS.fewDays; // Due in 3-4 days
	} else if (daysRemaining <= 7) {
		return DEADLINE_COLORS.week; // Due in 5-7 days
	}
	
	return DEADLINE_COLORS.default; // More than a week away
}

function formatDate(isoDate) {
	const date = isoDate && isoDate.includes("T") ? new Date(isoDate) : new Date(isoDate + "T00:00:00");
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric"
	});
}

function getDragAfterElement(container, y) {
	const draggableElements = [...container.querySelectorAll(".task-card:not(.dragging)")];

	return draggableElements.reduce((closest, child) => {
		const box = child.getBoundingClientRect();
		const offset = y - box.top - box.height / 2;

		if (offset < 0 && offset > closest.offset) {
			return { offset: offset, element: child };
		} else {
			return closest;
		}
	}, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function copyTextToClipboard(text) {
	if (typeof text !== "string" || !text.length) return false;

	if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (error) {
			// Fallback below
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "readonly");
	textarea.style.position = "absolute";
	textarea.style.left = "-9999px";
	document.body.appendChild(textarea);
	textarea.select();
	textarea.setSelectionRange(0, textarea.value.length);

	let success = false;
	try {
		success = document.execCommand ? document.execCommand("copy") : false;
	} catch (error) {
		success = false;
	}

	document.body.removeChild(textarea);
	return success;
}

function flashCopyFeedback(button, successText = "Copied!") {
	if (!button) return;
	const original = button.dataset.originalLabel ?? button.textContent;
	if (!button.dataset.originalLabel) {
		button.dataset.originalLabel = original;
	}
	button.textContent = successText;
	button.disabled = true;
	window.setTimeout(() => {
		button.textContent = button.dataset.originalLabel;
		button.disabled = false;
	}, 1400);
}
