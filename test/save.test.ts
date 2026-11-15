import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultSave, recordRun, spendCoins } from '../src/save';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

describe('defaultSave', () => {
  it('has expected initial values', () => {
    const s = defaultSave();
    expect(s.coins).toBe(0);
    expect(s.bestDistance).toBe(0);
    expect(s.rank).toBe(0);
    expect(s.tutorialSeen).toBe(false);
    expect(Array.isArray(s.gadgetSlots)).toBe(true);
  });
});

describe('recordRun', () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

  it('adds coins and updates bestDistance, returns true for new best', () => {
    const s = defaultSave();
    const isNewBest = recordRun(s, 500, 20, 0, 0);
    expect(s.coins).toBe(20);
    expect(s.bestDistance).toBe(500);
    expect(isNewBest).toBe(true);
  });

  it('does not update bestDistance if not higher, returns false', () => {
    const s = defaultSave();
    s.bestDistance = 1000;
    const isNewBest = recordRun(s, 200, 5, 0, 0);
    expect(isNewBest).toBe(false);
    expect(s.bestDistance).toBe(1000);
  });

  it('adds spin tokens to save', () => {
    const s = defaultSave();
    recordRun(s, 0, 0, 2, 0);
    expect(s.spinTokens).toBeGreaterThanOrEqual(2);
  });
});

describe('spendCoins', () => {
  it('deducts coins and returns true when sufficient', () => {
    const s = defaultSave();
    s.coins = 100;
    expect(spendCoins(s, 30)).toBe(true);
    expect(s.coins).toBe(70);
  });

  it('returns false and does not deduct when insufficient', () => {
    const s = defaultSave();
    s.coins = 10;
    expect(spendCoins(s, 30)).toBe(false);
    expect(s.coins).toBe(10);
  });
});
