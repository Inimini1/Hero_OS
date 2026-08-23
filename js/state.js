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
    const defaultSuitList = HeroOS.state.buildDefaultSuitCheckList('Default');
    return {
      version: 1,
      settings: {
        userName: 'Hero',
        appTitle: 'HERO OS',
        focusDurationMinutes: 25,
        theme: 'dark',
        missionCategories: ['College', 'Health', 'Business', 'Personal', 'Projects'],
        // A real AI backend (see server/ai-proxy.js) can be plugged in by
        // pointing "endpoint" at it and switching "enabled" on. The API key
        // itself lives only on that server — never here.
        aiProvider: { endpoint: '', enabled: false },
      },
      missions: [],
      primaryMissionId: null,
      captures: [],
      focusSessions: [],
      // The timer that's currently running/paused, so a page refresh
      // doesn't lose it. null when no session is in progress.
      activeFocus: null,
      suitCheck: {
        activeListId: defaultSuitList.id,
        lists: [defaultSuitList],
      },
      nfcTags: HeroOS.state.buildDefaultNfcTags(57),
      portal: { status: 'OFFLINE' },
      night: { active: false },
      // People, not tasks — see views/connections.js. No scores, ever.
      connections: [],
      // Deliberately minimal: just "what's on the calendar today", not a
      // real calendar. Each entry is { id, title, date, startTime, endTime }.
      schedule: [],
    };
  },

  buildDefaultSuitCheckList(name) {
    return {
      id: HeroOS.utils.uid('list'),
      name,
      items: ['Phone', 'Wallet', 'Keys', 'Laptop', 'Charger', 'Water', 'Headphones'].map((n) => ({
        id: HeroOS.utils.uid('item'),
        name: n,
        checked: false,
      })),
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
      // Older saves stored aiProvider as null instead of an object.
      if (!HeroOS.state.current.settings.aiProvider) {
        HeroOS.state.current.settings.aiProvider = { endpoint: '', enabled: false };
      }
      HeroOS.state.migrateSuitCheck(HeroOS.state.current);
    } else {
      HeroOS.state.current = HeroOS.state.defaultState();
    }
    HeroOS.state.save();
  },

  // Older saves had a single flat suitCheck.items list. Wrap it into the
  // new multi-list shape so nothing gets lost.
  migrateSuitCheck(state) {
    const sc = state.suitCheck;
    if (sc && Array.isArray(sc.items) && !Array.isArray(sc.lists)) {
      const list = { id: HeroOS.utils.uid('list'), name: 'Default', items: sc.items };
      state.suitCheck = { activeListId: list.id, lists: [list] };
    }
  },

  save() {
    HeroOS.store.save(HeroOS.state.current);
  },
};
