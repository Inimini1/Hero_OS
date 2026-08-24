// keyboard.js
// Global keyboard shortcuts. Ignored while typing in a text field so
// they never interfere with normal typing.

window.HeroOS = window.HeroOS || {};

HeroOS.keyboard = {
  // Plain screen shortcuts — just set the hash, same as clicking a nav link.
  SHORTCUTS: {
    f: '#/focus',
    c: '#/capture',
    s: '#/suitcheck',
    m: '#/missions',
    j: '#/jarvis',
    p: '#/portal',
  },

  // Shortcuts that trigger an action rather than a plain route (e.g. Night
  // Mode is a toggle, not a screen). These call HeroOS.app.runAction() —
  // the exact same function NFC tags and the Command Palette call — so the
  // toggle logic itself only ever lives in one place (see app.js).
  ACTION_SHORTCUTS: {
    n: 'night',
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

      const key = e.key.toLowerCase();

      const actionId = this.ACTION_SHORTCUTS[key];
      if (actionId) {
        e.preventDefault();
        HeroOS.app.runAction(actionId);
        return;
      }

      const route = this.SHORTCUTS[key];
      if (route) {
        e.preventDefault();
        window.location.hash = route;
      }
    });
  },
};
