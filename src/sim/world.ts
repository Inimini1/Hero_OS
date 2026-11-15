import { CFG } from '../config';
import { mulberry32 } from '../prng';
import type { WorldState, GadgetSlot } from './types';
import { createHero, tickHero, killHero } from './hero';
import { createVehicle, tickVehicle, tickVehicleCrates, hitVehicle, vehicleHitRadius, createVehicleCratePool } from './vehicles';
import {
  tickZappers, tickLasers, tickMissiles, tickPendulums, tickVents,
  checkZapperHit, checkLaserHit, checkMissileHit, checkPendulumHit,
  checkZapperNearMiss, checkLaserNearMiss, checkMissileNearMiss,
  applyVentForce, destroyMissilesAt,
} from './hazards';
import { createCoinPool, createSpinTokenPool, tickCoins } from './coins';
import {
  createParticlePool, tickParticles,
  emitJetpackFire, emitCoinCollect, emitExplosion, emitPickupGlow, emitMissileSmoke,
  emitVehicleBreak,
} from './particles';
import { generateMissions, updateMissions } from './missions';
import { spawnNextChunk, getDifficulty, getZoneIndex, cullOffscreen } from './director';
import { getMagnetRadius, hasShield, getCoinMultiplier, getSpeedBoostDist, createGadgetSlot } from './gadgets';

export function createWorld(seed: number, gadgets?: [GadgetSlot, GadgetSlot], reducedMotion = false): WorldState {
  const rng = mulberry32(seed);
  const slots: [GadgetSlot, GadgetSlot] = gadgets ?? [createGadgetSlot(), createGadgetSlot()];

  const state: WorldState = {
    tick: 0,
    distance: 0,
    speed: CFG.SCROLL_START,
    seed,
    paused: false,
    dead: false,
    hitStop: 0,

    hero: createHero(),
    vehicle: createVehicle(),

    zappers: [],
    lasers: [],
    missiles: [],
    pendulums: [],
    vents: [],

    coins: createCoinPool(),
    spinTokens: createSpinTokenPool(),
    vehicleCrates: createVehicleCratePool(),

    particles: createParticlePool(),

    missions: generateMissions(0, mulberry32(seed ^ 0xdeadbeef)),
    gadgets: slots,

    coinsThisRun: 0,
    tokensThisRun: 0,
    missilesDodged: 0,
    vehicleUses: 0,
    nearMissThisRun: 0,

    reducedMotion,

    zoneIndex: 0,
    zoneFade: 0,

    nextChunkX: CFG.WORLD_W + 200,
    chunkRng: mulberry32(seed ^ 0xc0ffee),

    _events: [],
  };

  // Apply start boost speed
  const boostDist = getSpeedBoostDist(slots);
  if (boostDist > 0) {
    state.speed = CFG.SCROLL_START * CFG.START_BOOST_MULT;
  }

  // Prime the first few chunks
  for (let i = 0; i < 3; i++) {
    state.nextChunkX = spawnNextChunk(state, state.chunkRng, 0);
  }

  return state;
}

/** Advance simulation one tick. holding = thrust input active. */
export function tickWorld(state: WorldState, holding: boolean): void {
  if (state.paused || state.hitStop > 0) {
    if (state.hitStop > 0) state.hitStop--;
    return;
  }

  state.tick++;

  // ── Dead hero animation ───────────────────────────────────────────────
  if (state.dead) {
    tickHero(state.hero, false);
    tickParticles(state.particles, state.chunkRng);
    return;
  }

  const distMeters = state.distance / CFG.UNITS_PER_METER;

  // ── Speed ramp ───────────────────────────────────────────────────────
  const boostDist = getSpeedBoostDist(state.gadgets);
  if (boostDist > 0 && state.distance < boostDist) {
    // Keep boost speed
  } else {
    const targetSpeed = CFG.SCROLL_START + (CFG.SCROLL_MAX - CFG.SCROLL_START) * Math.min(1, distMeters / 4000);
    state.speed += (targetSpeed - state.speed) * 0.001;
    state.speed = Math.min(CFG.SCROLL_MAX, state.speed);
  }

  const scrollDelta = state.speed;
  state.distance += scrollDelta;

  // ── Zone transitions ──────────────────────────────────────────────────
  const newZone = getZoneIndex(distMeters);
  if (newZone !== state.zoneIndex) {
    state._events.push({ type: 'zone_change', value: newZone });
    state.zoneIndex = newZone;
    state.zoneFade = 0;
  }
  if (state.zoneFade < 1) {
    state.zoneFade = Math.min(1, state.zoneFade + 1 / CFG.ZONE_FADE_TICKS);
  }

  // ── Vehicle ───────────────────────────────────────────────────────────
  const inVehicle = state.vehicle.active && state.vehicle.hp > 0;
  if (inVehicle) {
    tickVehicle(state.vehicle, state.hero, holding, scrollDelta);
    // Drill rocket clears all hazards
    if (state.vehicle.kind === 'drill_rocket') {
      state.zappers.forEach(z => { z.active = false; });
      state.lasers.forEach(l => { l.active = false; });
      state.missiles.forEach(m => { m.active = false; });
      state.pendulums.forEach(p => { p.active = false; });
    }
  } else {
    tickHero(state.hero, holding);
  }

  // ── Vehicle break check ───────────────────────────────────────────────
  if (state.vehicle.active && state.vehicle.hp <= 0) {
    tickVehicle(state.vehicle, state.hero, holding, scrollDelta);
  }

  // ── Vent force on hero ────────────────────────────────────────────────
  if (!inVehicle && !state.dead) {
    const ventDx = applyVentForce(state.vents, state.hero.x, state.hero.y, state.speed);
    if (ventDx !== 0) {
      // Vents pull hero; simulate as a horizontal push (hero is x-fixed, so just bounce)
      state.hero.vy += ventDx * 0.4;
    }
  }

  // ── Hazard tick ───────────────────────────────────────────────────────
  tickZappers(state.zappers, scrollDelta);
  tickLasers(state.lasers, scrollDelta, 0);
  tickMissiles(state.missiles, state.hero.x, state.hero.y, scrollDelta);
  tickPendulums(state.pendulums, scrollDelta);
  tickVents(state.vents, scrollDelta);

  // ── Missile dodged tracking ───────────────────────────────────────────
  const heroR = CFG.HERO_HIT_RADIUS;
  let newlyDodged = 0;
  for (const m of state.missiles) {
    if (m.active && m.warnTimer <= 0 && m.x < state.hero.x - 60 && !('_counted' in m)) {
      (m as unknown as Record<string, boolean>)['_counted'] = true;
      newlyDodged++;
    }
  }

  // ── Coin / token tick ─────────────────────────────────────────────────
  const magnetRadius = getMagnetRadius(state.gadgets);
  const coinResult = tickCoins(
    state.coins, state.spinTokens, scrollDelta,
    state.hero.x, state.hero.y,
    magnetRadius > 0, magnetRadius
  );

  const coinMult = getCoinMultiplier(state.gadgets);
  if (coinResult.coinsCollected > 0) {
    const earned = coinResult.coinsCollected * coinMult;
    state.coinsThisRun += earned;
    state._events.push({ type: 'coin_collected', value: earned });
    for (const pos of coinResult.collectPositions) {
      emitCoinCollect(state.particles, state.chunkRng, pos.x, pos.y);
    }
  }
  if (coinResult.spinTokensCollected > 0) {
    state.tokensThisRun += coinResult.spinTokensCollected;
    state._events.push({ type: 'spin_token_collected', value: coinResult.spinTokensCollected });
  }

  // ── Vehicle crate pickup ──────────────────────────────────────────────
  const crateIdx = tickVehicleCrates(state.vehicleCrates, scrollDelta, state.hero.x, state.hero.y);
  if (crateIdx >= 0 && !inVehicle) {
    const crate = state.vehicleCrates[crateIdx];
    if (crate) {
      state.vehicle.active = true;
      state.vehicle.kind = crate.kind;
      state.vehicle.hp = 1;
      state.vehicle.breakTimer = 0;
      state.vehicle.vy = 0;
      state.vehicle.flipped = false;
      state.vehicle.drillTimer = 0;
      state.vehicle.serpentY = state.hero.y;
      state.vehicle.mechFrame = 0;
      state.vehicleUses++;
      emitPickupGlow(state.particles, state.chunkRng, state.hero.x, state.hero.y);
      state._events.push({ type: 'vehicle_start', id: state.vehicle.kind as unknown as number });
    }
  }

  // ── Drill rocket timer expiry ─────────────────────────────────────────
  if (inVehicle && state.vehicle.kind === 'drill_rocket' && state.vehicle.drillTimer > CFG.SIM_HZ * 5) {
    endVehicle(state, 204, 34, 0);
  }

  // ── Stomp mech: hard-landing clears hazards once per landing ─────────
  if (inVehicle && state.vehicle.kind === 'stomp_mech') {
    const prevVy = state.vehicle.vy;
    if (state.hero.y >= CFG.FLOOR_Y && prevVy > 6) {
      destroyMissilesAt(state.missiles, state.hero.x, state.hero.y, 120);
      // Clear zappers in radius on hard stomp
      for (const z of state.zappers) {
        if (!z.active) continue;
        const dx = z.x - state.hero.x;
        const dy = z.y - state.hero.y;
        if (dx * dx + dy * dy < 160 * 160) z.active = false;
      }
    }
  }

  // ── Collision detection ───────────────────────────────────────────────
  if (state.hero.invulnTicks <= 0 && !state.dead) {
    const vr = inVehicle ? vehicleHitRadius(state.vehicle.kind) : 0;
    const hx = state.hero.x, hy = state.hero.y;

    const hit =
      checkZapperHit(state.zappers, hx, hy, inVehicle ? vr : heroR) ||
      checkLaserHit(state.lasers, hx, hy, inVehicle ? vr : heroR) ||
      checkMissileHit(state.missiles, hx, hy, inVehicle ? vr : heroR) ||
      checkPendulumHit(state.pendulums, hx, hy, inVehicle ? vr : heroR);

    if (hit) {
      if (inVehicle) {
        // Vehicle absorbs hit
        const broke = hitVehicle(state.vehicle);
        if (broke) {
          endVehicle(state, ...vehicleBreakColor(state.vehicle.kind));
          state.hero.invulnTicks = CFG.SHIELD_INVULN_TICKS;
        }
      } else if (hasShield(state.gadgets) && state.hero.invulnTicks === 0) {
        // Shield absorbs hit
        state.hero.invulnTicks = CFG.SHIELD_INVULN_TICKS;
        // Remove shield gadget after use (once per run, check if first time)
        state._events.push({ type: 'shield_hit' });
      } else {
        // Die
        state.dead = true;
        state.hitStop = CFG.HIT_STOP_TICKS;
        killHero(state.hero);
        emitExplosion(state.particles, state.chunkRng, hx, hy);
        state._events.push({ type: 'hero_died', x: hx, y: hy });
        state.vehicle.active = false;
      }
    }
  }

  // ── Near-miss detection ───────────────────────────────────────────────
  let nearMissThisTick = 0;
  if (!state.dead && state.hero.invulnTicks <= 0) {
    const hx = state.hero.x, hy = state.hero.y;
    const nearMiss =
      checkZapperNearMiss(state.zappers, hx, hy, CFG.HERO_HIT_RADIUS) ||
      checkLaserNearMiss(state.lasers, hx, hy, CFG.HERO_HIT_RADIUS) ||
      checkMissileNearMiss(state.missiles, hx, hy, CFG.HERO_HIT_RADIUS);
    if (nearMiss) {
      nearMissThisTick = 1;
      state.nearMissThisRun++;
      state._events.push({ type: 'near_miss' });
    }
  }

  // ── Missile smoke particles ───────────────────────────────────────────
  for (const m of state.missiles) {
    if (m.active && m.warnTimer <= 0 && m.x > 0 && m.x < CFG.WORLD_W + 100) {
      emitMissileSmoke(state.particles, state.chunkRng, m.x, m.y);
    }
  }

  // ── Particles ─────────────────────────────────────────────────────────
  if (!state.dead && !state.reducedMotion) {
    emitJetpackFire(
      state.particles, state.chunkRng,
      state.hero.x, state.hero.y,
      state.hero.thrustGain, scrollDelta
    );
  }
  tickParticles(state.particles, state.chunkRng);

  // ── Mission progress ──────────────────────────────────────────────────
  const metersThisTick = scrollDelta / CFG.UNITS_PER_METER;
  const completed = updateMissions(
    state.missions,
    coinResult.coinsCollected,
    metersThisTick,
    newlyDodged,
    crateIdx >= 0,
    state.coinsThisRun,
    nearMissThisTick,
    coinResult.spinTokensCollected,
    state.vehicleUses
  );
  if (completed > 0) {
    state._events.push({ type: 'mission_complete', value: completed });
  }
  if (newlyDodged > 0) {
    state.missilesDodged += newlyDodged;
  }

  // ── Chunk director ────────────────────────────────────────────────────
  if (state.nextChunkX - state.distance < CFG.WORLD_W * 1.5) {
    state.nextChunkX = spawnNextChunk(state, state.chunkRng, state.distance);
  }
  cullOffscreen(state);
}

function vehicleBreakColor(kind: string): [number, number, number] {
  switch (kind) {
    case 'bounce_buggy':  return [255, 119, 0];
    case 'gravity_suit':  return [136, 0, 255];
    case 'sky_serpent':   return [0, 204, 68];
    case 'stomp_mech':    return [136, 153, 170];
    case 'wave_sub':      return [0, 136, 204];
    case 'drill_rocket':  return [204, 34, 0];
    default:              return [200, 200, 200];
  }
}

function endVehicle(state: WorldState, r: number, g: number, b: number): void {
  emitVehicleBreak(state.particles, state.chunkRng, state.hero.x, state.hero.y, r, g, b);
  state.vehicle.hp = 0;
  state.vehicle.breakTimer = 0;
  state._events.push({ type: 'vehicle_end' });
}
