// js/pwa.js
// Installable/offline support: registers the service worker, captures the
// browser's install prompt, and exposes small helpers Settings uses to show
// a quiet "Install Hero OS" row. No UI lives here — this is plumbing only.

window.HeroOS = window.HeroOS || {};

HeroOS.pwa = {
  _deferredPrompt: null,
  _listeners: [],

  init() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {
          // Offline/unsupported registration failures are non-fatal — the app
          // still works fully online without a service worker.
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this._deferredPrompt = event;
      this._notify();
    });

    window.addEventListener('appinstalled', () => {
      this._deferredPrompt = null;
      this._notify();
    });
  },

  // Chromium/Android/desktop: true once the browser has signaled the app is
  // installable and hasn't been installed yet.
  canPromptInstall() {
    return !!this._deferredPrompt;
  },

  // Triggers the native install prompt. Must be called from a user gesture
  // (e.g. a click handler). Resolves to the browser's choice outcome, or
  // null if there is no prompt available to show.
  async promptInstall() {
    if (!this._deferredPrompt) return null;
    const promptEvent = this._deferredPrompt;
    this._deferredPrompt = null;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    this._notify();
    return choice;
  },

  // True when running as an installed app (any platform).
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },

  // iOS/iPadOS Safari never fires beforeinstallprompt — installation is a
  // manual Share Sheet step, so Settings shows static instructions instead.
  isIOS() {
    const platform = window.navigator.platform || '';
    const ua = window.navigator.userAgent || '';
    const isAppleTouch = /iPad|iPhone|iPod/.test(platform)
      || (/Mac/.test(platform) && navigator.maxTouchPoints > 1);
    return isAppleTouch && /AppleWebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  },

  onChange(handler) {
    this._listeners.push(handler);
  },

  _notify() {
    this._listeners.forEach((handler) => handler());
  },
};
