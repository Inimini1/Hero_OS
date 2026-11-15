import { CFG } from './config';
import { createWorld } from './sim/world';
import { killHero } from './sim/hero';
import { makeZapper, makeLaser, makeMissile, makePendulum, makeVent, tickZappers, tickPendulums, tickVents } from './sim/hazards';
import { spawnCoin, spawnSpinToken } from './sim/coins';
import { spawnVehicleCrate, VEHICLE_KINDS } from './sim/vehicles';
import { emitJetpackFire, emitExplosion, emitMissileSmoke, tickParticles } from './sim/particles';
import type { WorldState, VehicleKind, Missile } from './sim/types';

export const DEBUG_ZONES = ['lab', 'cavern', 'sky', 'neon', 'space'] as const;

export const DEBUG_HAZARDS = [
  'zapper', 'zapper_rot', 'zapper_slide',
  'laser_warn', 'laser_fire',
  'missile_warn', 'missile', 'missile_homing', 'salvo',
  'pendulum', 'vent',
  'coins', 'token', 'crate',
  'all',
] as const;
export type DebugHazard = (typeof DEBUG_HAZARDS)[number];

export const DEBUG_STATES = [
  'menu',
  'floor', 'flying', 'falling', 'ceiling', 'dead',
  'paused', 'gameover', 'gameover_best',
  'shop', 'missions', 'settings',
  'spin', 'spin_done',
] as const;
export type DebugState = (typeof DEBUG_STATES)[number];

/** frozen = staged then held still; live = staged and animating in place; play = a real run. */
export type DebugMode = 'frozen' | 'live' | 'play';

export interface DebugRequest {
  zone: number;
  vehicle: VehicleKind | null;
  hazards: DebugHazard[];
  state: DebugState;
  mode: DebugMode;
  warmup: number;
  outfit: number;
  jetpack: number;
  tab: number;
  hud: boolean;
}

const STAGE_SEED = 0x5eed;
const DEFAULT_WARMUP = 240;

function intParam(params: URLSearchParams, key: string, fallback: number): number {
  const n = parseInt(params.get(key) ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Returns null when the URL carries no scene-jump params. */
export function parseDebugRequest(search: string): DebugRequest | null {
  const params = new URLSearchParams(search);
  const keys = ['zone', 'vehicle', 'hazard', 'state'];
  if (!keys.some(k => params.has(k))) return null;

  const zoneRaw = (params.get('zone') ?? '0').toLowerCase();
  const zoneByName = (DEBUG_ZONES as readonly string[]).indexOf(zoneRaw);
  const zone = Math.max(0, Math.min(4, zoneByName >= 0 ? zoneByName : parseInt(zoneRaw, 10) || 0));

  const vehicleRaw = params.get('vehicle');
  const vehicle = VEHICLE_KINDS.find(k => k === vehicleRaw) ?? null;

  const hazards = (params.get('hazard') ?? '')
    .split(',')
    .filter((h): h is DebugHazard => (DEBUG_HAZARDS as readonly string[]).includes(h));

  const stateRaw = params.get('state') ?? 'flying';
  const state = (DEBUG_STATES as readonly string[]).includes(stateRaw) ? (stateRaw as DebugState) : 'flying';

  const mode: DebugMode = params.get('play') === '1' ? 'play' : params.get('live') === '1' ? 'live' : 'frozen';

  return {
    zone,
    vehicle,
    hazards,
    state,
    mode,
    warmup: Math.max(0, Math.min(5000, intParam(params, 't', state === 'dead' ? 24 : DEFAULT_WARMUP))),
    outfit: Math.max(0, intParam(params, 'outfit', 0)),
    jetpack: Math.max(0, intParam(params, 'jetpack', 0)),
    tab: Math.max(0, intParam(params, 'tab', 0)),
    hud: params.get('hud') !== '0',
  };
}

const MID_Y = (CFG.FLOOR_Y + CFG.CEILING_Y) / 2;
const MISSILE_STAGE_X = 780;

// Ticks a staged missile still has to wait before launching from the right edge.
const launchDelay = new WeakMap<Missile, number>();

function stageMissile(state: WorldState, y: number, kind: Missile['kind'], warmup: number, salvoIndex = 0): void {
  const m = makeMissile(y, CFG.WORLD_W, kind, salvoIndex);
  m.warnTimer = 0;
  m.homingTicks = 0;
  // Launch from the real spawn x, timed so the warm-up ends with it on stage and its
  // trail is as old as it would be in a real run.
  const targetX = MISSILE_STAGE_X + salvoIndex * 90;
  const flightTicks = Math.ceil((m.x - targetX) / CFG.MISSILE_SPEED);
  m.x = targetX + flightTicks * CFG.MISSILE_SPEED;
  launchDelay.set(m, Math.max(0, warmup - flightTicks));
  state.missiles.push(m);
}

function stageHazard(state: WorldState, hazard: DebugHazard, warmup: number): void {
  switch (hazard) {
    case 'zapper':
      state.zappers.push(makeZapper({ x: 520, y: 190, len: 200, angle: 0 }));
      state.zappers.push(makeZapper({ x: 780, y: 430, len: 220, angle: Math.PI / 2 }));
      state.zappers.push(makeZapper({ x: 1040, y: 280, len: 220, angle: Math.PI / 4 }));
      break;
    case 'zapper_rot':
      state.zappers.push(makeZapper({ x: 760, y: MID_Y, len: 240, kind: 'rotating', angularVel: 0.012 }));
      break;
    case 'zapper_slide':
      state.zappers.push(makeZapper({ x: 760, y: MID_Y, len: 200, kind: 'sliding', slideAmp: 150, slideSpeed: 0.02 }));
      break;
    case 'laser_warn': {
      const l = makeLaser(CFG.WORLD_W / 2, 250);
      l.timer = Math.floor(CFG.LASER_WARN_TICKS * 0.6);
      state.lasers.push(l);
      break;
    }
    case 'laser_fire': {
      const l = makeLaser(CFG.WORLD_W / 2, 470);
      l.state = 'firing';
      l.timer = Math.floor(CFG.LASER_FIRE_TICKS * 0.3);
      state.lasers.push(l);
      break;
    }
    case 'missile_warn': {
      const m = makeMissile(200, CFG.WORLD_W, 'straight');
      m.warnTimer = Math.floor(CFG.MISSILE_WARN_TICKS * 0.5);
      state.missiles.push(m);
      break;
    }
    case 'missile':
      stageMissile(state, MID_Y, 'straight', warmup);
      break;
    case 'missile_homing':
      stageMissile(state, MID_Y - 90, 'homing', warmup);
      break;
    case 'salvo':
      for (let i = 0; i < 3; i++) stageMissile(state, 200 + i * 150, 'salvo', warmup, i);
      break;
    case 'pendulum':
      state.pendulums.push(makePendulum(820, CFG.CEILING_Y, 240));
      break;
    case 'vent':
      state.vents.push(makeVent(820, 200, 240));
      break;
    case 'coins':
      for (let i = 0; i < 14; i++) {
        spawnCoin(state.coins, 420 + i * 44, MID_Y + 110 - Math.sin((i / 13) * Math.PI) * 190);
      }
      break;
    case 'token':
      spawnSpinToken(state.spinTokens, 700, MID_Y - 60);
      break;
    case 'crate': {
      spawnVehicleCrate(state.vehicleCrates, 700, 'bounce_buggy');
      const crate = state.vehicleCrates.find(c => c.active);
      if (crate) { crate.y = 560; crate.dropAnim = 1; crate.dropVy = 0; }
      break;
    }
    case 'all':
      stageHazard(state, 'zapper', warmup);
      stageHazard(state, 'laser_warn', warmup);
      stageHazard(state, 'missile_warn', warmup);
      stageHazard(state, 'missile', warmup);
      stageHazard(state, 'coins', warmup);
      break;
  }
}

/** Build a hand-placed world for the request, warmed up so particles and animation are mid-flow. */
export function buildStagedWorld(req: DebugRequest): WorldState {
  const state = createWorld(STAGE_SEED);

  // Drop everything the chunk director primed so only staged entities remain.
  state.zappers = [];
  state.lasers = [];
  state.missiles = [];
  state.pendulums = [];
  state.vents = [];
  for (const c of state.coins) c.active = false;
  for (const t of state.spinTokens) t.active = false;
  for (const c of state.vehicleCrates) c.active = false;

  state.zoneIndex = req.zone;
  state.zoneFade = 1;
  state.distance = (req.zone * CFG.ZONE_DIST + 120) * CFG.UNITS_PER_METER;
  state.nextChunkX = Number.POSITIVE_INFINITY;
  state.coinsThisRun = 128;
  state.tokensThisRun = 2;

  const hero = state.hero;
  hero.outfit = req.outfit;
  hero.jetpackStyle = req.jetpack;
  switch (req.state) {
    case 'floor':
      hero.y = CFG.FLOOR_Y; hero.state = 'floor'; hero.thrustGain = 0; hero.vy = 0;
      break;
    case 'falling':
      hero.y = MID_Y; hero.state = 'flying'; hero.thrustGain = 0; hero.vy = 4;
      break;
    case 'ceiling':
      hero.y = CFG.CEILING_Y; hero.state = 'ceiling'; hero.thrustGain = 1; hero.vy = 0;
      break;
    default:
      hero.y = MID_Y; hero.state = 'flying'; hero.thrustGain = 1; hero.vy = -2;
  }

  if (req.vehicle) {
    const v = state.vehicle;
    v.active = true;
    v.kind = req.vehicle;
    v.hp = 1;
    v.serpentY = hero.y;
    const grounded = req.vehicle === 'bounce_buggy' || req.vehicle === 'stomp_mech';
    hero.y = grounded ? CFG.FLOOR_Y : MID_Y;
    hero.state = 'vehicle';
    hero.thrustGain = 0;
  }

  for (const h of req.hazards) stageHazard(state, h, req.warmup);

  if (req.state === 'dead') {
    state.dead = true;
    killHero(hero);
    emitExplosion(state.particles, state.chunkRng, hero.x, hero.y);
  }

  for (let i = 0; i < req.warmup; i++) stepStagedWorld(state);

  if (req.state === 'paused') state.paused = true;
  return state;
}

/** One cosmetic tick: animation and particles advance, the world does not scroll, nothing collides. */
export function stepStagedWorld(state: WorldState): void {
  state.tick++;
  const hero = state.hero;

  if (state.dead) {
    hero.deathTimer++;
    hero.vy += CFG.GRAVITY * 1.5;
    hero.y += hero.vy;
    tickParticles(state.particles, state.chunkRng);
    return;
  }

  if (hero.state === 'floor') hero.floorRunFrame++;
  if (state.vehicle.active) state.vehicle.mechFrame++;

  tickZappers(state.zappers, 0);
  tickPendulums(state.pendulums, 0);
  tickVents(state.vents, 0);

  for (const m of state.missiles) {
    if (!m.active || m.warnTimer > 0) continue;
    const delay = launchDelay.get(m) ?? 0;
    if (delay > 0) { launchDelay.set(m, delay - 1); continue; }
    m.x += m.vx;
    m.smokeTimer++;
    if (m.x < -100) { m.x = CFG.WORLD_W + 100; m.smokeTimer = 0; }
    if (m.x > 0 && m.x < CFG.WORLD_W + 100) emitMissileSmoke(state.particles, state.chunkRng, m.x, m.y);
  }
  for (const c of state.coins) if (c.active) c.animFrame++;
  for (const t of state.spinTokens) if (t.active) t.animFrame++;

  if (!state.vehicle.active) {
    emitJetpackFire(state.particles, state.chunkRng, hero.x, hero.y, hero.thrustGain, state.speed);
  }
  tickParticles(state.particles, state.chunkRng);
}
