// commandPalette.js
// Cmd/Ctrl+K command palette. This is Hero OS's "control surface":
// every command here just calls the same functions a dashboard button,
// an NFC tag, or (later) a voice/gesture event would call — nothing
// here is a separate code path. See services/nfc.js for the same idea
// applied to physical tags.
//
// V1 search is plain substring matching over each command's label +
// keywords. "Natural language" is a future upgrade for this same file —
// the command list and dispatch mechanism won't need to change.
//
// Implementation note: the outer shell (overlay + input) is built ONCE
// in open(), and only the results list re-renders per keystroke. Wiping
// out the whole container on every input event would recreate the
// <input> element and silently steal its own focus mid-keystroke.

window.HeroOS = window.HeroOS || {};

HeroOS.commandPalette = {
  _open: false,
  _activeIndex: 0,
  _query: '',
  _commands: [],

  // Static commands. Built once per open(); connections are appended
  // dynamically since that list changes.
  _baseCommands() {
    const nav = HeroOS.app.NAV_ITEMS.concat([
      { route: '#/study', label: 'Study Mode' },
      { route: '#/builder', label: 'Builder Mode' },
      { route: '#/training', label: 'Training Mode' },
      { route: '#/connections', label: 'Connections' },
    ]);

    const commands = [
      {
        label: 'Focus for 25 minutes',
        keywords: 'focus timer pomodoro',
        hint: 'F',
        run: () => this._quickFocus(25),
      },
      {
        label: 'Focus for 50 minutes',
        keywords: 'focus timer pomodoro deep work',
        run: () => this._quickFocus(50),
      },
      {
        label: 'Add Mission',
        keywords: 'task new create',
        hint: 'M',
        run: () => this._openMissionForm(),
      },
      {
        label: 'Capture Idea',
        keywords: 'note quick thought remember',
        hint: 'C',
        run: () => HeroOS.app.navigate('#/capture'),
      },
      {
        label: "Show Today's Missions",
        keywords: 'tasks today',
        run: () => HeroOS.app.navigate('#/missions'),
      },
      {
        label: 'Show Schedule',
        keywords: 'calendar today time briefing',
        run: () => HeroOS.app.navigate('#/briefing'),
      },
      {
        // Same toggle HeroOS.app.runAction('night') that the Dashboard
        // button, NFC tags, and the 'n' keyboard shortcut all call —
        // the label just reflects current state at open() time.
        label: HeroOS.state.current.night.active ? 'Turn Off Night Mode' : 'Turn On Night Mode',
        keywords: 'night mode dim brightness',
        hint: 'N',
        run: () => HeroOS.app.runAction('night'),
      },
    ];

    nav.forEach((item) => {
      commands.push({
        label: `Open ${item.label}`,
        keywords: item.label,
        run: () => HeroOS.app.navigate(item.route),
      });
    });

    return commands;
  },

  _connectionCommands() {
    return HeroOS.state.current.connections.map((c) => ({
      label: `Reach out to ${c.name}`,
      keywords: `connection person ${c.whereWeMet || ''}`,
      run: () => HeroOS.app.navigate('#/connections'),
    }));
  },

  _quickFocus(minutes) {
    HeroOS.app.navigate('#/focus');
    setTimeout(() => HeroOS.views.focus.quickStart(minutes), 30);
  },

  _openMissionForm() {
    HeroOS.app.navigate('#/missions');
    setTimeout(() => {
      const btn = document.getElementById('mission-new-btn');
      if (btn) btn.click();
    }, 30);
  },

  open() {
    // Remember what had focus so close() can put it back — the standard
    // dialog contract ("focus returns to the element that opened it").
    this._triggerElement = document.activeElement;
    this._open = true;
    this._query = '';
    this._activeIndex = 0;
    this._commands = this._baseCommands().concat(this._connectionCommands());
    this._renderShell();
    this._renderList();
    const input = document.getElementById('command-palette-input');
    if (input) input.focus();
  },

  close() {
    this._open = false;
    const container = document.getElementById('command-palette-container');
    if (container) container.innerHTML = '';
    const trigger = this._triggerElement;
    this._triggerElement = null;
    if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') {
      trigger.focus();
    }
  },

  toggle() {
    this._open ? this.close() : this.open();
  },

  isOpen() {
    return this._open;
  },

  _filtered() {
    const q = this._query.trim().toLowerCase();
    if (!q) return this._commands;
    return this._commands.filter((c) => (c.label + ' ' + (c.keywords || '')).toLowerCase().includes(q));
  },

  // Built once per open(). Never touched again until close() — this is
  // what keeps the input element (and its focus) stable while typing.
  _renderShell() {
    const container = document.getElementById('command-palette-container');
    if (!container) return;
    const { escapeHtml } = HeroOS.utils;

    container.innerHTML = `
      <div class="command-palette-overlay" id="command-palette-overlay">
        <div class="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette">
          <div class="command-palette-input-row">
            <span class="command-palette-glyph" aria-hidden="true">&#9670;</span>
            <input
              type="text"
              id="command-palette-input"
              class="command-palette-input"
              placeholder="What do you want to do?"
              autocomplete="off"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-list"
              aria-autocomplete="list"
              aria-activedescendant=""
            >
          </div>
          <div class="command-palette-list" id="command-palette-list" role="listbox" aria-label="Commands"></div>
          <div class="command-palette-footer">
            <span><kbd>&uarr;&darr;</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Run</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    `;

    const overlay = container.querySelector('#command-palette-overlay');
    const input = container.querySelector('#command-palette-input');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    input.addEventListener('input', (e) => {
      this._query = e.target.value;
      this._activeIndex = 0;
      this._renderList();
    });

    input.addEventListener('keydown', (e) => {
      const results = this._filtered();
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._activeIndex = Math.min(this._activeIndex + 1, results.length - 1);
        this._renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._activeIndex = Math.max(this._activeIndex - 1, 0);
        this._renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = results[this._activeIndex];
        if (cmd) this._run(cmd);
      } else if (e.key === 'Tab') {
        // The search input is the only real tab stop in this dialog —
        // options are reached via arrow keys + aria-activedescendant,
        // not Tab. Consuming Tab here keeps focus from leaking out to
        // the page behind the overlay while it's open.
        e.preventDefault();
      }
    });
  },

  // Re-renders just the results — safe to call on every keystroke since
  // it never touches the <input> the user is actively typing into.
  _renderList() {
    const list = document.getElementById('command-palette-list');
    if (!list) return;
    const results = this._filtered();
    if (this._activeIndex >= results.length) this._activeIndex = Math.max(0, results.length - 1);
    const { escapeHtml } = HeroOS.utils;

    list.innerHTML = results.length
      ? results
          .map(
            (c, i) => `
        <div class="command-palette-item ${i === this._activeIndex ? 'is-active' : ''}" id="command-palette-option-${i}" role="option" aria-selected="${i === this._activeIndex}" data-index="${i}">
          <span>${escapeHtml(c.label)}</span>
          ${c.hint ? `<span class="command-palette-item-hint">${escapeHtml(c.hint)}</span>` : ''}
        </div>
      `
          )
          .join('')
      : `<div class="command-palette-empty">No matching command.</div>`;

    // The input keeps real DOM focus the whole time — aria-activedescendant
    // is how screen readers learn which option is "virtually" focused.
    const input = document.getElementById('command-palette-input');
    if (input) {
      input.setAttribute('aria-activedescendant', results.length ? `command-palette-option-${this._activeIndex}` : '');
    }

    list.querySelectorAll('.command-palette-item').forEach((el) => {
      el.addEventListener('click', () => {
        const cmd = results[parseInt(el.dataset.index, 10)];
        if (cmd) this._run(cmd);
      });
      el.addEventListener('mouseenter', () => {
        this._activeIndex = parseInt(el.dataset.index, 10);
        this._renderList();
      });
    });
  },

  _run(cmd) {
    this.close();
    cmd.run();
  },
};
