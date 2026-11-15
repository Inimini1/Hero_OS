import { describe, it, expect } from 'vitest';
import {
  createGadgetSlot,
  getMagnetRadius,
  hasShield,
  hasMegaCoin,
  getCoinMultiplier,
  getSpeedBoostDist,
  hasExtraRevive,
  GADGET_DEFS,
} from '../src/sim/gadgets';

function slots(a: Parameters<typeof createGadgetSlot>[0] = undefined as unknown as undefined, b: Parameters<typeof createGadgetSlot>[0] = undefined as unknown as undefined): [ReturnType<typeof createGadgetSlot>, ReturnType<typeof createGadgetSlot>] {
  const s1 = createGadgetSlot();
  const s2 = createGadgetSlot();
  if (a !== undefined) { (s1 as unknown as Record<string, unknown>)['id'] = a; }
  if (b !== undefined) { (s2 as unknown as Record<string, unknown>)['id'] = b; }
  return [s1, s2];
}

describe('GADGET_DEFS', () => {
  it('has 6 gadgets', () => {
    expect(GADGET_DEFS).toHaveLength(6);
  });
  it('each def has required fields', () => {
    for (const def of GADGET_DEFS) {
      expect(def.id).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.baseCost).toBeGreaterThan(0);
      expect(def.maxLevel).toBeGreaterThan(0);
    }
  });
});

describe('createGadgetSlot', () => {
  it('returns null id and 0 level', () => {
    const s = createGadgetSlot();
    expect(s.id).toBeNull();
    expect(s.level).toBe(0);
  });
});

describe('getMagnetRadius', () => {
  it('returns 0 when no magnet', () => {
    const s: [ReturnType<typeof createGadgetSlot>, ReturnType<typeof createGadgetSlot>] = [createGadgetSlot(), createGadgetSlot()];
    expect(getMagnetRadius(s)).toBe(0);
  });

  it('returns >0 when magnet equipped', () => {
    const s: [ReturnType<typeof createGadgetSlot>, ReturnType<typeof createGadgetSlot>] = [
      { id: 'magnet', level: 0 },
      createGadgetSlot(),
    ];
    expect(getMagnetRadius(s)).toBeGreaterThan(0);
  });

  it('increases with level', () => {
    const s1: [ReturnType<typeof createGadgetSlot>, ReturnType<typeof createGadgetSlot>] = [{ id: 'magnet', level: 0 }, createGadgetSlot()];
    const s2: [ReturnType<typeof createGadgetSlot>, ReturnType<typeof createGadgetSlot>] = [{ id: 'magnet', level: 2 }, createGadgetSlot()];
    expect(getMagnetRadius(s2)).toBeGreaterThan(getMagnetRadius(s1));
  });
});

describe('hasShield', () => {
  it('false with no shield', () => {
    expect(hasShield([createGadgetSlot(), createGadgetSlot()])).toBe(false);
  });
  it('true with shield in slot 0', () => {
    expect(hasShield([{ id: 'shield', level: 0 }, createGadgetSlot()])).toBe(true);
  });
});

describe('getCoinMultiplier', () => {
  it('returns 1 with no mega_coin', () => {
    expect(getCoinMultiplier([createGadgetSlot(), createGadgetSlot()])).toBe(1);
  });
  it('returns 2 at level 0', () => {
    expect(getCoinMultiplier([{ id: 'mega_coin', level: 0 }, createGadgetSlot()])).toBe(2);
  });
  it('returns 3 at level 1+', () => {
    expect(getCoinMultiplier([{ id: 'mega_coin', level: 1 }, createGadgetSlot()])).toBe(3);
  });
});

describe('getSpeedBoostDist', () => {
  it('returns 0 without start_boost', () => {
    expect(getSpeedBoostDist([createGadgetSlot(), createGadgetSlot()])).toBe(0);
  });
  it('returns positive distance with start_boost', () => {
    expect(getSpeedBoostDist([{ id: 'start_boost', level: 0 }, createGadgetSlot()])).toBeGreaterThan(0);
  });
});

describe('hasExtraRevive', () => {
  it('false without extra_revive', () => {
    expect(hasExtraRevive([createGadgetSlot(), createGadgetSlot()])).toBe(false);
  });
  it('true with extra_revive in slot 1', () => {
    expect(hasExtraRevive([createGadgetSlot(), { id: 'extra_revive', level: 0 }])).toBe(true);
  });
});
