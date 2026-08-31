# Hero OS — Wearable JARVIS Project Audit

Phase 0 audit, per the wearable-glasses engineering spec. Covers what
exists today, what the Ray-Ban Meta integration needs, and what's
recommended before any Phase 1 code gets written.

## Existing Architecture

Hero OS today is a **no-build, static, local-first PWA**:

- No `package.json`, no bundler, no framework. Plain HTML/CSS/JS loaded
  via `<script>` tags in `index.html`, namespaced under a single global
  `window.HeroOS` object (`HeroOS.services.*`, `HeroOS.views.*`,
  `HeroOS.state`, `HeroOS.store`).
- Hash-based router (`#/dashboard`, `#/missions`, `#/jarvis`, etc.) — no
  server-side routing.
- All app data lives in `localStorage` via `js/store.js` / `js/state.js`.
  Nothing is sent to a server for core functionality.
- Deployed as static files to `heroos.appscloud365.com` (any static HTTPS
  host — currently GitHub Pages via `CNAME`). No backend is deployed.

## Working Features

- Missions (tasks), Focus Mode (resumable timer), Suit Check (multi-list
  checklists), Quick Capture, Connections, Daily Briefing (schedule +
  live Google Calendar/Gmail panels), Command Palette (⌘/Ctrl+K), NFC tag
  manager (up to 57 tags → deep-link actions), Settings (export/import,
  AI provider config), installable PWA (manifest + service worker,
  offline-capable for everything except live Google data and the AI
  proxy).
- **JARVIS chat** (`js/views/jarvis.js` + `js/services/ai.js`): local
  command mode by default (pattern-matches phrases like "today",
  "suit check", "calendar", "inbox" against real local/Google data) with
  an optional real-AI mode that calls a local proxy server.
- **Google Calendar + Gmail** (`js/services/google.js`): direct
  browser-to-Google OAuth via Google Identity Services, read-only. Token
  in `localStorage`, ~1hr expiry, inline reconnect UX. This is the
  closest existing thing to a "tool" the new JarvisAgent could call.
- **Morning brief automation** (added this session, separate track from
  the wearable work): `.claude/skills/morning-brief/`, `scripts/`
  (Fish Audio TTS, launchd job) — runs via the Claude Code CLI locally on
  the user's Mac, not part of the deployed PWA.

## Placeholder / Non-functional Features

- `js/services/hardware.js` — a **pure event-bus stub**. `EVENTS` enum
  (`GESTURE_DETECTED`, `SENSOR_READING`, `BUTTON_PRESSED`,
  `DEVICE_CONNECTED`, `DEVICE_DISCONNECTED`), `on/off/emit`, and a
  `triggerHaptic()` that only `console.log`s. **Nothing here talks to
  real hardware.** This is explicitly written as the seam for future
  hardware (ESP32-C3 gesture ring, Spider-Sense) to plug into — genuinely
  useful shape for wiring in Ray-Ban Meta glasses events too.
- `js/views/portal.js` — remote-control UI for a *separate* physical
  project (projector + ESP32 + gesture ring). Explicitly says "no
  hardware is connected yet." Same pattern as `hardware.js`: UI exists,
  wired to nothing real.
- `js/views/detective.js` — 27 lines, minimal/placeholder mode screen.
- Notion: **not wired into the browser at all** (confirmed in an earlier
  session — Notion's API has no CORS support, so it can't be called
  client-side; the token would be exposed in dev tools on the public
  site). Notion access only happens through Claude sessions with the
  Notion connector, not from the Hero OS app itself.

## Existing Backend

- **`server/ai-proxy.js`** (174 lines) — the only backend-shaped code in
  the repo. A small local Node server that holds `ANTHROPIC_API_KEY`
  server-side and proxies JARVIS chat requests so the key never ships to
  the browser. **Local-only dev convenience** — explicitly not part of
  what gets deployed to `heroos.appscloud365.com` (per README). No
  database, no auth system, no persistent server deployment anywhere.
- No Supabase, no other backend-as-a-service, no serverless functions.

## Existing PWA

- Framework: none (vanilla JS).
- Routing: hash-based, in `js/app.js`.
- State: `js/state.js` (in-memory current state) + `js/store.js`
  (localStorage persistence).
- Service worker: `sw.js`, cache name `hero-os-v2`, precaches the full
  app shell (all `js/services/*`, `js/views/*`, CSS, manifest) for
  offline use. Only Google Calendar/Gmail live data and the optional AI
  proxy require network.
- Manifest: `manifest.webmanifest` — standalone display, dark theme,
  192/512 icons.
- Offline behavior: everything except live Google data and real-AI mode
  works fully offline (confirmed in an earlier PWA verification pass).

## Existing Integrations

| Integration | Where | How | Status |
|---|---|---|---|
| Google Calendar | `js/services/google.js`, `js/views/briefing.js`, `js/services/ai.js` | Direct browser OAuth (Google Identity Services), read-only | Working |
| Gmail | same | Direct browser OAuth, read-only unread count | Working |
| Notion | Claude Code sessions only (not the app) | MCP connector tools, server-side | Working, but outside the PWA entirely |
| Anthropic API (real AI for JARVIS) | `server/ai-proxy.js` | Local Node proxy, key server-side | Working, local-dev-only, not deployed |
| Fish Audio (TTS) | `scripts/speak-brief.js` | Local Node script, called from shell only | Working, local Mac only |
| NFC tags | `js/services/nfc.js` | Deep-link routing (`#/action/...`), reads real NFC via browser Web NFC or manual tap-simulation — no physical hardware talking to it yet | UI works; physical NFC hardware not yet wired |
| Ray-Ban Meta glasses | **none** | — | Not started — this audit's subject |

## Recommended Preservation

- The entire existing PWA, as-is. Do not rewrite the router, state
  layer, or any working view.
- `js/services/hardware.js`'s event-bus pattern — it's already the right
  shape for a wearable device to emit `DEVICE_CONNECTED`,
  `SENSOR_READING` (repurposed for e.g. transcribed voice or vision
  results), etc. into. Extend it, don't replace it.
- `js/services/google.js`'s pattern (thin service module, clear
  connect/disconnect/fetch methods, honest error states, `wasEverConnected()`
  for reconnect UX) as the template for a new `js/services/wearable.js`
  status-mirror on the web side.
- `server/ai-proxy.js` as the starting point for a shared backend, if/when
  the iOS app needs a server to proxy Vision AI calls without embedding a
  secret key in the iOS binary.

## Recommended Refactoring

- None urgently required in the existing PWA to support the wearable
  work — the wearable interface is additive (a new `ios/` app + an
  optional thin status bridge into the PWA), not a rewrite of what's
  there.
- `server/ai-proxy.js` currently only handles JARVIS chat completions.
  If the iOS app needs a secure Vision AI proxy (Section 14/24 of the
  spec: "never expose API secrets in the iOS client"), this proxy is the
  natural place to add an `/api/vision` endpoint — but that also means it
  needs to go from "local dev convenience" to "something actually
  deployed and reachable from an iPhone off the user's home network,"
  which is a real infrastructure decision (see Blockers below).

## Recommended Deletion

- Nothing. No dead code found — `hardware.js` and `portal.js` are
  intentional placeholders documented as such, not abandoned code.

## New Architecture — how the iOS wearable client connects to Hero OS

Given Hero OS has **no deployed backend**, the cleanest Phase-1-through-7
architecture that doesn't force a premature backend decision:

```
Ray-Ban Meta Wayfarers
   |  (Meta Wearables Device Access Toolkit — camera, audio)
   v
iOS App (SwiftUI, new — ios/HeroOSWearables/)
   |  - WearableDeviceService / WearableCameraService / WearableAudioService
   |    (thin protocols wrapping MWDATCore/MWDATCamera)
   |  - JarvisAgent (intent routing: general / vision / tool / memory)
   |  - ToolRegistry (Calendar tool first — reuses the same read-only
   |    Google OAuth pattern as js/services/google.js, but via Google's
   |    iOS SDK / REST, since MWDAT is iOS-native)
   |  - VisionAIProvider (protocol; Anthropic as first implementation)
   |  - MemoryStore (local first — on-device store, e.g. SwiftData/
   |    UserDefaults for MVP; sync later if needed)
   v
Anthropic API (Vision + chat)
   - MVP: call directly from iOS using a key in an iOS Keychain-stored
     config the user enters once in-app (acceptable at hobby-MVP scale,
     matches "no backend" theme) OR
   - Preferred per spec (Section 24: "never put privileged backend
     secrets inside the iOS app"): stand up a minimal deployed proxy
     (extend server/ai-proxy.js, deploy it — e.g. a small always-on host)
     so the key never lives on the phone.
```

**The PWA's role stays exactly what it is today** — a control center for
missions/focus/briefing/etc. Section 22/23 of the spec (Devices tab,
recent-interaction sync between PWA and iOS) is realistic only once
*some* shared backend exists, because two independent clients
(browser + iPhone) can't sync state through `localStorage` alone. That's
a Phase 9 concern, not a Phase 1 blocker.

## Risks

1. **No backend exists.** Every "sync state between PWA and iOS" or
   "securely proxy AI requests" requirement needs *something* deployed
   and reachable from the open internet (not just `localhost`). This is
   the single biggest architectural gap versus the spec's assumptions in
   Sections 3, 22–24.
2. **This session cannot build or run the iOS app.** This is a Linux
   cloud container — no Xcode, no iOS Simulator, no physical device
   attach. I can write correct Swift source files using the real Meta
   DAT APIs (confirmed via the official plugin, not guessed), but
   **"the app builds successfully" (Phase 1's definition of done) can
   only be verified on the user's own Mac.** Every phase's hardware
   verification step (glasses connect, camera captures, audio plays
   through the glasses) requires the user's Mac + iPhone + the physical
   Wayfarers.
3. **Meta AI companion app + Developer Mode is a manual, one-time setup
   step on the user's phone** (Settings → Your glasses → Developer Mode)
   — cannot be scripted or done remotely.
4. **Time budget.** The spec assumes ~60–90 min/weekday. Standing up a
   new Xcode project, wiring SPM dependencies, and validating each phase
   against real hardware — with the user doing all Xcode/device work
   personally, since I can't — will likely take longer per phase than a
   fully-remote coding task would.
5. **MockDeviceKit exists** (confirmed via `mockdevice-testing` skill) —
   this is the mitigation for risk #2 during early development: Phase 1
   (project compiles) and parts of Phase 3–4 can be scaffolded and even
   partially tested by the user against a mock device before real
   glasses are involved, but final verification still needs the physical
   Wayfarers.

## Migration Plan (staged, matches spec Sections 35–36)

- **Phase 0 (this document) — done.**
- **Phase 1 — iOS foundation.** New `ios/HeroOSWearables/` SwiftUI
  project. Add MWDATCore + MWDATCamera via SPM. Configure `Info.plist`
  per the getting-started skill (URL scheme, external-accessory
  protocol, background modes, `MWDAT` dict). Call `Wearables.configure()`
  at launch. **User must open in Xcode and build — I'll write the
  files and hand over exact steps.**
- **Phase 2 — Meta connection.** `Wearables.shared.startRegistration()`,
  observe `registrationStateStream()`, create a `DeviceSession` via
  `AutoDeviceSelector`, surface CONNECTED/CONNECTING/DISCONNECTED/ERROR
  in the UI. Verified only on the user's Mac + iPhone + real Wayfarers
  (Developer Mode required).
- **Phase 3 — Camera (photo first, not streaming).** `addCamera()` +
  `stream.start()`, capture a single photo, preview it in the iOS app.
- **Phase 4 — Vision.** `VisionAIProvider` protocol; first implementation
  calls Anthropic directly (documented key-exposure tradeoff) or through
  a deployed proxy if the user wants to stand one up.
- **Phase 5 — Voice output.** TTS → iPhone audio route → glasses
  speakers (same Fish-Audio-style pipeline conceptually, but must run
  from Swift, not the Node script already built for the Mac morning
  brief — that script is unrelated to this and stays as-is).
- **Phase 6 — JarvisAgent + intent routing.**
- **Phase 7 — First tool.** Calendar, reusing the Google OAuth pattern
  already proven in `js/services/google.js` (ported to iOS/Google's iOS
  SDK).
- **Phase 8 — Memory** (local store, user-controlled save).
- **Phase 9 — PWA integration** (blocked on picking a backend — flagged
  as a decision point when we get there, not now).
- **Phase 10 — Polish.**

Per the spec: **do not implement Phase 2+ until Phase 1 is built and the
user has verified it compiles in Xcode.**
