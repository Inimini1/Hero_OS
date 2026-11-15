import { describe, it, expect } from 'vitest';
import { generateMissions, updateMissions, getMissionDescription } from '../src/sim/missions';
import { mulberry32 } from '../src/prng';

describe('generateMissions', () => {
  it('returns exactly count missions', () => {
    const rng = mulberry32(12345);
    const missions = generateMissions(0, rng, 3);
    expect(missions).toHaveLength(3);
  });

  it('each mission has required fields', () => {
    const rng = mulberry32(99);
    const missions = generateMissions(1, rng, 3);
    for (const m of missions) {
      expect(m.id).toBeGreaterThan(0);
      expect(m.target).toBeGreaterThan(0);
      expect(m.progress).toBe(0);
      expect(m.completed).toBe(false);
      expect(m.rewardCoins).toBeGreaterThan(0);
    }
  });

  it('higher rank produces higher targets on average', () => {
    const rng0 = mulberry32(42);
    const rng5 = mulberry32(42);
    const low = generateMissions(0, rng0, 3);
    const high = generateMissions(5, rng5, 3);
    const lowSum = low.reduce((s, m) => s + m.target, 0);
    const highSum = high.reduce((s, m) => s + m.target, 0);
    expect(highSum).toBeGreaterThan(lowSum);
  });
});

describe('updateMissions', () => {
  it('increments collect_coins progress', () => {
    const rng = mulberry32(1);
    const missions = generateMissions(0, rng, 3);
    const coinMission = missions.find(m => m.type === 'collect_coins');
    if (!coinMission) return; // might not be generated this seed
    const before = coinMission.progress;
    updateMissions(missions, 10, 0, 0, false, 10);
    expect(coinMission.progress).toBeGreaterThan(before);
  });

  it('marks mission completed when progress >= target', () => {
    const rng = mulberry32(555);
    const missions = generateMissions(0, rng, 3);
    const m = missions[0]!;
    m.type = 'collect_coins';
    m.target = 5;
    m.progress = 0;
    const count = updateMissions(missions, 5, 0, 0, false, 5);
    expect(m.completed).toBe(true);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('resets fly_meters_no_coins when coins collected', () => {
    const rng = mulberry32(777);
    const missions = generateMissions(0, rng, 1);
    const m = missions[0]!;
    m.type = 'fly_meters_no_coins';
    m.target = 1000;
    m.progress = 50;
    // coinsThisRun > 0 → reset
    updateMissions(missions, 1, 10, 0, false, 1);
    expect(m.progress).toBe(0);
  });

  it('near_miss increments near_miss mission', () => {
    const missions = [{ id: 1, type: 'near_miss' as const, target: 3, progress: 0, completed: false, rewardCoins: 100 }];
    updateMissions(missions, 0, 0, 0, false, 0, 1, 0, 0);
    expect(missions[0]!.progress).toBe(1);
  });

  it('no_vehicle_run resets when vehicle used', () => {
    const missions = [{ id: 1, type: 'no_vehicle_run' as const, target: 500, progress: 100, completed: false, rewardCoins: 300 }];
    updateMissions(missions, 0, 10, 0, true, 0, 0, 0, 1);
    expect(missions[0]!.progress).toBe(0);
  });

  it('collect_tokens increments from token pickups', () => {
    const missions = [{ id: 1, type: 'collect_tokens' as const, target: 2, progress: 0, completed: false, rewardCoins: 200 }];
    updateMissions(missions, 0, 0, 0, false, 0, 0, 2, 0);
    expect(missions[0]!.progress).toBe(2);
    expect(missions[0]!.completed).toBe(true);
  });
});

describe('getMissionDescription', () => {
  it('returns non-empty string for all types', () => {
    const types = ['collect_coins', 'fly_meters', 'dodge_missiles', 'use_vehicle',
                   'fly_meters_no_coins', 'collect_coins_one_run',
                   'near_miss', 'collect_tokens', 'no_vehicle_run'] as const;
    for (const type of types) {
      const m = { id: 1, type, target: 10, progress: 0, completed: false, rewardCoins: 100 };
      const desc = getMissionDescription(m);
      expect(desc.length).toBeGreaterThan(5);
    }
  });
});
