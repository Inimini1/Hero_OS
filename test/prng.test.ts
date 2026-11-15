import { describe, it, expect } from 'vitest';
import { mulberry32, rngRange, rngInt, rngPick, dailySeed } from '../src/prng';

describe('mulberry32', () => {
  it('produces deterministic output for same seed', () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    expect(r1()).toBe(r2());
    expect(r1()).toBe(r2());
    expect(r1()).toBe(r2());
  });

  it('produces different output for different seeds', () => {
    const r1 = mulberry32(1);
    const r2 = mulberry32(2);
    expect(r1()).not.toBe(r2());
  });

  it('outputs are in [0, 1)', () => {
    const rng = mulberry32(99999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rngRange', () => {
  it('stays within [min, max)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 500; i++) {
      const v = rngRange(rng, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });
});

describe('rngInt', () => {
  it('returns integers in [min, max-1] (floor of rngRange)', () => {
    const rng = mulberry32(555);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rngInt(rng, 0, 6); // [0, 5]
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });
});

describe('rngPick', () => {
  it('always picks from the array', () => {
    const rng = mulberry32(777);
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 200; i++) {
      const v = rngPick(rng, arr);
      expect(arr).toContain(v);
    }
  });
});

describe('dailySeed', () => {
  it('returns a number', () => {
    expect(typeof dailySeed()).toBe('number');
  });

  it('returns same seed for same date', () => {
    const d = new Date('2024-01-15');
    expect(dailySeed(d)).toBe(dailySeed(d));
  });

  it('returns different seeds for different dates', () => {
    const d1 = new Date('2024-01-15');
    const d2 = new Date('2024-01-16');
    expect(dailySeed(d1)).not.toBe(dailySeed(d2));
  });
});
