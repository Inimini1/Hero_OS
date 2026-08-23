// views/dashboard.js
// The main screen. Read-only — it just summarizes data that lives in
// other views (missions.js, capture.js, focus.js, etc).

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.dashboard = {
  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml, describeDueDate, isToday } = HeroOS.utils;

    const primary = s.missions.find((m) => m.id === s.primaryMissionId && !m.completed);

    const active = s.missions.filter((m) => !m.completed);
    const todays = active.filter((m) => isToday(m.dueDate));
    const upcoming = active
      .filter((m) => m.dueDate && !isToday(m.dueDate))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
      .slice(0, 4);
    const next = active
      .filter((m) => m.id !== (primary && primary.id))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))[0];

    const todayStr = HeroOS.utils.todayStr();
    const focusToday = s.focusSessions.filter((f) => f.date === todayStr);
    const focusMinutesToday = focusToday.reduce((sum, f) => sum + f.minutes, 0);

    const recentCaptures = [...s.captures].slice(-3).reverse();

    root.innerHTML = `
      <section class="panel primary-mission-panel">
        <div class="panel-eyebrow">Primary Mission</div>
        ${
          primary
            ? `<h2 class="primary-mission-title">${escapeHtml(primary.title)}</h2>
               <div class="primary-mission-meta">
                 <span class="badge badge-${primary.category.toLowerCase()}">${escapeHtml(primary.category)}</span>
                 <span class="due due-${describeDueDate(primary.dueDate).state}">${describeDueDate(primary.dueDate).text}</span>
               </div>`
            : `<p class="empty-inline">No Primary Mission set. <a href="#/missions">Choose one &rarr;</a></p>`
        }
        ${next ? `<div class="next-line"><span class="panel-eyebrow">Next</span> ${escapeHtml(next.title)} ${next.dueDate ? '&mdash; ' + describeDueDate(next.dueDate).text : ''}</div>` : ''}
      </section>

      <section class="quick-actions">
        ${this._quickAction('#/focus', 'FOCUS', '◎')}
        ${this._quickAction('#/suitcheck', 'SUIT CHECK', '▣')}
        ${this._quickAction('#/capture', 'QUICK CAPTURE', '✎')}
        ${this._quickAction('#/jarvis', 'JARVIS', '◈')}
        ${this._quickAction('#/missions', 'MISSIONS', '☰')}
        ${this._quickAction('#/briefing', 'DAILY BRIEFING', '▤')}
        ${this._quickAction('#/nfc', 'NFC CONTROL', '⌘')}
        ${this._quickAction('#/portal', 'PORTAL', '◐')}
        ${this._quickAction('#/settings', 'SETTINGS', '⚙')}
      </section>

      <div class="dashboard-grid">
        <section class="panel">
          <div class="panel-eyebrow">Today's Missions</div>
          ${
            todays.length
              ? `<ul class="mini-list">${todays
                  .map((m) => `<li>${escapeHtml(m.title)} <span class="badge badge-${m.category.toLowerCase()}">${escapeHtml(m.category)}</span></li>`)
                  .join('')}</ul>`
              : `<p class="empty-inline">Nothing due today.</p>`
          }
        </section>

        <section class="panel">
          <div class="panel-eyebrow">Upcoming</div>
          ${
            upcoming.length
              ? `<ul class="mini-list">${upcoming
                  .map((m) => `<li>${escapeHtml(m.title)} <span class="due due-${describeDueDate(m.dueDate).state}">${describeDueDate(m.dueDate).text}</span></li>`)
                  .join('')}</ul>`
              : `<p class="empty-inline">Nothing scheduled.</p>`
          }
        </section>

        <section class="panel">
          <div class="panel-eyebrow">Focus Today</div>
          <p class="stat-line"><span class="stat-num">${focusToday.length}</span> session${focusToday.length === 1 ? '' : 's'} &middot; <span class="stat-num">${focusMinutesToday}</span> min</p>
          <a class="link-more" href="#/focus">Start a session &rarr;</a>
        </section>

        <section class="panel">
          <div class="panel-eyebrow">Recent Captures</div>
          ${
            recentCaptures.length
              ? `<ul class="mini-list">${recentCaptures
                  .map((c) => `<li>${escapeHtml(c.text.slice(0, 60))}${c.text.length > 60 ? '&hellip;' : ''}</li>`)
                  .join('')}</ul>`
              : `<p class="empty-inline">Nothing captured yet.</p>`
          }
          <a class="link-more" href="#/capture">Capture something &rarr;</a>
        </section>
      </div>
    `;
  },

  _quickAction(href, label, glyph) {
    return `<a class="quick-action" href="${href}"><span class="quick-action-glyph" aria-hidden="true">${glyph}</span><span>${label}</span></a>`;
  },
};
