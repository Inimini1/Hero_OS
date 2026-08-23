// state.js
// The single source of truth for all app data.
// HeroOS.state.current holds the live data in memory.
// Call HeroOS.state.save() any time you change something,
// and it gets written to localStorage automatically.

window.HeroOS = window.HeroOS || {};

HeroOS.state = {
  current: null,

  // The shape of a brand-new install. If you add a new field later,
  // add it here too, and see init() below for how old saves get upgraded.
  defaultState() {
    return {
      version: 1,
      settings: {
        userName: 'Hero',
        appTitle: 'HERO OS',
        focusDurationMinutes: 25,
        theme: 'dark',
        missionCategories: ['College', 'Health', 'Business', 'Personal', 'Projects'],
        // Future: { provider: 'openai'|'anthropic'|..., endpoint: '...' }
        // Never put an API key here — see js/services/ai.js for why.
        aiProvider: null,
      },
      missions: [],
      primaryMissionId: null,
      captures: [],
      focusSessions: [],
      suitCheck: {
        items: [
          { id: HeroOS.utils.uid('item'), name: 'Phone', checked: false },
          { id: HeroOS.utils.uid('item'), name: 'Wallet', checked: false },
          { id: HeroOS.utils.uid('item'), name: 'Keys', checked: false },
          { id: HeroOS.utils.uid('item'), name: 'Laptop', checked: false },
          { id: HeroOS.utils.uid('item'), name: 'Charger', checked: false },
          { id: HeroOS.utils.uid('item'), name: 'Water', checked: false },
          { id: HeroOS.utils.uid('item'), name: 'Headphones', checked: false },
        ],
      },
      nfcTags: HeroOS.state.buildDefaultNfcTags(57),
      portal: { status: 'OFFLINE' },
      night: { active: false },
    };
  },

  buildDefaultNfcTags(count) {
    const tags = [];
    for (let i = 1; i <= count; i++) {
      tags.push({
        id: i,
        name: '',
        action: null, // one of HeroOS.services.nfc.ACTIONS ids, or null = unassigned
        description: '',
        location: '',
        category: '',
      });
    }
    return tags;
  },

  init() {
    const saved = HeroOS.store.load();
    if (saved) {
      // Merge onto defaults so a save from an older version still
      // has every field the current version expects.
      HeroOS.state.current = Object.assign(HeroOS.state.defaultState(), saved);
      HeroOS.state.current.settings = Object.assign(
        HeroOS.state.defaultState().settings,
        saved.settings || {}
      );
    } else {
      HeroOS.state.current = HeroOS.state.defaultState();
    }
    HeroOS.state.save();
  },

  save() {
    HeroOS.store.save(HeroOS.state.current);
  },
};
