import { describe, it, expect } from 'vitest';
import { createWorld, tickWorld } from '../src/sim/world';
import { CFG } from '../src/config';

describe('createWorld', () => {
  it('creates world with correct initial hero position', () => {
    const world = createWorld(42);
    expect(world.hero.x).toBe(CFG.HERO_X);
    expect(world.hero.y).toBe(CFG.FLOOR_Y);
    expect(world.hero.state).toBe('floor');
  });

  it('starts with zero distance and low speed', () => {
    const world = createWorld(1);
    expect(world.distance).toBe(0);
    expect(world.speed).toBeCloseTo(CFG.SCROLL_START, 1);
  });

  it('different seeds produce same initial structure', () => {
    const w1 = createWorld(111);
    const w2 = createWorld(222);
    expect(w1.hero.x).toBe(w2.hero.x);
    expect(w1.hero.y).toBe(w2.hero.y);
  });
});

describe('tickWorld', () => {
  it('hero rises when holding thrust (after ramp)', () => {
    const world = createWorld(1);
    world.hero.state = 'flying';
    world.hero.y = CFG.WORLD_H / 2;
    world.hero.thrustGain = 1; // fully ramped
    const startY = world.hero.y;
    tickWorld(world, true);
    expect(world.hero.y).toBeLessThan(startY);
  });

  it('hero falls when not holding', () => {
    const world = createWorld(1);
    world.hero.state = 'flying';
    world.hero.y = CFG.WORLD_H / 2;
    world.hero.vy = 0;
    const startY = world.hero.y;
    tickWorld(world, false);
    expect(world.hero.y).toBeGreaterThan(startY);
  });

  it('hero does not go above ceiling', () => {
    const world = createWorld(1);
    world.hero.state = 'flying';
    world.hero.y = CFG.CEILING_Y + 1;
    world.hero.vy = -20; // moving up fast
    tickWorld(world, false);
    expect(world.hero.y).toBeGreaterThanOrEqual(CFG.CEILING_Y);
  });

  it('hero does not go below floor', () => {
    const world = createWorld(1);
    world.hero.state = 'flying';
    world.hero.y = CFG.FLOOR_Y - 1;
    world.hero.vy = 20; // moving down fast
    tickWorld(world, false);
    expect(world.hero.y).toBeLessThanOrEqual(CFG.FLOOR_Y);
  });

  it('distance increases each tick', () => {
    const world = createWorld(1);
    const d0 = world.distance;
    tickWorld(world, false);
    expect(world.distance).toBeGreaterThan(d0);
  });

  it('world is not dead after one tick with no hazards', () => {
    const world = createWorld(1);
    // Clear all hazards
    world.zappers.forEach(z => { z.active = false; });
    world.lasers.forEach(l => { l.active = false; });
    world.missiles.forEach(m => { m.active = false; });
    world.pendulums.forEach(p => { p.active = false; });
    world.vents.forEach(v => { v.active = false; });
    world.hero.state = 'flying';
    world.hero.y = CFG.WORLD_H / 2;
    tickWorld(world, false);
    expect(world.dead).toBe(false);
  });
});
