import type { OBB, Segment } from './physics';

// ── Hero ─────────────────────────────────────────────────────────────────

export type HeroState =
  | 'floor'      // running on floor
  | 'flying'     // in the air
  | 'ceiling'    // bumping ceiling
  | 'dead'       // death animation
  | 'vehicle';   // inside a vehicle

export interface Hero {
  x: number;
  y: number;
  vy: number;
  thrustGain: number;   // 0–1 ramp, increases while holding
  state: HeroState;
  floorRunFrame: number; // animation tick
  outfit: number;        // 0-9 cosmetic outfit index
  jetpackStyle: number;  // 0-4 jetpack visual
  invulnTicks: number;   // remaining invulnerability ticks
  deathTimer: number;    // counts up after death
}

// ── Hazards ──────────────────────────────────────────────────────────────

export type ZapperKind = 'static' | 'rotating' | 'sliding';

export interface Zapper {
  active: boolean;
  x: number;
  y: number;
  len: number;
  angle: number;        // radians
  kind: ZapperKind;
  angularVel: number;   // rad/tick, for rotating
  slideAmp: number;     // pixels amplitude for sliding
  slidePhase: number;   // current phase
  slideSpeed: number;   // rad/tick
  baseY: number;        // original y for sliding
  arcPhase: number;     // electric arc animation
}

export type LaserState = 'idle' | 'warn' | 'firing';

export interface Laser {
  active: boolean;
  x: number;         // spawn x (world-relative)
  y: number;         // vertical center
  state: LaserState;
  timer: number;     // ticks in current state
  warnX: number;     // screen-edge telegraph x
}

export type MissileKind = 'straight' | 'homing' | 'salvo';

export interface Missile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: MissileKind;
  warnTimer: number;   // countdown before launch
  homingTicks: number; // remaining homing ticks
  smokeTimer: number;
  salvoIndex: number;  // 0-2 for salvo variant
}

export interface Pendulum {
  active: boolean;
  x: number;         // pivot x (world coords)
  pivotY: number;    // pivot y
  length: number;
  angle: number;     // current angle (radians from vertical)
  angleVel: number;
  bobRadius: number;
}

export interface VacuumVent {
  active: boolean;
  x: number;
  y: number;        // top-left y of vent opening
  height: number;
  force: number;    // horizontal pull force
  timer: number;    // animation timer
}

// ── Coins ─────────────────────────────────────────────────────────────────

export interface Coin {
  active: boolean;
  x: number;
  y: number;
  collected: boolean;
  magnetized: boolean;
  magnetVx: number;
  magnetVy: number;
  animFrame: number;
}

export interface SpinToken {
  active: boolean;
  x: number;
  y: number;
  animFrame: number;
}

// ── Vehicles ──────────────────────────────────────────────────────────────

export type VehicleKind =
  | 'bounce_buggy'
  | 'gravity_suit'
  | 'sky_serpent'
  | 'stomp_mech'
  | 'wave_sub'
  | 'drill_rocket';

export interface VehicleCrate {
  active: boolean;
  x: number;
  y: number;
  kind: VehicleKind;
  dropAnim: number;  // 0=falling in, 1=landed
  dropVy: number;
}

export interface Vehicle {
  active: boolean;
  kind: VehicleKind;
  hp: number;         // 1 = alive, 0 = breaking
  breakTimer: number; // counts up during break animation
  // kind-specific state
  vy: number;
  flipped: boolean;   // for gravity suit
  serpentY: number;   // target y for sky serpent
  mechFrame: number;  // stomp mech animation
  drillTimer: number; // drill rocket duration
}

// ── Particles ─────────────────────────────────────────────────────────────

export type ParticleKind =
  | 'jetpack_fire'
  | 'jetpack_smoke'
  | 'casing'
  | 'coin_sparkle'
  | 'explosion'
  | 'missile_smoke'
  | 'vehicle_exhaust'
  | 'zapper_spark'
  | 'pickup_glow';

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // 0–1 (1 = new, 0 = dead)
  decay: number;     // life reduction per tick
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  gravity: number;   // per-particle gravity modifier
  rotation: number;
  rotVel: number;
}

// ── Missions ──────────────────────────────────────────────────────────────

export type MissionType =
  | 'collect_coins'
  | 'fly_meters'
  | 'dodge_missiles'
  | 'use_vehicle'
  | 'fly_meters_no_coins'
  | 'collect_coins_one_run'
  | 'near_miss'
  | 'collect_tokens'
  | 'no_vehicle_run';

export interface Mission {
  id: number;
  type: MissionType;
  target: number;
  progress: number;
  completed: boolean;
  rewardCoins: number;
}

// ── Gadgets ───────────────────────────────────────────────────────────────

export type GadgetId =
  | 'shield'
  | 'magnet'
  | 'extra_revive'
  | 'start_boost'
  | 'mega_coin'
  | 'lucky_charm';

export interface GadgetSlot {
  id: GadgetId | null;
  level: number;
}

// ── World state ───────────────────────────────────────────────────────────

export interface WorldState {
  tick: number;
  distance: number;      // world units scrolled
  speed: number;         // current scroll speed (units/tick)
  seed: number;
  paused: boolean;
  dead: boolean;
  hitStop: number;       // remaining hit-stop ticks

  hero: Hero;
  vehicle: Vehicle;

  zappers: Zapper[];
  lasers: Laser[];
  missiles: Missile[];
  pendulums: Pendulum[];
  vents: VacuumVent[];

  coins: Coin[];
  spinTokens: SpinToken[];
  vehicleCrates: VehicleCrate[];

  particles: Particle[];

  missions: Mission[];
  gadgets: [GadgetSlot, GadgetSlot];

  // Run totals
  coinsThisRun: number;
  tokensThisRun: number;
  missilesDodged: number;
  vehicleUses: number;
  nearMissThisRun: number;

  // Settings that affect sim
  reducedMotion: boolean;

  // Zone
  zoneIndex: number;    // 0-4
  zoneFade: number;     // 0–1 during transition

  // Chunk director state
  nextChunkX: number;   // world x where next chunk starts
  chunkRng: ReturnType<typeof import('../prng').mulberry32>;

  // Events (flushed each frame by render/audio)
  _events: Array<{ type: string; x?: number; y?: number; value?: number; id?: number }>;
}
