import type { Mission, MissionType } from './types';
import { rngInt, rngPick } from '../prng';
import type { Rng } from '../prng';

interface MissionTemplate {
  type: MissionType;
  targetFn: (rank: number, rng: Rng) => number;
  rewardFn: (target: number) => number;
  description: (target: number) => string;
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    type: 'collect_coins',
    targetFn: (rank, rng) => rngInt(rng, 50 + rank * 30, 150 + rank * 60),
    rewardFn: t => Math.round(t * 1.5),
    description: t => `Collect ${t} coins in one run`,
  },
  {
    type: 'fly_meters',
    targetFn: (rank, rng) => rngInt(rng, 200 + rank * 100, 500 + rank * 200),
    rewardFn: t => Math.round(t * 0.8),
    description: t => `Fly ${t} meters`,
  },
  {
    type: 'dodge_missiles',
    targetFn: (rank, rng) => rngInt(rng, 2 + rank, 5 + rank * 2),
    rewardFn: t => t * 100,
    description: t => `Dodge ${t} missiles`,
  },
  {
    type: 'use_vehicle',
    targetFn: (rank, rng) => rngInt(rng, 1, 3 + rank),
    rewardFn: t => t * 150,
    description: t => `Use a vehicle ${t} times`,
  },
  {
    type: 'collect_coins_one_run',
    targetFn: (rank, rng) => rngInt(rng, 30 + rank * 20, 80 + rank * 40),
    rewardFn: t => Math.round(t * 2),
    description: t => `Collect ${t} coins without dying`,
  },
  {
    type: 'fly_meters_no_coins',
    targetFn: (rank, rng) => rngInt(rng, 100 + rank * 50, 300 + rank * 100),
    rewardFn: t => Math.round(t * 1.5),
    description: t => `Fly ${t} meters without collecting any coins`,
  },
];

let _nextMissionId = 1;

export function generateMissions(rank: number, rng: Rng, count = 3): Mission[] {
  const shuffled = [...MISSION_TEMPLATES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i] as MissionTemplate;
    shuffled[i] = shuffled[j] as MissionTemplate;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, count).map(tmpl => {
    const target = tmpl.targetFn(rank, rng);
    return {
      id: _nextMissionId++,
      type: tmpl.type,
      target,
      progress: 0,
      completed: false,
      rewardCoins: tmpl.rewardFn(target),
    };
  });
}

export function getMissionDescription(m: Mission): string {
  const tmpl = MISSION_TEMPLATES.find(t => t.type === m.type);
  return tmpl?.description(m.target) ?? m.type;
}

/** Update mission progress based on this-tick stats. */
export function updateMissions(
  missions: Mission[],
  coinsThisTick: number,
  metersThisTick: number,
  missilesDodgedThisTick: number,
  vehicleUsedThisTick: boolean,
  coinsThisRun: number
): number {
  let completed = 0;
  for (const m of missions) {
    if (m.completed) continue;
    switch (m.type) {
      case 'collect_coins':
      case 'collect_coins_one_run':
        m.progress = Math.min(m.target, m.progress + coinsThisTick);
        break;
      case 'fly_meters':
        m.progress = Math.min(m.target, m.progress + metersThisTick);
        break;
      case 'dodge_missiles':
        m.progress = Math.min(m.target, m.progress + missilesDodgedThisTick);
        break;
      case 'use_vehicle':
        if (vehicleUsedThisTick) m.progress = Math.min(m.target, m.progress + 1);
        break;
      case 'fly_meters_no_coins':
        if (coinsThisRun === 0) {
          m.progress = Math.min(m.target, m.progress + metersThisTick);
        } else {
          m.progress = 0; // reset if any coin collected
        }
        break;
    }
    if (m.progress >= m.target && !m.completed) {
      m.completed = true;
      completed++;
    }
  }
  return completed;
}
