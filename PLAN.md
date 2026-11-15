# Rocket Rascal – Build Plan

## Working Title
**Rocket Rascal** – An original endless-runner in the style of Jetpack Joyride.
Hero: **Zara Volt**, an eccentric inventor with a cobbled-together bullet-pack jetpack.

## Milestones

| # | Name | Status |
|---|------|--------|
| M1 | Scaffold, loop, input, hero physics, floor/ceiling, jetpack feel | TODO |
| M2 | Rendering, parallax, zone-1 art, particles, camera effects | TODO |
| M3 | Chunk director, hazards (zappers, lasers, missiles), collisions, death, game over | TODO |
| M4 | Coins, economy, save system, HUD, menu, pause | TODO |
| M5 | Vehicles 1–6 with pickups | TODO |
| M6 | Gadgets, upgrades, shop, cosmetics, spin tokens, revive | TODO |
| M7 | Missions, ranks, daily seed, remaining zones | TODO |
| M8 | Audio and music | TODO |
| M9 | Accessibility, settings, mobile touch polish, performance pass | TODO |
| M10 | Tests, Playwright, lint, README, final balance pass | TODO |

## File Tree

```
rocket-rascal/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── .prettierrc
├── PLAN.md
├── README.md
├── src/
│   ├── main.ts               # Entry: canvas setup, scene router, loop kick-off
│   ├── config.ts             # All tunables with comments
│   ├── prng.ts               # mulberry32 seeded PRNG
│   ├── loop.ts               # Fixed-timestep loop (120 Hz sim, interpolated render)
│   ├── input.ts              # Unified keyboard/mouse/touch/gamepad input
│   ├── audio.ts              # Web Audio synthesis & music scheduler
│   ├── save.ts               # localStorage persistence with migration
│   ├── debug.ts              # Debug overlay (backtick toggle, stripped in prod)
│   ├── events.ts             # Lightweight event bus between sim→render/audio
│   ├── sim/
│   │   ├── types.ts          # All simulation types / interfaces
│   │   ├── world.ts          # WorldState, tick(), createWorld()
│   │   ├── hero.ts           # Hero physics (thrust, gravity, floor/ceiling)
│   │   ├── hazards.ts        # Zapper, laser, missile, pendulum, vent spawn+update
│   │   ├── coins.ts          # Coin spawning, magnet collection
│   │   ├── vehicles.ts       # 6 vehicle states and physics
│   │   ├── gadgets.ts        # Gadget effects per tick
│   │   ├── particles.ts      # Particle pool, emitters
│   │   ├── chunks.ts         # 40+ chunk templates, parser, validator
│   │   ├── director.ts       # Chunk director, difficulty curve
│   │   ├── missions.ts       # Mission templates, progress tracking
│   │   └── physics.ts        # Circle/OBB/capsule collision primitives
│   ├── render/
│   │   ├── canvas.ts         # Canvas setup, DPR scaling, offscreen layers
│   │   ├── hero.ts           # Procedural hero art + animations
│   │   ├── hazards.ts        # Hazard drawing (glow, arcs, beams)
│   │   ├── background.ts     # Parallax layers for all 5 zones
│   │   ├── vehicles.ts       # Vehicle art
│   │   ├── particles.ts      # Particle rendering
│   │   ├── hud.ts            # HUD overlay (distance, coins, mission ticker)
│   │   ├── effects.ts        # Screen shake, vignette, zoom punch, bloom
│   │   └── ui.ts             # Menu/overlay UI rendering
│   └── scenes/
│       ├── types.ts          # Scene interface
│       ├── boot.ts           # First-frame init
│       ├── menu.ts           # Main menu (animated hero, buttons)
│       ├── run.ts            # Gameplay scene
│       ├── paused.ts         # Pause overlay
│       ├── gameover.ts       # Game over screen
│       ├── shop.ts           # Shop screen
│       ├── missions.ts       # Missions screen
│       └── settings.ts       # Settings screen
├── test/
│   ├── physics.test.ts       # Collision primitives
│   ├── prng.test.ts          # Determinism of seeded PRNG
│   ├── chunks.test.ts        # Chunk validator (bot proves every template beatable)
│   ├── save.test.ts          # Save/load/migration
│   └── world.test.ts         # Sim determinism
└── e2e/
    └── smoke.spec.ts         # Playwright: boot → menu → play 10s → game over path
```

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Physics doesn't feel right | Tune in config.ts; expose in debug overlay |
| Chunk validator is slow | Cache results; run only in test, not runtime |
| Audio context suspended | Unlock on first pointer/key event |
| Performance on mobile | Adaptive particles, pre-rendered BG layers |
| Bundle over 300 KB | No runtime deps; tree-shake audio nodes |

## Decisions Made

- Hero x position is FIXED at 220 world units; world scrolls left.
- 1 meter = 100 world units (displayed distance in meters).
- Sim tick rate: 120 Hz. Render: uncapped, interpolated.
- Vehicle "lives": each vehicle absorbs exactly 1 hit, then breaks.
- Chunk grid: 48 × 9 tiles at 40 units/tile = 1920 × 360 layout space (centered in 720h world).
- Zone transition every ~1500 m with a 3-second cross-fade.
- Minimum coin value: 1. Coin magnet radius: 180 units.
- Spin token chance: 1 per ~600 m.
- Daily seed = Date.getFullYear() * 10000 + (month+1) * 100 + day.
