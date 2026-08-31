// views/modes.js
// Study / Builder / Training "modes" are intentionally thin: each one
// just re-renders an existing screen (Focus or Missions) with a
// different title and a category locked in, instead of duplicating
// a whole screen's worth of UI. This is also what NFC tags assigned
// to these actions will open (see services/nfc.js ACTIONS).

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.study = {
  render(root) {
    HeroOS.views.focus.render(root, { title: 'Study Mode', lockedCategory: 'College' });
  },
};

HeroOS.views.builder = {
  render(root) {
    HeroOS.views.missions.render(root, { title: 'Builder Mode', lockedCategory: ['Business', 'Projects'] });
  },
};

HeroOS.views.training = {
  render(root) {
    HeroOS.views.missions.render(root, { title: 'Training Mode', lockedCategory: 'Health' });
  },
};
