import { CFG } from '../config';
import type { Particle, ParticleKind } from './types';
import type { Rng } from '../prng';

export function createParticlePool(): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < CFG.PARTICLE_MAX; i++) {
    pool.push({
      active: false, kind: 'jetpack_fire',
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, decay: 0, size: 1,
      r: 255, g: 255, b: 255, a: 1,
      gravity: 0, rotation: 0, rotVel: 0,
    });
  }
  return pool;
}

export function spawnParticle(
  pool: Particle[],
  props: Partial<Particle> & { kind: ParticleKind; x: number; y: number }
): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i] as Particle;
    if (!p.active) {
      p.active = true;
      p.kind = props.kind;
      p.x = props.x;
      p.y = props.y;
      p.vx = props.vx ?? 0;
      p.vy = props.vy ?? 0;
      p.life = 1;
      p.decay = props.decay ?? 0.03;
      p.size = props.size ?? 4;
      p.r = props.r ?? 255;
      p.g = props.g ?? 255;
      p.b = props.b ?? 255;
      p.a = 1;
      p.gravity = props.gravity ?? 0;
      p.rotation = props.rotation ?? 0;
      p.rotVel = props.rotVel ?? 0;
      return;
    }
  }
}

export function tickParticles(pool: Particle[], rng: Rng): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i] as Particle;
    if (!p.active) continue;
    p.life -= p.decay;
    if (p.life <= 0) { p.active = false; continue; }
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotVel;
    p.a = p.life;
  }
  void rng; // rng used by callers for spawn randomness
}

/** Emit jetpack fire burst from behind the hero. */
export function emitJetpackFire(
  pool: Particle[], rng: Rng,
  heroX: number, heroY: number,
  thrustGain: number, speed: number
): void {
  const count = thrustGain > 0.1 ? 4 : 1;
  for (let i = 0; i < count; i++) {
    const angle = Math.PI + (rng() - 0.5) * 0.6;
    const spd = 3 + rng() * 4 * thrustGain;
    const isCore = rng() > 0.4;
    spawnParticle(pool, {
      kind: 'jetpack_fire',
      x: heroX - 14 + (rng() - 0.5) * 6,
      y: heroY + 4 + (rng() - 0.5) * 4,
      vx: Math.cos(angle) * spd - speed * 0.3,
      vy: Math.sin(angle) * spd,
      decay: 0.08 + rng() * 0.06,
      size: isCore ? 6 + thrustGain * 4 : 3 + rng() * 3,
      r: isCore ? 255 : 255,
      g: isCore ? 200 + thrustGain * 55 : 120,
      b: isCore ? 60 : 20,
      gravity: 0.05,
    });
  }
  // Smoke trail
  if (rng() > 0.6) {
    spawnParticle(pool, {
      kind: 'jetpack_smoke',
      x: heroX - 18 + (rng() - 0.5) * 4,
      y: heroY + 4,
      vx: -1.5 - rng() * 2,
      vy: (rng() - 0.5) * 1.5,
      decay: 0.015,
      size: 8 + rng() * 6,
      r: 160, g: 160, b: 160,
      gravity: -0.02,
    });
  }
  // Shell casings at floor level occasionally
  if (thrustGain > 0.3 && rng() > 0.85) {
    spawnParticle(pool, {
      kind: 'casing',
      x: heroX - 10,
      y: heroY + 8,
      vx: -1 - rng() * 2,
      vy: 1 + rng() * 2,
      decay: 0.008,
      size: 2,
      r: 220, g: 180, b: 60,
      gravity: 0.15,
      rotation: rng() * Math.PI * 2,
      rotVel: (rng() - 0.5) * 0.4,
    });
  }
}

/** Coin sparkle on collect. */
export function emitCoinCollect(pool: Particle[], rng: Rng, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    spawnParticle(pool, {
      kind: 'coin_sparkle',
      x, y,
      vx: Math.cos(angle) * (1.5 + rng() * 2),
      vy: Math.sin(angle) * (1.5 + rng() * 2) - 1,
      decay: 0.07,
      size: 3 + rng() * 2,
      r: 255, g: 230, b: 60,
      gravity: 0.03,
    });
  }
}

/** Death explosion. */
export function emitExplosion(pool: Particle[], rng: Rng, x: number, y: number): void {
  for (let i = 0; i < 40; i++) {
    const angle = rng() * Math.PI * 2;
    const spd = 2 + rng() * 8;
    const hot = rng() > 0.5;
    spawnParticle(pool, {
      kind: 'explosion',
      x: x + (rng() - 0.5) * 10,
      y: y + (rng() - 0.5) * 10,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 2,
      decay: 0.025 + rng() * 0.025,
      size: hot ? 8 + rng() * 10 : 4 + rng() * 6,
      r: hot ? 255 : 255,
      g: hot ? 220 : 100,
      b: hot ? 80 : 20,
      gravity: 0.1,
    });
  }
}

/** Pickup glow burst. */
export function emitPickupGlow(pool: Particle[], rng: Rng, x: number, y: number): void {
  for (let i = 0; i < 16; i++) {
    const angle = rng() * Math.PI * 2;
    spawnParticle(pool, {
      kind: 'pickup_glow',
      x, y,
      vx: Math.cos(angle) * (1 + rng() * 3),
      vy: Math.sin(angle) * (1 + rng() * 3),
      decay: 0.04,
      size: 6 + rng() * 8,
      r: 100, g: 200, b: 255,
      gravity: 0,
    });
  }
}

/** Missile smoke trail — called per active missile each tick. */
export function emitMissileSmoke(pool: Particle[], rng: Rng, x: number, y: number): void {
  if (rng() > 0.5) return; // throttle
  const isHot = rng() > 0.6;
  spawnParticle(pool, {
    kind: 'missile_smoke',
    x: x + 10 + rng() * 4,
    y: y + (rng() - 0.5) * 4,
    vx: 1.5 + rng() * 1.5, // trails behind (missile moves left)
    vy: (rng() - 0.5) * 1.2,
    decay: 0.025 + rng() * 0.02,
    size: isHot ? 5 + rng() * 5 : 4 + rng() * 4,
    r: isHot ? 255 : 120,
    g: isHot ? 160 : 120,
    b: isHot ? 40 : 120,
    gravity: -0.015,
  });
}

/** Count active particles. */
export function countActiveParticles(pool: Particle[]): number {
  let n = 0;
  for (let i = 0; i < pool.length; i++) {
    if ((pool[i] as Particle).active) n++;
  }
  return n;
}
