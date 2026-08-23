// views/settings.js
// One place to customize Hero OS without touching code.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.settings = {
  _newCategory: '',

  // ---- data layer ----

  updateSettings(changes) {
    Object.assign(HeroOS.state.current.settings, changes);
    HeroOS.state.save();
  },

  addCategory(name) {
    const s = HeroOS.state.current;
    const trimmed = name.trim();
    if (!trimmed || s.settings.missionCategories.includes(trimmed)) return;
    s.settings.missionCategories.push(trimmed);
    HeroOS.state.save();
  },

  removeCategory(name) {
    const s = HeroOS.state.current;
    s.settings.missionCategories = s.settings.missionCategories.filter((c) => c !== name);
    HeroOS.state.save();
  },

  resetAllData() {
    HeroOS.store.clear();
    HeroOS.state.init();
  },

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;

    root.innerHTML = `
      <div class="view-header"><h1>Settings</h1></div>

      <section class="panel form-panel">
        <h3>Profile</h3>
        <label>Your name
          <input type="text" id="set-username" value="${escapeHtml(s.settings.userName)}" maxlength="30">
        </label>
        <label>Hero OS title
          <input type="text" id="set-apptitle" value="${escapeHtml(s.settings.appTitle)}" maxlength="30">
        </label>
      </section>

      <section class="panel form-panel">
        <h3>Focus</h3>
        <label>Default focus duration (minutes)
          <input type="number" id="set-duration" min="1" max="180" value="${s.settings.focusDurationMinutes}">
        </label>
      </section>

      <section class="panel form-panel">
        <h3>Appearance</h3>
        <label>Theme
          <select id="set-theme">
            <option value="dark" ${s.settings.theme === 'dark' ? 'selected' : ''}>Dark (default)</option>
            <option value="dim" ${s.settings.theme === 'dim' ? 'selected' : ''}>Dim (low brightness)</option>
          </select>
        </label>
      </section>

      <section class="panel form-panel">
        <h3>Mission Categories</h3>
        <div class="chip-list">
          ${s.settings.missionCategories
            .map((c) => `<span class="tag-chip removable" data-cat="${escapeHtml(c)}">${escapeHtml(c)} <button data-action="remove-cat" title="Remove">✕</button></span>`)
            .join('')}
        </div>
        <form id="add-cat-form" class="inline-form">
          <input type="text" id="add-cat-input" placeholder="New category&hellip;" maxlength="24">
          <button type="submit" class="btn">Add</button>
        </form>
      </section>

      <section class="panel">
        <h3>Suit Check Items &amp; NFC Tags</h3>
        <p class="empty-inline">Managed directly on their own screens.</p>
        <div class="form-actions">
          <a class="btn" href="#/suitcheck">Edit Suit Check</a>
          <a class="btn" href="#/nfc">Edit NFC Tags</a>
        </div>
      </section>

      <section class="panel notice-panel">
        <h3>AI Provider (Future)</h3>
        <p>No AI provider is connected. JARVIS runs in local command mode. Connecting a real
        provider requires a small backend that holds the API key — API keys are never
        stored in this app's frontend code. See <code>js/services/ai.js</code>.</p>
      </section>

      <section class="panel notice-panel">
        <h3>Hardware (Future)</h3>
        <p>ESP32-C3, MPU-6050, gesture ring, and Spider-Sense sensors will connect through
        <code>js/services/hardware.js</code> once built. Nothing to configure yet.</p>
      </section>

      <section class="panel danger-panel">
        <h3>Danger Zone</h3>
        <p>Erase all Hero OS data on this device (missions, captures, focus history, NFC
        assignments, settings). This cannot be undone.</p>
        <button class="btn danger-btn" id="reset-data-btn">Reset All Data</button>
      </section>
    `;

    this._attachEvents(root);
  },

  _attachEvents(root) {
    root.querySelector('#set-username').addEventListener('change', (e) => {
      this.updateSettings({ userName: e.target.value.trim() || 'Hero' });
    });
    root.querySelector('#set-apptitle').addEventListener('change', (e) => {
      this.updateSettings({ appTitle: e.target.value.trim() || 'HERO OS' });
      HeroOS.app.renderChrome();
    });
    root.querySelector('#set-duration').addEventListener('change', (e) => {
      const mins = HeroOS.utils.clamp(parseInt(e.target.value, 10) || 25, 1, 180);
      this.updateSettings({ focusDurationMinutes: mins });
    });
    root.querySelector('#set-theme').addEventListener('change', (e) => {
      this.updateSettings({ theme: e.target.value });
      HeroOS.app.applyTheme();
    });

    root.querySelectorAll('[data-action="remove-cat"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-cat]');
        this.removeCategory(chip.dataset.cat);
        this.render(root);
      });
    });

    root.querySelector('#add-cat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = root.querySelector('#add-cat-input');
      this.addCategory(input.value);
      this.render(root);
    });

    root.querySelector('#reset-data-btn').addEventListener('click', () => {
      if (confirm('This will permanently erase all Hero OS data on this device. Continue?')) {
        this.resetAllData();
        HeroOS.app.renderChrome();
        this.render(root);
      }
    });
  },
};
