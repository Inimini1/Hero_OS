// services/nfc.js
// Defines what an NFC tag can DO, and how to build a URL for it.
//
// The physical flow this supports:
//   NFC tag (programmed with a URL) -> phone taps it -> phone opens
//   that URL in a browser -> Hero OS reads the #/action/... hash and
//   jumps straight to the right screen.
//
// V1 has no NFC hardware reader. Instead, NFC Manager (views/nfcManager.js)
// lets you assign an action to each of your 57 physical tags, and gives
// you a URL to copy. Later, any phone NFC-writing app (like NFC Tools)
// can write that exact URL onto the physical tag.

window.HeroOS = window.HeroOS || {};
HeroOS.services = HeroOS.services || {};

HeroOS.services.nfc = {
  // Every action a tag (or a dashboard button) can trigger, and the
  // route it opens. "Modes" without dedicated screens yet still get a
  // real, small behavior — see app.js runAction().
  ACTIONS: [
    { id: 'focus', label: 'Focus Mode', route: '#/focus' },
    { id: 'suitcheck', label: 'Suit Check', route: '#/suitcheck' },
    { id: 'capture', label: 'Quick Capture', route: '#/capture' },
    { id: 'study', label: 'Study Mode', route: '#/focus' },
    { id: 'builder', label: 'Builder Mode', route: '#/missions' },
    { id: 'night', label: 'Night Mode', route: '#/' },
    { id: 'training', label: 'Training Mode', route: '#/missions' },
    { id: 'jarvis', label: 'JARVIS', route: '#/jarvis' },
    { id: 'portal', label: 'Portal', route: '#/portal' },
    { id: 'custom', label: 'Custom', route: '#/' },
  ],

  getAction(actionId) {
    return this.ACTIONS.find((a) => a.id === actionId) || null;
  },

  // Builds the full URL a physical tag would be programmed with.
  buildDeepLink(tagId) {
    const base = window.location.href.split('#')[0];
    return `${base}#/action/${tagId}`;
  },
};
