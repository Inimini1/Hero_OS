// views/dashboard.js
// The main screen. Read-only — it just summarizes data that lives in
// other views (missions.js, connections.js, briefing.js, etc).
//
// Deliberately organized around three questions, answered top to
// bottom: what matters (Primary Mission), what's next (mission + the
// day's actual shape), and who deserves attention (Connections) —
// before anything resembling a productivity stat.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.dashboard = {
  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml, describeDueDateTime, isToday, dueSortKey } = HeroOS.utils;

    const primary = s.missions.find((m) => m.id === s.primaryMissionId && !m.completed);

    const active = s.missions.filter((m) => !m.completed);
    // Overdue counts as "today" here — it's the most actionable bucket,
    // not a third category competing for attention with real upcoming work.
    const todays = active
      .filter((m) => isToday(m.dueDate) || HeroOS.utils.describeDueDate(m.dueDate).state === 'overdue')
      .sort((a, b) => dueSortKey(a.dueDate, a.dueTime).localeCompare(dueSortKey(b.dueDate, b.dueTime)));
    const upcoming = active
      .filter((m) => m.dueDate && !isToday(m.dueDate) && HeroOS.utils.describeDueDate(m.dueDate).state !== 'overdue')
      .sort((a, b) => dueSortKey(a.dueDate, a.dueTime).localeCompare(dueSortKey(b.dueDate, b.dueTime)))
      .slice(0, 4);
    const next = active
      .filter((m) => m.id !== (primary && primary.id))
      .sort((a, b) => dueSortKey(a.dueDate, a.dueTime).localeCompare(dueSortKey(b.dueDate, b.dueTime)))[0];

    const todayStr = HeroOS.utils.todayStr();
    const focusToday = s.focusSessions.filter((f) => f.date === todayStr);
    const focusMinutesToday = focusToday.reduce((sum, f) => sum + f.minutes, 0);
    const recentCaptures = [...s.captures].slice(-3).reverse();

    const scheduleEvents = HeroOS.views.briefing.todaysEvents().slice(0, 3);
    const freeHint = HeroOS.views.briefing.freeTimeHint();
    const dueConnections = HeroOS.views.connections.due().slice(0, 3);

    root.innerHTML = `
      <section class="panel primary-mission-panel">
        <div class="panel-eyebrow">Primary Mission</div>
        ${
          primary
            ? `<h2 class="primary-mission-title">${escapeHtml(primary.title)}</h2>
               <div class="primary-mission-meta">
                 <span class="badge badge-${primary.category.toLowerCase()}">${escapeHtml(primary.category)}</span>
                 <span class="due due-${describeDueDateTime(primary.dueDate, primary.dueTime).state}">${describeDueDateTime(primary.dueDate, primary.dueTime).text}</span>
               </div>`
            : `<p class="empty-inline">No Primary Mission set. <a href="#/missions">Choose one &rarr;</a></p>`
        }
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Next</div>
        ${
          next
            ? `<p class="next-mission-line">${escapeHtml(next.title)}${next.dueDate ? ' &mdash; ' + describeDueDateTime(next.dueDate, next.dueTime).text : ''}</p>`
            : `<p class="empty-inline">Nothing else queued up.</p>`
        }
        ${
          scheduleEvents.length
            ? `<div class="schedule-timeline">${scheduleEvents
                .map((e) => `<div class="schedule-event"><span class="schedule-event-time">${HeroOS.utils.formatHHMM(e.startTime)}</span><span class="schedule-event-title">${escapeHtml(e.title)}</span></div>`)
                .join('')}</div>`
            : ''
        }
        ${freeHint ? `<div class="schedule-gap-hint">${escapeHtml(freeHint)}</div>` : ''}
        <a class="link-more" href="#/briefing">${scheduleEvents.length ? 'Full schedule' : 'Add today’s schedule'} &rarr;</a>
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

      ${
        dueConnections.length
          ? `<section class="panel">
              <div class="panel-eyebrow">Worth Reaching Out To</div>
              <ul class="mini-list">
                ${dueConnections.map((c) => `<li>${escapeHtml(c.name)}${c.whereWeMet ? ` <span class="text-muted">&middot; ${escapeHtml(c.whereWeMet)}</span>` : ''}</li>`).join('')}
              </ul>
              <a class="link-more" href="#/connections">Open Connections &rarr;</a>
            </section>`
          : ''
      }

      <section class="panel modes-panel">
        <div class="panel-eyebrow">Modes</div>
        <div class="mode-links">
          <a class="mode-link" href="#/study">Study</a>
          <a class="mode-link" href="#/builder">Builder</a>
          <a class="mode-link" href="#/training">Training</a>
          <button class="mode-link" id="dashboard-night-toggle">${s.night.active ? 'Night: On' : 'Night'}</button>
        </div>
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
                  .map((m) => `<li>${escapeHtml(m.title)} <span class="due due-${describeDueDateTime(m.dueDate, m.dueTime).state}">${describeDueDateTime(m.dueDate, m.dueTime).text}</span></li>`)
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

    root.querySelector('#dashboard-night-toggle').addEventListener('click', () => {
      // Already on the dashboard, so the hash won't change and won't
      // trigger a re-render on its own — render again explicitly.
      HeroOS.app.runAction('night');
      this.render(root);
    });
  },

  _quickAction(href, label, glyph) {
    return `<a class="quick-action" href="${href}"><span class="quick-action-glyph" aria-hidden="true">${glyph}</span><span>${label}</span></a>`;
  },
};
