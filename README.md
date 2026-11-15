# Rocket Rascal

An endless jetpack runner built entirely with TypeScript and HTML5 Canvas 2D — no runtime dependencies, no binary assets. All art is drawn procedurally in code and all audio is synthesized via the Web Audio API.

## Play

```
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Controls

| Input | Action |
|-------|--------|
| Space / Click / Tap | Thrust (hold to fly up, release to fall) |
| Escape | Pause / Resume |
| \` (backtick) | Toggle debug overlay |

## Features

- **6 vehicles**: Bounce Buggy, Gravity Suit, Sky Serpent, Stomp Mech, Wave Sub, Drill Rocket
- **9 mission types**: collect coins, fly meters, dodge missiles, use vehicles, near-misses, spin tokens, no-vehicle runs, and more
- **Rank system**: complete 3 missions per rank to level up and earn bonus coins
- **Shop**: buy gadgets, outfits, and jetpack skins
- **Daily challenge**: seeded daily run with a fixed leaderboard seed
- **Procedural music**: zone-specific scales and bass lines via Web Audio API
- **Accessibility**: reduced motion mode, colorblind-friendly UI, left-handed layout

## Build

```
npm run build
```

Output goes to `dist/`.

## Test

```
npm test          # unit tests (Vitest)
npm run e2e       # end-to-end tests (Playwright, requires dev server)
```

## Lint

```
npm run lint
```

## Technical notes

- Zero runtime dependencies — TypeScript + Vite only
- Zero binary assets — all art drawn with Canvas 2D paths/gradients, all audio synthesized with Web Audio oscillators and noise buffers
- Fixed-timestep simulation at 120 Hz with interpolated rendering
- Entity pools (pre-allocated arrays, no GC in the hot path)
- mulberry32 seeded PRNG for deterministic daily seeds and reproducible runs
- localStorage save with version migration

## Debug scenes and screenshots

Query params jump straight to a staged, frozen scene (no save data is written):

| Param | Values |
| --- | --- |
| `zone` | `lab`, `cavern`, `sky`, `neon`, `space` (or `0`-`4`) |
| `vehicle` | `bounce_buggy`, `gravity_suit`, `sky_serpent`, `stomp_mech`, `wave_sub`, `drill_rocket` |
| `hazard` | comma list of `zapper`, `zapper_rot`, `zapper_slide`, `laser_warn`, `laser_fire`, `missile_warn`, `missile`, `missile_homing`, `salvo`, `pendulum`, `vent`, `coins`, `token`, `crate`, `all` |
| `state` | `menu`, `floor`, `flying`, `falling`, `ceiling`, `dead`, `paused`, `gameover`, `gameover_best`, `shop`, `missions`, `settings`, `spin`, `spin_done` |

Modifiers: `live=1` animates the staged scene in place, `play=1` starts a real run in that zone/vehicle,
`t=<ticks>` sets the animation frame, `hud=0` hides the HUD, `outfit=`, `jetpack=`, `tab=` (shop tab).

Example: `http://localhost:5173/?zone=neon&hazard=zapper,missile&state=flying`

`npm run shots` captures every scene to `shots/` (git-ignored) with a contact sheet at `shots/index.html`.
Options: `--only <name>`, `--out <dir>`, `--url <running dev server>`.
