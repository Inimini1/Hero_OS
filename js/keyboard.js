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
      // Cmd/Ctrl+K opens the Command Palette from anywhere, including
      // while typing — that combo doesn't collide with normal text entry.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        HeroOS.commandPalette.toggle();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (HeroOS.commandPalette.isOpen()) return; // palette owns its own keys while open

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
