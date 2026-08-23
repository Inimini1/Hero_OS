// views/briefing.js
// A read-only summary, built entirely from data owned by other views.
// Future: this is the natural place to plug in calendar data, or to
// have JARVIS read this out loud through the Meta glasses' speakers.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.briefing = {
  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml, isToday } = HeroOS.utils;
    const now = new Date();

    const primary = s.missions.find((m) => m.id === s.primaryMissionId && !m.completed);
    const active = s.missions.filter((m) => !m.completed);
    const todays = active.filter((m) => isToday(m.dueDate));
    const upcoming = active
      .filter((m) => m.dueDate && !isToday(m.dueDate))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
      .slice(0, 5);

    const todayStr = HeroOS.utils.todayStr();
    const focusToday = s.focusSessions.filter((f) => f.date === todayStr);
    const focusMinutes = focusToday.reduce((sum, f) => sum + f.minutes, 0);
    const recentCaptures = [...s.captures].slice(-5).reverse();

    root.innerHTML = `
      <div class="view-header"><h1>Daily Briefing</h1></div>

      <section class="panel">
        <div class="panel-eyebrow">${HeroOS.utils.formatDateLong(now)} &middot; ${HeroOS.utils.formatTime(now)}</div>
        <p>Good ${this._greeting(now)}, ${escapeHtml(s.settings.userName)}.</p>
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Primary Mission</div>
        <p>${primary ? escapeHtml(primary.title) : 'None set.'}</p>
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Today's Missions (${todays.length})</div>
        ${
          todays.length
            ? `<ul class="mini-list">${todays.map((m) => `<li>${escapeHtml(m.title)}</li>`).join('')}</ul>`
            : `<p class="empty-inline">Nothing due today.</p>`
        }
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Upcoming</div>
        ${
          upcoming.length
            ? `<ul class="mini-list">${upcoming
                .map((m) => `<li>${escapeHtml(m.title)} &mdash; ${HeroOS.utils.describeDueDate(m.dueDate).text}</li>`)
                .join('')}</ul>`
            : `<p class="empty-inline">Nothing scheduled.</p>`
        }
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Focus Sessions Today</div>
        <p>${focusToday.length} session${focusToday.length === 1 ? '' : 's'}, ${focusMinutes} minutes total.</p>
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Recent Captures</div>
        ${
          recentCaptures.length
            ? `<ul class="mini-list">${recentCaptures.map((c) => `<li>${escapeHtml(c.text.slice(0, 80))}</li>`).join('')}</ul>`
            : `<p class="empty-inline">Nothing captured recently.</p>`
        }
      </section>
    `;
  },

  _greeting(now) {
    const h = now.getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  },
};
