import { CFG } from '../config';
import type { Vehicle, VehicleCrate, VehicleKind } from './types';
import type { Hero } from './types';

export function createVehicle(): Vehicle {
  return {
    active: false, kind: 'bounce_buggy', hp: 1, breakTimer: 0,
    vy: 0, flipped: false, serpentY: CFG.WORLD_H / 2,
    mechFrame: 0, drillTimer: 0,
  };
}

export function createVehicleCratePool(size = 8): VehicleCrate[] {
  const pool: VehicleCrate[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({ active: false, x: 0, y: 0, kind: 'bounce_buggy', dropAnim: 0, dropVy: 0 });
  }
  return pool;
}

export function spawnVehicleCrate(
  pool: VehicleCrate[], x: number, kind: VehicleKind
): void {
  for (let i = 0; i < pool.length; i++) {
    const c = pool[i] as VehicleCrate;
    if (!c.active) {
      c.active = true;
      c.x = x;
      c.y = -40;    // starts above screen
      c.kind = kind;
      c.dropAnim = 0;
      c.dropVy = 2;
      return;
    }
  }
}

export const VEHICLE_KINDS: VehicleKind[] = [
  'bounce_buggy', 'gravity_suit', 'sky_serpent',
  'stomp_mech', 'wave_sub', 'drill_rocket',
];

/** Tick vehicle crates (falling in). Returns index of crate if hero touches it, -1 otherwise. */
export function tickVehicleCrates(
  crates: VehicleCrate[], scrollDelta: number,
  heroX: number, heroY: number
): number {
  for (let i = 0; i < crates.length; i++) {
    const c = crates[i] as VehicleCrate;
    if (!c.active) continue;
    c.x -= scrollDelta;

    if (c.dropAnim < 1) {
      c.dropVy += 0.4;
      c.y += c.dropVy;
      // Land at y = 580 (above floor)
      if (c.y >= 560) {
        c.y = 560;
        c.dropAnim = 1;
        c.dropVy = -c.dropVy * 0.3;
        if (Math.abs(c.dropVy) < 0.5) c.dropVy = 0;
      }
    }

    if (c.x < -100) { c.active = false; continue; }

    const dx = heroX - c.x, dy = heroY - c.y;
    if (dx * dx + dy * dy < (CFG.HERO_RADIUS + 30) ** 2) {
      c.active = false;
      return i;
    }
  }
  return -1;
}

/** Tick vehicle physics when hero is inside one. */
export function tickVehicle(
  vehicle: Vehicle, hero: Hero, holding: boolean, scrollDelta: number
): void {
  if (!vehicle.active) return;

  if (vehicle.hp <= 0) {
    vehicle.breakTimer++;
    if (vehicle.breakTimer > 40) {
      vehicle.active = false;
    }
    return;
  }

  switch (vehicle.kind) {
    case 'bounce_buggy': tickBounceBuggy(vehicle, hero, holding); break;
    case 'gravity_suit': tickGravitySuit(vehicle, hero, holding); break;
    case 'sky_serpent': tickSkySerpent(vehicle, hero, holding, scrollDelta); break;
    case 'stomp_mech': tickStompMech(vehicle, hero, holding); break;
    case 'wave_sub': tickWaveSub(vehicle, hero, holding); break;
    case 'drill_rocket': tickDrillRocket(vehicle, hero); break;
  }
}

function tickBounceBuggy(v: Vehicle, hero: Hero, holding: boolean): void {
  v.vy += 0.3; // gravity
  if (holding && hero.y >= CFG.FLOOR_Y - 2) {
    v.vy = -9; // big hop
  }
  hero.y += v.vy;
  if (hero.y >= CFG.FLOOR_Y) {
    hero.y = CFG.FLOOR_Y;
    v.vy = 0;
  }
  if (hero.y <= CFG.CEILING_Y) {
    hero.y = CFG.CEILING_Y;
    v.vy = Math.abs(v.vy) * 0.5;
  }
}

function tickGravitySuit(v: Vehicle, hero: Hero, holding: boolean): void {
  if (holding && !v.flipped) {
    v.flipped = true;
  } else if (!holding && v.flipped) {
    v.flipped = false;
  }
  const gravity = v.flipped ? -0.25 : 0.25;
  v.vy += gravity;
  v.vy = Math.max(-8, Math.min(8, v.vy));
  hero.y += v.vy;
  if (v.flipped && hero.y <= CFG.CEILING_Y) {
    hero.y = CFG.CEILING_Y;
    v.vy = Math.abs(v.vy) * 0.3;
  }
  if (!v.flipped && hero.y >= CFG.FLOOR_Y) {
    hero.y = CFG.FLOOR_Y;
    v.vy = 0;
  }
}

function tickSkySerpent(v: Vehicle, hero: Hero, holding: boolean, _scrollDelta: number): void {
  // Target follows pointer smoothly; for keyboard/touch use hold/release
  const targetY = holding ? CFG.CEILING_Y + 60 : CFG.FLOOR_Y - 60;
  v.serpentY += (targetY - v.serpentY) * 0.06;
  hero.y += (v.serpentY - hero.y) * 0.08;
  hero.y = Math.max(CFG.CEILING_Y, Math.min(CFG.FLOOR_Y, hero.y));
}

function tickStompMech(v: Vehicle, hero: Hero, holding: boolean): void {
  v.mechFrame++;
  v.vy += 0.4;
  if (holding && hero.y >= CFG.FLOOR_Y - 2) {
    v.vy = -11;
  }
  hero.y += v.vy;
  if (hero.y >= CFG.FLOOR_Y) {
    hero.y = CFG.FLOOR_Y;
    if (v.vy > 4) {
      // Stomp impact - could destroy nearby hazards
    }
    v.vy = 0;
  }
  if (hero.y <= CFG.CEILING_Y) {
    hero.y = CFG.CEILING_Y;
    v.vy = Math.abs(v.vy) * 0.3;
  }
}

function tickWaveSub(v: Vehicle, hero: Hero, holding: boolean): void {
  const targetVy = holding ? -4 : 4;
  v.vy += (targetVy - v.vy) * 0.08;
  v.vy = Math.max(-6, Math.min(6, v.vy));
  hero.y += v.vy;
  hero.y = Math.max(CFG.CEILING_Y, Math.min(CFG.FLOOR_Y, hero.y));
}

function tickDrillRocket(v: Vehicle, hero: Hero): void {
  v.drillTimer++;
  // Keep hero at mid height, ignore all hazards for 5 seconds
  hero.y += (CFG.WORLD_H / 2 - hero.y) * 0.05;
  if (v.drillTimer > CFG.SIM_HZ * 5) {
    // End drill
    v.hp = 0;
  }
}

/** Hit a vehicle (absorbs one hit). Returns true if vehicle breaks. */
export function hitVehicle(vehicle: Vehicle): boolean {
  if (!vehicle.active || vehicle.hp <= 0) return false;
  vehicle.hp = 0;
  vehicle.breakTimer = 0;
  return true;
}

/** Get vehicle hit radius. */
export function vehicleHitRadius(kind: VehicleKind): number {
  switch (kind) {
    case 'stomp_mech': return 36;
    case 'drill_rocket': return 28;
    default: return CFG.VEHICLE_HIT_RADIUS;
  }
}
