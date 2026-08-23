// app.js
// The "shell" of Hero OS: builds the header/nav chrome once, then
// swaps the main content area based on the URL hash. Loaded LAST so
// every other file (state, services, views) already exists.
//
// Why hash routing (#/focus instead of /focus)?
// Because this is a static, no-server app. A URL like
// yoursite.com/index.html#/focus works instantly with zero server
// config — and it's exactly the kind of URL an NFC tag can hold.

window.HeroOS = window.HeroOS || {};

HeroOS.app = {
  NAV_ITEMS: [
    { route: '#/', label: 'Dashboard' },
    { route: '#/missions', label: 'Missions' },
    { route: '#/focus', label: 'Focus' },
    { route: '#/suitcheck', label: 'Suit Check' },
    { route: '#/capture', label: 'Capture' },
    { route: '#/briefing', label: 'Briefing' },
    { route: '#/jarvis', label: 'JARVIS' },
    { route: '#/nfc', label: 'NFC Control' },
    { route: '#/portal', label: 'Portal' },
    { route: '#/detective', label: 'Detective' },
    { route: '#/settings', label: 'Settings' },
  ],

  // Mobile bottom bar keeps only the highest-frequency screens.
  MOBILE_NAV_ITEMS: [
    { route: '#/', label: 'Home' },
    { route: '#/missions', label: 'Missions' },
    { route: '#/focus', label: 'Focus' },
    { route: '#/capture', label: 'Capture' },
  ],

  ROUTES: {
    '#/': { title: 'Dashboard', view: () => HeroOS.views.dashboard },
    '#/missions': { title: 'Missions', view: () => HeroOS.views.missions },
    '#/focus': { title: 'Focus Mode', view: () => HeroOS.views.focus },
    '#/suitcheck': { title: 'Suit Check', view: () => HeroOS.views.suitcheck },
    '#/capture': { title: 'Quick Capture', view: () => HeroOS.views.capture },
    '#/briefing': { title: 'Daily Briefing', view: () => HeroOS.views.briefing },
    '#/jarvis': { title: 'JARVIS', view: () => HeroOS.views.jarvis },
    '#/nfc': { title: 'NFC Control', view: () => HeroOS.views.nfcManager },
    '#/portal': { title: 'Portal', view: () => HeroOS.views.portal },
    '#/detective': { title: 'Detective Mode', view: () => HeroOS.views.detective },
    '#/settings': { title: 'Settings', view: () => HeroOS.views.settings },
  },

  init() {
    HeroOS.state.init();
    this.applyTheme();
    this.renderChrome();
    HeroOS.keyboard.init();

    window.addEventListener('hashchange', () => this.router());
    document.getElementById('sidebar-scrim').addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
    this.router();

    this._updateClock();
    setInterval(() => this._updateClock(), 1000);
  },

  // ---- theming ----

  applyTheme() {
    document.documentElement.dataset.theme = HeroOS.state.current.settings.theme;
    document.body.classList.toggle('night-mode', !!HeroOS.state.current.night.active);
  },

  // ---- action dispatch (used by NFC deep links) ----

  runAction(actionId) {
    if (actionId === 'night') {
      const s = HeroOS.state.current;
      s.night.active = !s.night.active;
      HeroOS.state.save();
      this.applyTheme();
      window.location.hash = '#/';
      return;
    }
    const action = HeroOS.services.nfc.getAction(actionId);
    window.location.hash = action ? action.route : '#/';
  },

  // ---- router ----

  router() {
    let hash = window.location.hash || '#/';
    if (hash === '#/dashboard') hash = '#/';

    // NFC deep link: #/action/<tagId>
    if (hash.startsWith('#/action/')) {
      const tagId = parseInt(hash.slice('#/action/'.length), 10);
      const tag = HeroOS.state.current.nfcTags.find((t) => t.id === tagId);
      if (tag && tag.action) {
        this.runAction(tag.action);
      } else {
        window.location.hash = '#/';
      }
      return;
    }

    const entry = this.ROUTES[hash] || this.ROUTES['#/'];
    document.title = `${HeroOS.state.current.settings.appTitle} — ${entry.title}`;

    this._setActiveNav(hash in this.ROUTES ? hash : '#/');
    document.body.classList.remove('sidebar-open');

    const view = document.getElementById('view');
    entry.view().render(view);
    view.scrollTop = 0;
  },

  navigate(route) {
    window.location.hash = route;
  },

  // ---- chrome (header + nav) ----

  renderChrome() {
    const s = HeroOS.state.current;
    const header = document.getElementById('header');
    const sidebar = document.getElementById('sidebar');
    const bottombar = document.getElementById('bottombar');

    header.innerHTML = `
      <button class="menu-toggle" id="menu-toggle" aria-label="Toggle menu">☰</button>
      <div class="header-title">
        <span class="status-dot" aria-hidden="true"></span>
        <span>${HeroOS.utils.escapeHtml(s.settings.appTitle)}</span>
      </div>
      <div class="header-clock">
        <div id="hdr-date"></div>
        <div id="hdr-time"></div>
      </div>
    `;

    sidebar.innerHTML = `
      <div class="sidebar-brand">SYSTEM ONLINE</div>
      <ul class="nav-list">
        ${this.NAV_ITEMS.map((item) => `<li><a href="${item.route}" class="nav-link" data-route="${item.route}">${item.label}</a></li>`).join('')}
      </ul>
    `;

    bottombar.innerHTML = `
      ${this.MOBILE_NAV_ITEMS.map((item) => `<a href="${item.route}" class="bottombar-link" data-route="${item.route}">${item.label}</a>`).join('')}
      <button class="bottombar-link" id="bottombar-menu">More</button>
    `;

    header.querySelector('#menu-toggle').addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
    bottombar.querySelector('#bottombar-menu').addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });

    this._updateClock();
  },

  _setActiveNav(hash) {
    document.querySelectorAll('.nav-link, .bottombar-link').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.route === hash);
    });
  },

  _updateClock() {
    const now = new Date();
    const dateEl = document.getElementById('hdr-date');
    const timeEl = document.getElementById('hdr-time');
    if (dateEl) dateEl.textContent = HeroOS.utils.formatDateLong(now);
    if (timeEl) timeEl.textContent = HeroOS.utils.formatTime(now);
  },
};

document.addEventListener('DOMContentLoaded', () => HeroOS.app.init());
