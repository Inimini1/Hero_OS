import type { GadgetSlot, GadgetId } from './types';

export interface GadgetDef {
  id: GadgetId;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  levelLabel: (level: number) => string;
}

export const GADGET_DEFS: GadgetDef[] = [
  {
    id: 'shield',
    name: 'Shield Bubble',
    description: 'Absorbs one hit per run',
    baseCost: 500,
    maxLevel: 3,
    levelLabel: l => ['1 hit', '1 hit + regen', '2 hits'][l] ?? '2 hits',
  },
  {
    id: 'magnet',
    name: 'Coin Magnet',
    description: 'Attracts nearby coins',
    baseCost: 400,
    maxLevel: 3,
    levelLabel: l => ['Small', 'Medium', 'Large'][l] ?? 'Large',
  },
  {
    id: 'extra_revive',
    name: 'Extra Revive',
    description: 'Start with an extra revive token',
    baseCost: 600,
    maxLevel: 2,
    levelLabel: l => `${l + 1} extra revive${l > 0 ? 's' : ''}`,
  },
  {
    id: 'start_boost',
    name: 'Start Boost',
    description: 'Launch at high speed for the first 300m',
    baseCost: 350,
    maxLevel: 2,
    levelLabel: l => ['300m boost', '500m boost'][l] ?? '500m boost',
  },
  {
    id: 'mega_coin',
    name: 'Mega Coin',
    description: 'Coins are worth double',
    baseCost: 800,
    maxLevel: 2,
    levelLabel: l => ['2x coins', '3x coins'][l] ?? '3x coins',
  },
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    description: 'Better spin machine odds',
    baseCost: 450,
    maxLevel: 2,
    levelLabel: l => ['+15% luck', '+30% luck'][l] ?? '+30% luck',
  },
];

export function createGadgetSlot(): GadgetSlot {
  return { id: null, level: 0 };
}

export function getMagnetRadius(slots: [GadgetSlot, GadgetSlot]): number {
  for (const slot of slots) {
    if (slot.id === 'magnet') {
      return 120 + slot.level * 60;
    }
  }
  return 0;
}

export function hasShield(slots: [GadgetSlot, GadgetSlot]): boolean {
  return slots.some(s => s.id === 'shield');
}

export function hasMegaCoin(slots: [GadgetSlot, GadgetSlot]): boolean {
  return slots.some(s => s.id === 'mega_coin');
}

export function getCoinMultiplier(slots: [GadgetSlot, GadgetSlot]): number {
  for (const slot of slots) {
    if (slot.id === 'mega_coin') return slot.level === 0 ? 2 : 3;
  }
  return 1;
}

export function getSpeedBoostDist(slots: [GadgetSlot, GadgetSlot]): number {
  for (const slot of slots) {
    if (slot.id === 'start_boost') return slot.level === 0 ? 30000 : 50000; // world units
  }
  return 0;
}
