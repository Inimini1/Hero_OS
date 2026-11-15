import { CFG } from '../config';
import type { Zapper, Laser, Missile, Pendulum, VacuumVent, ZapperKind, MissileKind } from './types';

// ── Factories ──────────────────────────────────────────────────────────────

export function makeZapper(overrides: Partial<Zapper> & { x: number; y: number }): Zapper {
  return {
    active: true,
    x: overrides.x,
    y: overrides.y,
    len: overrides.len ?? 160,
    angle: overrides.angle ?? 0,
    kind: overrides.kind ?? 'static',
    angularVel: overrides.angularVel ?? 0,
    slideAmp: overrides.slideAmp ?? 0,
    slidePhase: overrides.slidePhase ?? 0,
    slideSpeed: overrides.slideSpeed ?? 0.02,
    baseY: overrides.baseY ?? overrides.y,
    arcPhase: 0,
  };
}

export function makeLaser(x: number, y: number): Laser {
  return {
    active: true,
    x,
    y,
    state: 'warn',
    timer: 0,
    warnX: 0,
  };
}

export function makeMissile(
  y: number,
  screenRight: number,
  kind: MissileKind = 'straight',
  salvoIndex = 0
): Missile {
  return {
    active: true,
    x: screenRight + 100,
    y,
    vx: -CFG.MISSILE_SPEED,
    vy: 0,
    kind,
    warnTimer: CFG.MISSILE_WARN_TICKS,
    homingTicks: kind === 'homing' ? CFG.MISSILE_HOMING_TICKS : 0,
    smokeTimer: 0,
    salvoIndex,
  };
}

export function makePendulum(x: number, pivotY: number, len: number): Pendulum {
  return {
    active: true,
    x,
    pivotY,
    length: len,
    angle: -0.8,
    angleVel: 0,
    bobRadius: 24,
  };
}

export function makeVent(x: number, y: number, height: number): VacuumVent {
  return {
    active: true,
    x,
    y,
    height,
    force: 2.8,
    timer: 0,
  };
}

// ── Tick functions ──────────────────────────────────────────────────────────

export function tickZappers(zappers: Zapper[], scrollDelta: number): void {
  for (let i = 0; i < zappers.length; i++) {
    const z = zappers[i] as Zapper;
    if (!z.active) continue;
    z.x -= scrollDelta;
    if (z.x < -400) { z.active = false; continue; }

    z.arcPhase += 0.3;

    if (z.kind === 'rotating') {
      z.angle += z.angularVel;
    }
    if (z.kind === 'sliding') {
      z.slidePhase += z.slideSpeed;
      z.y = z.baseY + Math.sin(z.slidePhase) * z.slideAmp;
    }
  }
}

export function tickLasers(lasers: Laser[], scrollDelta: number, worldOffsetX: number): void {
  for (let i = 0; i < lasers.length; i++) {
    const l = lasers[i] as Laser;
    if (!l.active) continue;
    l.x -= scrollDelta;
    if (l.x < -200) { l.active = false; continue; }

    l.timer++;
    if (l.state === 'warn' && l.timer >= CFG.LASER_WARN_TICKS) {
      l.state = 'firing';
      l.timer = 0;
    } else if (l.state === 'firing' && l.timer >= CFG.LASER_FIRE_TICKS) {
      l.state = 'idle';
      l.timer = 0;
    } else if (l.state === 'idle' && l.timer >= CFG.LASER_COOLDOWN_TICKS) {
      l.state = 'warn';
      l.timer = 0;
    }
    void worldOffsetX;
  }
}

export function tickMissiles(missiles: Missile[], heroX: number, heroY: number, scrollDelta: number): void {
  for (let i = 0; i < missiles.length; i++) {
    const m = missiles[i] as Missile;
    if (!m.active) continue;

    if (m.warnTimer > 0) {
      m.warnTimer--;
      m.x -= scrollDelta; // follow the world
      continue;
    }

    // Flying
    m.x += m.vx;
    m.y += m.vy;
    m.smokeTimer++;

    if (m.kind === 'homing' && m.homingTicks > 0) {
      m.homingTicks--;
      const dy = heroY - m.y;
      const targetVy = Math.sign(dy) * Math.min(Math.abs(dy) * 0.08, 3);
      m.vy += (targetVy - m.vy) * 0.12;
      m.vy = Math.max(-5, Math.min(5, m.vy));
    }

    if (m.x < -100) m.active = false;
  }
}

export function tickPendulums(pendulums: Pendulum[], scrollDelta: number): void {
  const G = 0.004; // pendulum gravity constant
  for (let i = 0; i < pendulums.length; i++) {
    const p = pendulums[i] as Pendulum;
    if (!p.active) continue;
    p.x -= scrollDelta;
    if (p.x < -300) { p.active = false; continue; }
    // Simple pendulum physics
    p.angleVel += -G * Math.sin(p.angle);
    p.angleVel *= 0.998; // damping
    p.angle += p.angleVel;
  }
}

export function tickVents(vents: VacuumVent[], scrollDelta: number): void {
  for (let i = 0; i < vents.length; i++) {
    const v = vents[i] as VacuumVent;
    if (!v.active) continue;
    v.x -= scrollDelta;
    if (v.x < -200) { v.active = false; continue; }
    v.timer++;
  }
}

/** Returns true if the hero (at hx, hy, radius hr) overlaps any active zapper. */
export function checkZapperHit(zappers: Zapper[], hx: number, hy: number, hr: number): boolean {
  for (let i = 0; i < zappers.length; i++) {
    const z = zappers[i] as Zapper;
    if (!z.active) continue;
    // Build OBB for the zapper bar
    const hw = z.len / 2;
    const hh = 5; // half-thickness
    // Transform hero into zapper local space
    const cos = Math.cos(-z.angle);
    const sin = Math.sin(-z.angle);
    const dx = hx - z.x;
    const dy = hy - z.y;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const nx = Math.max(-hw, Math.min(hw, lx));
    const ny = Math.max(-hh, Math.min(hh, ly));
    const ex = lx - nx, ey = ly - ny;
    if (ex * ex + ey * ey < hr * hr) return true;
  }
  return false;
}

/** Returns true if hero overlaps a firing laser. */
export function checkLaserHit(lasers: Laser[], hx: number, hy: number, hr: number): boolean {
  for (let i = 0; i < lasers.length; i++) {
    const l = lasers[i] as Laser;
    if (!l.active || l.state !== 'firing') continue;
    // Laser is a horizontal beam at l.y spanning the full width
    if (Math.abs(hy - l.y) < hr + 4) return true;
  }
  return false;
}

/** Returns true if hero overlaps any active missile. */
export function checkMissileHit(missiles: Missile[], hx: number, hy: number, hr: number): boolean {
  for (let i = 0; i < missiles.length; i++) {
    const m = missiles[i] as Missile;
    if (!m.active || m.warnTimer > 0) continue;
    const dx = hx - m.x;
    const dy = hy - m.y;
    const mr = hr + CFG.MISSILE_RADIUS;
    if (dx * dx + dy * dy < mr * mr) return true;
  }
  return false;
}

/** Returns true if hero overlaps pendulum bob. */
export function checkPendulumHit(pendulums: Pendulum[], hx: number, hy: number, hr: number): boolean {
  for (let i = 0; i < pendulums.length; i++) {
    const p = pendulums[i] as Pendulum;
    if (!p.active) continue;
    const bobX = p.x + Math.sin(p.angle) * p.length;
    const bobY = p.pivotY + Math.cos(p.angle) * p.length;
    const dx = hx - bobX, dy = hy - bobY;
    const r = hr + p.bobRadius;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/** Apply vacuum vent force to hero if inside vent. Returns force delta-x. */
export function applyVentForce(vents: VacuumVent[], hx: number, hy: number, speed: number): number {
  for (let i = 0; i < vents.length; i++) {
    const v = vents[i] as VacuumVent;
    if (!v.active) continue;
    if (hx > v.x && hx < v.x + 60 && hy > v.y && hy < v.y + v.height) {
      return -v.force; // pull left (into the vent wall)
    }
  }
  void speed;
  return 0;
}

/** Deactivate any missile that the hero (or vehicle) collides with. Returns count. */
export function destroyMissilesAt(
  missiles: Missile[], x: number, y: number, radius: number
): number {
  let count = 0;
  for (let i = 0; i < missiles.length; i++) {
    const m = missiles[i] as Missile;
    if (!m.active || m.warnTimer > 0) continue;
    const dx = x - m.x, dy = y - m.y;
    const r = radius + CFG.MISSILE_RADIUS;
    if (dx * dx + dy * dy < r * r) {
      m.active = false;
      count++;
    }
  }
  return count;
}
