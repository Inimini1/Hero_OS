# Hero OS

A personal command center for college — inspired by the functional side of
superhero tech (JARVIS-style assistant, Batman-style prep tools, a Doctor
Strange portal control panel, and hooks for future wearable hardware).

V1 is a local, no-build web app: missions (tasks), Focus Mode, Suit Check
(departure checklist), Quick Capture (fast notes), Connections (people
worth staying in touch with — not a CRM), a Daily Briefing with a
lightweight today's-schedule, JARVIS (local command mode, ready for a real
AI provider later), a Command Palette (⌘/Ctrl+K), an NFC tag manager for
up to 57 physical tags, and placeholder control panels for the Portal
project and future hardware (ESP32-C3, gesture ring, Spider-Sense).

The visual/UX system is an original synthesis, not a copy of any single
app: calm, grouped task lists (Things' restraint), typography-first quick
capture (Apple Notes' speed), a schedule-aware daily briefing (Google
Calendar's time-awareness, kept deliberately small), and a keyboard-first
command palette (Raycast's control-surface feel) — layered under Hero OS's
own dark, single-accent "JARVIS" identity. The command palette, NFC tags,
keyboard shortcuts, and dashboard buttons all call the exact same
functions, by design — see `js/commandPalette.js` and `js/services/nfc.js`.

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

## Connecting real AI to JARVIS (optional)

By default JARVIS runs in local command mode (no setup, no API key). To get
real AI answers, run the small local backend that holds your Anthropic API
key server-side — the key never goes in this app's frontend code:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node server/ai-proxy.js
# open http://localhost:8787 (this server serves the app too)
```

Then in Hero OS **Settings → AI Provider**, set the endpoint to
`http://localhost:8787/api/chat` and turn it on. Note: because of normal
browser cross-origin rules, JARVIS's requests only reach the proxy when you
load Hero OS *from* that same server (`http://localhost:8787`) — not from a
separate static server on a different port. If the proxy is unreachable or
misconfigured, JARVIS automatically falls back to local command mode rather
than breaking.

Uses `claude-opus-5` by default; set `HERO_OS_MODEL` to something cheaper
(e.g. `claude-haiku-4-5`) if you'd rather optimize for cost.

## Installing it as an app (PWA)

Hero OS is an installable Progressive Web App: a manifest (`manifest.webmanifest`),
a service worker (`sw.js`), and an on-brand icon set (`icons/`) let it run
full-screen, offline, from a home screen or dock icon — with no change to
the underlying app. This only works once Hero OS is served over **HTTPS**
(or `localhost`); service workers refuse to register over plain HTTP.

- **iPhone/iPad (Safari):** open the site, tap the Share icon, then
  "Add to Home Screen". Safari never shows a browser-driven install prompt —
  this manual step is the only way iOS installs any PWA, for any app.
- **Mac/Windows/Android (Chrome or Edge):** open the site; the browser will
  offer an install option (address-bar icon, or menu → "Install Hero OS").
  Settings → **Install Hero OS** also shows a button there once the browser
  has signaled it's installable.
- **Offline:** the dashboard, missions, Focus Mode, Suit Check, Quick
  Capture, Connections, and Settings all keep working offline — they only
  ever read/write `localStorage`. JARVIS's local command mode also works
  offline; the optional real-AI backend does not (it says so rather than
  faking a response).

## Deploying (heroos.appscloud365.com)

Hero OS has no build step and no backend requirement — any static HTTPS
host works: upload `index.html`, `manifest.webmanifest`, `sw.js`, `css/`,
`js/`, and `icons/` as-is. `server/ai-proxy.js` is a separate, optional,
local-only dev convenience and is not part of what gets deployed.

To put this on `heroos.appscloud365.com`:

1. Pick a static host (e.g. Netlify, Cloudflare Pages, GitHub Pages, Vercel)
   and deploy this repository's root to it. Every static host auto-provisions
   HTTPS, which the service worker requires.
2. That host will give you a target hostname (e.g. `your-site.netlify.app`)
   — DNS then points `heroos.appscloud365.com` at that target with a
   `CNAME` record (or per that host's docs).
3. **DNS is not configured automatically by this project** — nothing here
   touches your domain. Point `heroos.appscloud365.com`'s DNS at whichever
   host you choose once you've picked one.

Hash-based routing (`#/focus`, `#/action/<id>`) means a deep link can never
404 on refresh, on any static host, with zero server-side redirect rules —
this was a deliberate reason to keep it as-is rather than migrate to
path-based routing for this PWA pass.

## Project structure

- `index.html` — the page shell (header, sidebar, content area, mobile nav)
- `css/styles.css` — the whole visual theme
- `js/utils.js` — small helper functions (dates, ids, escaping)
- `js/store.js` — the only file that touches `localStorage`
- `js/state.js` — the app's data shape + load/save
- `js/toast.js` — the small "undo" snackbar used after deletes
- `js/commandPalette.js` — the ⌘/Ctrl+K command palette (dispatches to the same functions as everything else)
- `js/services/ai.js` — JARVIS's brain (local fallback, or calls `server/ai-proxy.js`)
- `js/services/hardware.js` — event bus for future ESP32/gesture/sensor hardware
- `js/services/nfc.js` — NFC action list + deep link builder
- `js/keyboard.js` — global keyboard shortcuts
- `js/views/*.js` — one file per screen; each owns its own data + UI
- `js/views/modes.js` — Study/Builder/Training, each a thin re-skin of Focus or Missions
- `js/views/connections.js` — people, not tasks
- `js/pwa.js` — service worker registration + install-prompt/iOS detection helpers
- `js/app.js` — router and page chrome, loaded last
- `manifest.webmanifest` — PWA metadata (name, icons, standalone display)
- `sw.js` — service worker (app-shell caching, offline support)
- `icons/` — the installed-app icon set
- `server/ai-proxy.js` — optional local backend for real JARVIS AI answers

See the project chat history for a full walkthrough of the architecture
and what to learn next.
