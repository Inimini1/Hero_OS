# Hero OS

A personal command center for college — inspired by the functional side of
superhero tech (JARVIS-style assistant, Batman-style prep tools, a Doctor
Strange portal control panel, and hooks for future wearable hardware).

V1 is a local, no-build web app: missions (tasks), Focus Mode, Suit Check
(departure checklist), Quick Capture (fast notes), a Daily Briefing, JARVIS
(local command mode, ready for a real AI provider later), an NFC tag
manager for up to 57 physical tags, and placeholder control panels for the
Portal project and future hardware (ESP32-C3, gesture ring, Spider-Sense).

## Running it

No install, no build step, no server required for basic use — just open
`index.html` in a browser.

For the best experience (and so NFC deep links resolve to a real URL),
serve it over a local static server instead:

```bash
cd Hero_OS
python3 -m http.server 8000
# then open http://localhost:8000
```

All data is stored in your browser's `localStorage` — nothing leaves your
device, and nothing requires an account or the internet.

## Project structure

- `index.html` — the page shell (header, sidebar, content area, mobile nav)
- `css/styles.css` — the whole visual theme
- `js/utils.js` — small helper functions (dates, ids, escaping)
- `js/store.js` — the only file that touches `localStorage`
- `js/state.js` — the app's data shape + load/save
- `js/services/ai.js` — JARVIS's brain (local fallback now, real AI provider later)
- `js/services/hardware.js` — event bus for future ESP32/gesture/sensor hardware
- `js/services/nfc.js` — NFC action list + deep link builder
- `js/keyboard.js` — global keyboard shortcuts
- `js/views/*.js` — one file per screen; each owns its own data + UI
- `js/app.js` — router and page chrome, loaded last

See the project chat history for a full walkthrough of the architecture
and what to learn next.
