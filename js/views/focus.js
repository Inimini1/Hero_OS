// views/focus.js
// A minimal countdown timer. Session state (running/paused/remaining)
// lives only in memory — refreshing the page resets an in-progress
// timer, which keeps this simple and matches "distraction-free."
// Completed sessions ARE saved permanently, in state.focusSessions.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.focus = {
  _remainingSeconds: null,
  _totalSeconds: null,
  _running: false,
  _intervalId: null,
  _missionId: '',
  _justCompleted: false,

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

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;

    if (this._remainingSeconds === null) {
      this._totalSeconds = s.settings.focusDurationMinutes * 60;
      this._remainingSeconds = this._totalSeconds;
    }

    const activeMissions = s.missions.filter((m) => !m.completed);
    const todayStr = HeroOS.utils.todayStr();
    const todaySessions = s.focusSessions.filter((f) => f.date === todayStr);
    const totalMinutesToday = todaySessions.reduce((sum, f) => sum + f.minutes, 0);
    const recentSessions = [...s.focusSessions].reverse().slice(0, 8);

    const minutes = Math.floor(this._remainingSeconds / 60);
    const seconds = this._remainingSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    root.innerHTML = `
      <div class="view-header"><h1>Focus Mode</h1></div>

      ${this._justCompleted ? `<div class="panel completion-banner">Session complete. Well done, ${escapeHtml(s.settings.userName)}.</div>` : ''}

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
        this.render(root);
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

  _start(root) {
    this._running = true;
    this._justCompleted = false;
    this.render(root);
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

  _pause(root) {
    this._running = false;
    clearInterval(this._intervalId);
    this.render(root);
  },

  _reset(root) {
    clearInterval(this._intervalId);
    this._running = false;
    this._remainingSeconds = this._totalSeconds;
    this._justCompleted = false;
    this.render(root);
  },

  _complete(root) {
    clearInterval(this._intervalId);
    this._running = false;
    const minutes = Math.round(this._totalSeconds / 60);
    this.recordSession(minutes, this._missionId);
    this._remainingSeconds = this._totalSeconds;
    this._justCompleted = true;
    this.render(root);
  },
};
