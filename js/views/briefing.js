// views/briefing.js
// A read-only summary of missions/focus/captures, PLUS the one place
// Hero OS keeps a lightweight "what's on my day" schedule.
//
// This is deliberately NOT a calendar: entries are just {title, start,
// end} for today, entered by hand. The point isn't to replace Google
// Calendar — it's so Hero OS can tell "what do I have to do" apart
// from "when do I actually have time to do it", instead of suggesting
// a deep-work session on top of a lecture.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.briefing = {
  // ---- schedule data layer ----

  addEvent({ title, startTime, endTime = '' }) {
    const s = HeroOS.state.current;
    const event = {
      id: HeroOS.utils.uid('ev'),
      title: title.trim(),
      date: HeroOS.utils.todayStr(),
      startTime,
      endTime,
    };
    s.schedule.push(event);
    HeroOS.state.save();
    return event;
  },

  deleteEvent(id) {
    const s = HeroOS.state.current;
    s.schedule = s.schedule.filter((e) => e.id !== id);
    HeroOS.state.save();
  },

  todaysEvents() {
    const todayStr = HeroOS.utils.todayStr();
    return HeroOS.state.current.schedule
      .filter((e) => e.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  // Finds the single largest open block remaining today, so Hero OS can
  // reason about realistic priorities instead of ignoring the day's
  // actual shape. Returns a short readable string, or null if there's
  // nothing worth mentioning.
  freeTimeHint() {
    const events = this.todaysEvents();
    const toMinutes = (hhmm) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dayEndMinutes = 23 * 60;

    const blocks = events
      .map((e) => {
        const start = toMinutes(e.startTime);
        const end = e.endTime ? toMinutes(e.endTime) : start + 30;
        return { start, end };
      })
      .filter((b) => b.end > nowMinutes)
      .sort((a, b) => a.start - b.start);

    let cursor = nowMinutes;
    let best = null;
    for (const b of blocks) {
      const gapStart = cursor;
      const gapEnd = Math.max(cursor, b.start);
      if (gapEnd - gapStart > 0 && (!best || gapEnd - gapStart > best.end - best.start)) {
        best = { start: gapStart, end: gapEnd };
      }
      cursor = Math.max(cursor, b.end);
    }
    if (dayEndMinutes - cursor > 0 && (!best || dayEndMinutes - cursor > best.end - best.start)) {
      best = { start: cursor, end: dayEndMinutes };
    }
    if (!best || best.end - best.start < 15) return null;

    const fmt = (mins) => {
      const d = new Date();
      d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
      return HeroOS.utils.formatTime(d);
    };
    const durationMins = best.end - best.start;
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    const durationText = h > 0 ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`;
    return `Biggest open block: ${fmt(best.start)}–${fmt(best.end)} (${durationText})`;
  },

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml, isToday, dueSortKey, describeDueDateTime } = HeroOS.utils;
    const now = new Date();

    const primary = s.missions.find((m) => m.id === s.primaryMissionId && !m.completed);
    const active = s.missions.filter((m) => !m.completed);
    // Overdue counts as "today" — it's the most actionable bucket, not a
    // third category competing with real upcoming work for attention.
    const todays = active
      .filter((m) => isToday(m.dueDate) || HeroOS.utils.describeDueDate(m.dueDate).state === 'overdue')
      .sort((a, b) => dueSortKey(a.dueDate, a.dueTime).localeCompare(dueSortKey(b.dueDate, b.dueTime)));
    const upcoming = active
      .filter((m) => m.dueDate && !isToday(m.dueDate) && HeroOS.utils.describeDueDate(m.dueDate).state !== 'overdue')
      .sort((a, b) => dueSortKey(a.dueDate, a.dueTime).localeCompare(dueSortKey(b.dueDate, b.dueTime)))
      .slice(0, 5);

    const todayStr = HeroOS.utils.todayStr();
    const focusToday = s.focusSessions.filter((f) => f.date === todayStr);
    const focusMinutes = focusToday.reduce((sum, f) => sum + f.minutes, 0);
    const recentCaptures = [...s.captures].slice(-5).reverse();
    const events = this.todaysEvents();
    const freeHint = this.freeTimeHint();

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

      <section class="panel" id="google-cal-panel">
        <div class="panel-eyebrow">Google Calendar &mdash; Today</div>
        ${this._googleCalHtml()}
      </section>

      <section class="panel" id="gmail-panel">
        <div class="panel-eyebrow">Gmail</div>
        ${this._gmailHtml()}
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Today's Schedule</div>
        ${
          events.length
            ? `<div class="schedule-timeline">${events.map((e) => this._eventRow(e)).join('')}</div>`
            : `<p class="empty-inline">Nothing on the schedule. Add your classes or commitments so Hero OS knows your real free time.</p>`
        }
        ${freeHint ? `<div class="schedule-gap-hint">${escapeHtml(freeHint)}</div>` : ''}
        <form id="event-add-form" class="form-row" style="margin-top: 12px;">
          <input type="text" id="event-title" placeholder="e.g. SCM lecture" maxlength="60" required>
          <input type="time" id="event-start" required>
          <input type="time" id="event-end" placeholder="End (optional)">
          <button type="submit" class="btn btn-small">Add</button>
        </form>
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
                .map((m) => `<li>${escapeHtml(m.title)} &mdash; ${describeDueDateTime(m.dueDate, m.dueTime).text}</li>`)
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

    this._attachEvents(root);
    this._loadGoogleData(root);
  },

  // ---- Google Calendar / Gmail (live, read-only) ----

  _disconnectedHtml(label) {
    const google = HeroOS.services.google;
    if (google && google.wasEverConnected()) {
      // Had a connection before, it just expired (~hourly, no backend to
      // refresh it silently) — offer the fast path right here instead of
      // sending them back to Settings every time.
      return `<p class="empty-inline">Google access expired. <button class="link-btn" data-action="reconnect-google">Reconnect</button> to see ${label} here again.</p>`;
    }
    return `<p class="empty-inline">Not connected. <a href="#/settings">Connect Google in Settings</a> to see ${label} here.</p>`;
  },

  _googleCalHtml() {
    const google = HeroOS.services.google;
    if (!google || !google.isConnected()) return this._disconnectedHtml('your real calendar');
    return `<p class="empty-inline">Loading…</p>`;
  },

  _gmailHtml() {
    const google = HeroOS.services.google;
    if (!google || !google.isConnected()) return this._disconnectedHtml('this');
    return `<p class="empty-inline">Loading…</p>`;
  },

  // Fetches live once connected and patches just these two panels — never
  // a full re-render, so it can't disturb scroll position or a form the
  // user's mid-typing elsewhere on the screen. The two calls run
  // concurrently, not one-after-the-other — otherwise a slow or failing
  // Calendar call would delay the Gmail panel behind it for no reason.
  _loadGoogleData(root) {
    const google = HeroOS.services.google;
    if (!google || !google.isConnected()) return;

    const calPanel = root.querySelector('#google-cal-panel');
    const gmailPanel = root.querySelector('#gmail-panel');

    google.todaysEvents().then((events) => {
      if (!calPanel || !document.body.contains(calPanel)) return; // navigated away
      const html = events.length
        ? `<div class="schedule-timeline">${events.map((e) => this._googleEventRow(e)).join('')}</div>`
        : `<p class="empty-inline">Nothing on your Google Calendar today.</p>`;
      calPanel.innerHTML = `<div class="panel-eyebrow">Google Calendar &mdash; Today</div>${html}`;
    }).catch(() => {
      if (calPanel && document.body.contains(calPanel)) {
        calPanel.innerHTML = `<div class="panel-eyebrow">Google Calendar &mdash; Today</div><p class="empty-inline">Couldn't reach Google Calendar. <button class="link-btn" data-action="reconnect-google">Reconnect</button></p>`;
      }
    });

    google.unreadCount().then((count) => {
      if (!gmailPanel || !document.body.contains(gmailPanel)) return;
      gmailPanel.innerHTML = `<div class="panel-eyebrow">Gmail</div><p>${count} unread.</p>`;
    }).catch(() => {
      if (gmailPanel && document.body.contains(gmailPanel)) {
        gmailPanel.innerHTML = `<div class="panel-eyebrow">Gmail</div><p class="empty-inline">Couldn't reach Gmail. <button class="link-btn" data-action="reconnect-google">Reconnect</button></p>`;
      }
    });
  },

  _googleEventRow(e) {
    const { escapeHtml } = HeroOS.utils;
    let timeLabel = 'All day';
    if (!e.allDay && e.start) {
      const d = new Date(e.start);
      timeLabel = HeroOS.utils.formatTime(d);
    }
    return `
      <div class="schedule-event">
        <span class="schedule-event-time">${escapeHtml(timeLabel)}</span>
        <span class="schedule-event-title">${escapeHtml(e.title)}${e.location ? ' &mdash; ' + escapeHtml(e.location) : ''}</span>
      </div>
    `;
  },

  _eventRow(e) {
    const { escapeHtml, formatHHMM } = HeroOS.utils;
    return `
      <div class="schedule-event" data-id="${e.id}">
        <span class="schedule-event-time">${formatHHMM(e.startTime)}${e.endTime ? '–' + formatHHMM(e.endTime) : ''}</span>
        <span class="schedule-event-title">${escapeHtml(e.title)}</span>
        <button class="schedule-event-delete" data-action="delete-event" title="Remove">&#10005;</button>
      </div>
    `;
  },

  _attachEvents(root) {
    root.querySelectorAll('[data-action="delete-event"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.schedule-event');
        this.deleteEvent(row.dataset.id);
        this.render(root);
      });
    });

    root.querySelector('#event-add-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = root.querySelector('#event-title').value.trim();
      const startTime = root.querySelector('#event-start').value;
      const endTime = root.querySelector('#event-end').value;
      if (!title || !startTime) return;
      this.addEvent({ title, startTime, endTime });
      this.render(root);
    });

    // Delegated: the "Reconnect" button only shows up inside panels that
    // get swapped in later (once-connected-now-expired state, or a fetch
    // failure), so it may not exist yet when this handler is attached.
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="reconnect-google"]');
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = 'Reconnecting…';
      HeroOS.services.google.connect(
        () => this._loadGoogleData(root),
        () => {
          btn.disabled = false;
          btn.textContent = 'Reconnect';
        }
      );
    });
  },

  _greeting(now) {
    const h = now.getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  },
};
