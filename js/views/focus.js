// views/focus.js
// A countdown timer. Unlike V1, an in-progress session now survives a
// page refresh: while running, we persist an end timestamp
// (state.activeFocus) instead of just an in-memory countdown. On the
// next load we recompute the remaining time from that timestamp rather
// than trusting a stored "seconds left" number, which would freeze
// while the page was closed.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.focus = {
  _remainingSeconds: null,
  _totalSeconds: null,
  _running: false,
  _intervalId: null,
  _missionId: '',
  _justCompleted: false,
  _title: 'Focus Mode',
  _lockedCategory: null,

  // ---- data layer ----

  recordSession(minutes, missionId) {
    const s = HeroOS.state.current;
    const mission = s.missions.find((m) => m.id === missionId);
    s.focusSessions.push({
      id: HeroOS.utils.uid('focus'),
      date: HeroOS.utils.todayStr(),
      minutes,
      missionId: missionId || null,
      missionTitle: mission ? mission.title : null,
      completedAt: HeroOS.utils.nowISO(),
    });
    HeroOS.state.save();
  },

  // Called once at app startup (see app.js init), before any view has
  // rendered. If a session was running and its time fully elapsed while
  // the app was closed, record it now so dashboard stats are correct
  // immediately — the user shouldn't have to open Focus Mode first.
  checkForElapsedSession() {
    const s = HeroOS.state.current;
    const af = s.activeFocus;
    if (af && af.running && af.endAt <= Date.now()) {
      const minutes = Math.round(af.totalSeconds / 60);
      s.activeFocus = null;
      this.recordSession(minutes, af.missionId);
    }
  },

  // Rebuilds this screen's in-memory timer from whatever was persisted
  // (or starts fresh, if nothing was in progress). Only runs once per
  // page load — see the "firstRenderThisLoad" check in render().
  _restoreFromPersisted() {
    const s = HeroOS.state.current;
    const af = s.activeFocus;
    if (!af) {
      this._totalSeconds = s.settings.focusDurationMinutes * 60;
      this._remainingSeconds = this._totalSeconds;
      return;
    }
    this._totalSeconds = af.totalSeconds;
    this._missionId = af.missionId || '';
    if (af.running) {
      this._remainingSeconds = Math.max(1, Math.round((af.endAt - Date.now()) / 1000));
      this._running = true;
    } else {
      this._remainingSeconds = af.remainingSeconds;
      this._running = false;
    }
  },

  // ---- UI layer ----

  render(root, options) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;
    options = options || {};
    this._title = options.title || 'Focus Mode';
    this._lockedCategory = options.lockedCategory || null;

    const firstRenderThisLoad = this._remainingSeconds === null;
    if (firstRenderThisLoad) {
      this._restoreFromPersisted();
    }

    const activeMissions = s.missions
      .filter((m) => !m.completed)
      .filter((m) => !this._lockedCategory || m.category === this._lockedCategory);
    const todayStr = HeroOS.utils.todayStr();
    const todaySessions = s.focusSessions.filter((f) => f.date === todayStr);
    const totalMinutesToday = todaySessions.reduce((sum, f) => sum + f.minutes, 0);
    const recentSessions = [...s.focusSessions].reverse().slice(0, 8);

    const minutes = Math.floor(this._remainingSeconds / 60);
    const seconds = this._remainingSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    root.innerHTML = `
      <div class="view-header"><h1>${escapeHtml(this._title || 'Focus Mode')}</h1></div>

      ${this._justCompleted ? `<div class="panel completion-banner">Session complete. Well done, ${escapeHtml(s.settings.userName)}.</div>` : ''}
      ${this._running && firstRenderThisLoad ? `<div class="panel notice-panel">Resumed your in-progress session.</div>` : ''}

      <section class="panel focus-panel">
        <div class="focus-timer" role="timer" aria-live="polite">${timeStr}</div>

        <div class="focus-controls">
          ${
            !this._running
              ? `<button class="btn btn-primary" id="focus-start">${this._remainingSeconds === this._totalSeconds ? 'Start' : 'Resume'}</button>`
              : `<button class="btn" id="focus-pause">Pause</button>`
          }
          <button class="btn" id="focus-reset">Reset</button>
        </div>

        <div class="form-row focus-config">
          <label>Duration (minutes)
            <input type="number" id="focus-duration" min="1" max="180" value="${Math.round(this._totalSeconds / 60)}" ${this._running ? 'disabled' : ''}>
          </label>
          <label>Mission
            <select id="focus-mission" ${this._running ? 'disabled' : ''}>
              <option value="">No mission selected</option>
              ${activeMissions
                .map((m) => `<option value="${m.id}" ${this._missionId === m.id ? 'selected' : ''}>${escapeHtml(m.title)}</option>`)
                .join('')}
            </select>
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Today</div>
        <p class="stat-line"><span class="stat-num">${todaySessions.length}</span> session${todaySessions.length === 1 ? '' : 's'} &middot; <span class="stat-num">${totalMinutesToday}</span> min</p>
      </section>

      <section class="panel">
        <div class="panel-eyebrow">Session History</div>
        ${
          recentSessions.length
            ? `<ul class="mini-list">${recentSessions
                .map(
                  (f) =>
                    `<li>${f.minutes} min &middot; ${escapeHtml(f.missionTitle || 'No mission')} <span class="text-muted">(${f.date})</span></li>`
                )
                .join('')}</ul>`
            : `<p class="empty-inline">No sessions yet.</p>`
        }
      </section>
    `;

    this._attachEvents(root);

    if (firstRenderThisLoad && this._running) {
      this._startInterval(root);
    }
  },

  _attachEvents(root) {
    const durationInput = root.querySelector('#focus-duration');
    const missionSelect = root.querySelector('#focus-mission');
    const startBtn = root.querySelector('#focus-start');
    const pauseBtn = root.querySelector('#focus-pause');
    const resetBtn = root.querySelector('#focus-reset');

    if (durationInput) {
      durationInput.addEventListener('change', () => {
        const mins = HeroOS.utils.clamp(parseInt(durationInput.value, 10) || 25, 1, 180);
        this._totalSeconds = mins * 60;
        this._remainingSeconds = mins * 60;
        HeroOS.state.current.activeFocus = null;
        HeroOS.state.save();
        this.render(root, this._modeOptions());
      });
    }
    if (missionSelect) {
      missionSelect.addEventListener('change', () => {
        this._missionId = missionSelect.value;
      });
    }
    if (startBtn) {
      startBtn.addEventListener('click', () => this._start(root));
    }
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this._pause(root));
    }
    resetBtn.addEventListener('click', () => this._reset(root));
  },

  // Internal re-renders (start/pause/reset/complete) need to keep
  // whatever mode context (title + locked category) is currently active.
  _modeOptions() {
    return { title: this._title, lockedCategory: this._lockedCategory };
  },

  _startInterval(root) {
    clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
      this._remainingSeconds--;
      if (this._remainingSeconds <= 0) {
        this._complete(root);
        return;
      }
      const el = root.querySelector('.focus-timer');
      if (el) {
        const m = Math.floor(this._remainingSeconds / 60);
        const s = this._remainingSeconds % 60;
        el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    }, 1000);
  },

  _start(root) {
    this._running = true;
    this._justCompleted = false;
    HeroOS.state.current.activeFocus = {
      totalSeconds: this._totalSeconds,
      missionId: this._missionId,
      endAt: Date.now() + this._remainingSeconds * 1000,
      running: true,
    };
    HeroOS.state.save();
    this.render(root, this._modeOptions());
    this._startInterval(root);
  },

  _pause(root) {
    this._running = false;
    clearInterval(this._intervalId);
    HeroOS.state.current.activeFocus = {
      totalSeconds: this._totalSeconds,
      missionId: this._missionId,
      remainingSeconds: this._remainingSeconds,
      running: false,
    };
    HeroOS.state.save();
    this.render(root, this._modeOptions());
  },

  _reset(root) {
    clearInterval(this._intervalId);
    this._running = false;
    this._remainingSeconds = this._totalSeconds;
    this._justCompleted = false;
    HeroOS.state.current.activeFocus = null;
    HeroOS.state.save();
    this.render(root, this._modeOptions());
  },

  _complete(root) {
    clearInterval(this._intervalId);
    this._running = false;
    const minutes = Math.round(this._totalSeconds / 60);
    HeroOS.state.current.activeFocus = null;
    this.recordSession(minutes, this._missionId);
    this._remainingSeconds = this._totalSeconds;
    this._justCompleted = true;
    this.render(root, this._modeOptions());
  },
};
