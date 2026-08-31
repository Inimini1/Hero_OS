// store.js
// The ONLY file that talks to localStorage directly.
// Everything else asks this file to load/save the app's data.
// If you ever wanted to swap localStorage for something else
// (a file, a small local server, IndexedDB), this is the one
// place you'd need to change.

window.HeroOS = window.HeroOS || {};

HeroOS.store = {
  KEY: 'heroOS.state.v1',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error('Hero OS: failed to load saved data, starting fresh.', err);
      return null;
    }
  },

  save(state) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('Hero OS: failed to save data (storage full or blocked).', err);
      return false;
    }
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },
};
