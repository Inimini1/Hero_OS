/** All game tunables in one place. */
export const CFG = {
  // ── World ──────────────────────────────────────────────────────────────
  WORLD_W: 1280,
  WORLD_H: 720,
  HERO_X: 220,          // hero's fixed horizontal position
  FLOOR_Y: 672,         // hero center y when standing on floor
  CEILING_Y: 48,        // hero center y when at ceiling

  // ── Physics ────────────────────────────────────────────────────────────
  GRAVITY: 0.11,        // downward acceleration per sim tick (120 Hz)
  THRUST: 0.28,         // upward acceleration per sim tick when holding
  THRUST_RAMP: 10,      // ticks to reach full thrust (≈ 83 ms)
  MAX_VY: 11,           // terminal velocity (both directions)
  HERO_RADIUS: 18,      // collision circle radius (visual is slightly larger)
  HERO_HIT_RADIUS: 14,  // forgiving hitbox radius
  FLOOR_BOUNCE: 0.05,   // slight bounce coefficient when landing

  // ── Scroll ─────────────────────────────────────────────────────────────
  SCROLL_START: 5.5,    // world units per tick at start
  SCROLL_MAX: 13,       // world units per tick maximum
  SCROLL_ACCEL: 0.00003,// speed increase per distance unit

  // ── Distance ────────────────────────────────────────────────────────────
  UNITS_PER_METER: 100, // 100 world units = 1 meter displayed

  // ── Chunk system ────────────────────────────────────────────────────────
  CHUNK_TILE: 40,       // world units per tile
  CHUNK_COLS: 48,       // tiles wide per chunk
  CHUNK_GAP_EASY: 4,    // safe tile gap at the start
  CHUNK_GAP_MIN: 1,     // minimum gap between hazards

  // ── Coins ───────────────────────────────────────────────────────────────
  COIN_RADIUS: 10,
  COIN_MAGNET_RADIUS: 180,
  COIN_MAGNET_SPEED: 8,
  COIN_VALUE: 1,
  COIN_MEGA_MULT: 2,

  // ── Spin tokens ─────────────────────────────────────────────────────────
  SPIN_TOKEN_DIST: 600, // average meters between spin token spawns

  // ── Gadgets ─────────────────────────────────────────────────────────────
  SHIELD_INVULN_TICKS: 90,  // invulnerability frames after shield absorbs hit
  START_BOOST_DIST: 300,    // meters of boost
  START_BOOST_MULT: 2.2,    // speed multiplier

  // ── Vehicles ────────────────────────────────────────────────────────────
  VEHICLE_CRATE_DIST: 800,  // average meters between vehicle crate spawns
  VEHICLE_HIT_RADIUS: 30,

  // ── Hazards ─────────────────────────────────────────────────────────────
  ZAPPER_GLOW: 6,           // glow radius for zapper
  LASER_WARN_TICKS: 90,     // ticks of warning before laser fires
  LASER_FIRE_TICKS: 60,     // ticks laser stays active
  LASER_COOLDOWN_TICKS: 90, // ticks before laser can fire again
  MISSILE_WARN_TICKS: 100,  // ticks of warning before missile launches
  MISSILE_SPEED: 9,
  MISSILE_HOMING_TICKS: 80, // ticks of homing for homing variant
  MISSILE_RADIUS: 12,

  // ── Particles ──────────────────────────────────────────────────────────
  PARTICLE_MAX: 1200,
  PARTICLE_ADAPTIVE_THRESHOLD: 14, // ms frame time before we start culling

  // ── Zones ───────────────────────────────────────────────────────────────
  ZONE_DIST: 1500,      // meters per zone
  ZONE_FADE_TICKS: 180, // cross-fade duration in ticks

  // ── Camera ──────────────────────────────────────────────────────────────
  SHAKE_DEATH: 18,      // pixels
  SHAKE_NEAR_MISS: 5,
  SHAKE_DECAY: 0.85,
  HIT_STOP_TICKS: 7,    // sim tick freeze on death

  // ── Mission ─────────────────────────────────────────────────────────────
  MISSIONS_ACTIVE: 3,
  MISSIONS_PER_RANK: 3,

  // ── Economy ─────────────────────────────────────────────────────────────
  REVIVE_BASE_COST: 500,
  REVIVE_COST_MULT: 2,

  // ── UI ──────────────────────────────────────────────────────────────────
  UI_SCALE: 1,          // set by canvas.ts based on actual size

  // ── Simulation ──────────────────────────────────────────────────────────
  SIM_HZ: 120,
  SIM_DT: 1 / 120,
  DELTA_MAX: 0.1,       // cap frame delta to avoid spiral of death

  // ── Debug ───────────────────────────────────────────────────────────────
  DEBUG_DEFAULT: false,
} as const;

export type Cfg = typeof CFG;
