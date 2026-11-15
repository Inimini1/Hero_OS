import { CFG } from '../config';
import type { Hero } from './types';

export function createHero(): Hero {
  return {
    x: CFG.HERO_X,
    y: CFG.FLOOR_Y,
    vy: 0,
    thrustGain: 0,
    state: 'floor',
    floorRunFrame: 0,
    outfit: 0,
    jetpackStyle: 0,
    invulnTicks: 0,
    deathTimer: 0,
  };
}

/** Advance hero physics one sim tick.
 *  holding = true if thrust input is currently held.
 */
export function tickHero(hero: Hero, holding: boolean): void {
  if (hero.state === 'dead') {
    hero.deathTimer++;
    // Fly off in death arc
    hero.vy += CFG.GRAVITY * 1.5;
    hero.y += hero.vy;
    return;
  }

  if (hero.invulnTicks > 0) hero.invulnTicks--;

  // ── Thrust ramp ─────────────────────────────────────────────
  if (holding) {
    hero.thrustGain = Math.min(1, hero.thrustGain + 1 / CFG.THRUST_RAMP);
  } else {
    hero.thrustGain = Math.max(0, hero.thrustGain - 1 / (CFG.THRUST_RAMP * 0.5));
  }

  // ── Acceleration ────────────────────────────────────────────
  if (holding) {
    hero.vy -= CFG.THRUST * hero.thrustGain;
  }
  hero.vy += CFG.GRAVITY;

  // ── Clamp velocity ──────────────────────────────────────────
  hero.vy = Math.max(-CFG.MAX_VY, Math.min(CFG.MAX_VY, hero.vy));

  // ── Integrate ────────────────────────────────────────────────
  hero.y += hero.vy;

  // ── Floor collision ──────────────────────────────────────────
  if (hero.y >= CFG.FLOOR_Y) {
    hero.y = CFG.FLOOR_Y;
    if (hero.vy > CFG.FLOOR_BOUNCE * CFG.MAX_VY) {
      hero.vy = -hero.vy * CFG.FLOOR_BOUNCE;
    } else {
      hero.vy = 0;
    }
    hero.state = 'floor';
  } else if (hero.y <= CFG.CEILING_Y) {
    // ── Ceiling collision ──────────────────────────────────────
    hero.y = CFG.CEILING_Y;
    hero.vy = Math.abs(hero.vy) * 0.3; // small downward bounce
    hero.state = 'ceiling';
  } else {
    hero.state = 'flying';
  }

  // ── Floor run animation ──────────────────────────────────────
  if (hero.state === 'floor') {
    hero.floorRunFrame++;
  }
}

/** Kill the hero (transition to dead state). */
export function killHero(hero: Hero): void {
  if (hero.state === 'dead') return;
  hero.state = 'dead';
  hero.vy = -6; // launch upward on death
  hero.deathTimer = 0;
}
