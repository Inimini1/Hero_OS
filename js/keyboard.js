// keyboard.js
// Global keyboard shortcuts. Ignored while typing in a text field so
// they never interfere with normal typing.

window.HeroOS = window.HeroOS || {};

HeroOS.keyboard = {
  SHORTCUTS: {
    f: '#/focus',
    c: '#/capture',
    s: '#/suitcheck',
    m: '#/missions',
    j: '#/jarvis',
    p: '#/portal',
  },

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const tag = document.activeElement.tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement.isContentEditable;
      if (isTyping) return;

      const route = this.SHORTCUTS[e.key.toLowerCase()];
      if (route) {
        e.preventDefault();
        window.location.hash = route;
      }
    });
  },
};
