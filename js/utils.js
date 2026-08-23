// utils.js
// Small, boring helper functions used everywhere else.
// Keeping these in one place means the rest of the app doesn't
// need to know HOW to format a date, make an id, etc.

window.HeroOS = window.HeroOS || {};

HeroOS.utils = {
  // Generates a short unique id, e.g. "m_l3f9k2a1"
  uid(prefix) {
    const random = Math.random().toString(36).slice(2, 9);
    return (prefix ? prefix + '_' : '') + Date.now().toString(36) + random;
  },

  nowISO() {
    return new Date().toISOString();
  },

  // "Sunday, August 23"
  formatDateLong(date) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  },

  // "3:45 PM"
  formatTime(date) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  },

  // Formats a yyyy-mm-dd due date string into something readable,
  // and flags overdue/today for styling.
  describeDueDate(dueDateStr) {
    if (!dueDateStr) return { text: 'No due date', state: 'none' };
    const due = new Date(dueDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / 86400000);

    const text = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (diffDays < 0) return { text: `${text} (overdue)`, state: 'overdue' };
    if (diffDays === 0) return { text: `${text} (today)`, state: 'today' };
    if (diffDays === 1) return { text: `${text} (tomorrow)`, state: 'soon' };
    return { text, state: 'future' };
  },

  // Same as describeDueDate, but appends a time if one is set.
  // Used anywhere a mission's due date is shown to the user.
  describeDueDateTime(dueDateStr, dueTimeStr) {
    const base = HeroOS.utils.describeDueDate(dueDateStr);
    if (!dueTimeStr) return base;
    const [h, m] = dueTimeStr.split(':').map(Number);
    const asDate = new Date();
    asDate.setHours(h, m, 0, 0);
    const timeText = HeroOS.utils.formatTime(asDate);
    // Insert the time before the trailing "(today)"/"(overdue)" tag, if any.
    const match = base.text.match(/^(.*?)( \(.+\))?$/);
    const text = match ? `${match[1]}, ${timeText}${match[2] || ''}` : `${base.text}, ${timeText}`;
    return { text, state: base.state };
  },

  // Sortable key combining date + time. A mission with no specific time
  // is treated as "due by end of day" so a same-day timed mission (e.g.
  // a 10am lecture) still sorts ahead of it. Undated missions sort last.
  dueSortKey(dueDateStr, dueTimeStr) {
    return `${dueDateStr || '9999-99-99'}T${dueTimeStr || '23:59'}`;
  },

  // Formats a "HH:MM" 24-hour string (e.g. from <input type="time">)
  // into a readable local time like "2:30 PM".
  formatHHMM(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return HeroOS.utils.formatTime(d);
  },

  isToday(dueDateStr) {
    if (!dueDateStr) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dueDateStr === today;
  },

  todayStr() {
    return new Date().toISOString().slice(0, 10);
  },

  // Prevents user-entered text from being interpreted as HTML.
  // We build a lot of UI with template strings + innerHTML, so this
  // is the one thing that keeps that safe.
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  },

  // Splits "one, two, three" into ["one","two","three"], trimmed, no empties.
  parseTags(str) {
    if (!str) return [];
    return str
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  },
};
