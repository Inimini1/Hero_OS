import type { GadgetId } from './sim/types';

const SAVE_KEY = 'rocket_rascal_v1';
const CURRENT_VERSION = 3;

export interface SaveData {
  version: number;
  coins: number;
  spinTokens: number;
  bestDistance: number;
  rank: number;
  rankProgress: number; // completed missions since last rank
  gadgetSlots: [{ id: GadgetId | null; level: number }, { id: GadgetId | null; level: number }];
  gadgetLevels: Partial<Record<GadgetId, number>>;
  outfit: number;
  jetpackStyle: number;
  unlockedOutfits: number[];
  unlockedJetpackStyles: number[];
  totalRuns: number;
  totalDistance: number;
  totalCoins: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  reducedMotion: boolean;
  colorblindMode: boolean;
  leftHanded: boolean;
  muted: boolean;
  tutorialSeen: boolean;
  pendingMissions: Array<{
    id: number;
    type: string;
    target: number;
    progress: number;
    completed: boolean;
    rewardCoins: number;
  }>;
}

export function defaultSave(): SaveData {
  return {
    version: CURRENT_VERSION,
    coins: 0,
    spinTokens: 0,
    bestDistance: 0,
    rank: 0,
    rankProgress: 0,
    gadgetSlots: [{ id: null, level: 0 }, { id: null, level: 0 }],
    gadgetLevels: {},
    outfit: 0,
    jetpackStyle: 0,
    unlockedOutfits: [0],
    unlockedJetpackStyles: [0],
    totalRuns: 0,
    totalDistance: 0,
    totalCoins: 0,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    screenShake: true,
    reducedMotion: false,
    colorblindMode: false,
    leftHanded: false,
    muted: false,
    tutorialSeen: false,
    pendingMissions: [],
  };
}

function migrate(raw: Partial<SaveData>): SaveData {
  const data = { ...defaultSave(), ...raw, version: CURRENT_VERSION };
  // v1→v2: add gadgetLevels
  if (!data.gadgetLevels) data.gadgetLevels = {};
  // v2→v3: add settings fields
  if (data.sfxVolume === undefined) data.sfxVolume = 0.8;
  if (data.musicVolume === undefined) data.musicVolume = 0.5;
  return data;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return migrate(parsed);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded – ignore
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

/** Call at the end of a run to update persistent stats. Returns true if new best. */
export function recordRun(
  save: SaveData,
  distanceMeters: number,
  coinsEarned: number,
  tokensEarned: number,
  completedMissions: number,
  missionRewardCoins = 0
): boolean {
  const newBest = distanceMeters > save.bestDistance;
  if (newBest) save.bestDistance = distanceMeters;
  save.coins += coinsEarned + missionRewardCoins;
  save.spinTokens += tokensEarned;
  save.totalRuns++;
  save.totalDistance += distanceMeters;
  save.totalCoins += coinsEarned;
  save.rankProgress += completedMissions;
  while (save.rankProgress >= CFG_MISSIONS_PER_RANK) {
    save.rank++;
    save.rankProgress -= CFG_MISSIONS_PER_RANK;
    save.coins += 100 * save.rank; // rank-up bonus
  }
  writeSave(save);
  return newBest;
}

const CFG_MISSIONS_PER_RANK = 3;

/** Spend coins. Returns true if successful. */
export function spendCoins(save: SaveData, amount: number): boolean {
  if (save.coins < amount) return false;
  save.coins -= amount;
  writeSave(save);
  return true;
}
