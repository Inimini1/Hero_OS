import { CFG } from '../config';
import type { Rng } from '../prng';
import { rngWeighted, rngPick } from '../prng';
import { CHUNK_TEMPLATES, getTemplatesForDifficulty, type ChunkTemplate, type ChunkSpawn } from './chunks';
import type { ChunkCategory } from './chunks';
import {
  makeZapper, makeLaser, makeMissile, makePendulum, makeVent,
} from './hazards';
import { spawnCoin, spawnSpinToken } from './coins';
import { spawnVehicleCrate } from './vehicles';
import type { WorldState } from './types';

/** Difficulty 0–1 based on distance in meters. */
export function getDifficulty(distMeters: number): number {
  return Math.min(1, distMeters / 4000);
}

/** Zone index (0–4) based on distance. */
export function getZoneIndex(distMeters: number): number {
  return Math.min(4, Math.floor(distMeters / CFG.ZONE_DIST));
}

/** Pick and spawn the next chunk. Returns the new nextChunkX. */
export function spawnNextChunk(state: WorldState, rng: Rng, worldOffsetX: number): number {
  const distMeters = state.distance / CFG.UNITS_PER_METER;
  const difficulty = getDifficulty(distMeters);

  // Weight categories: more hard chunks at higher difficulty
  const categories: ChunkCategory[] = ['easy', 'medium', 'hard', 'coin_art', 'rest'];
  const weights = [
    Math.max(0, 0.4 - difficulty * 0.3),  // easy decreases
    0.3,                                     // medium constant
    Math.min(0.5, difficulty * 0.5),         // hard increases
    0.15,                                    // coin art
    Math.max(0.05, 0.1 - difficulty * 0.05), // rest decreases
  ];

  // Every ~800m force a vehicle intro
  if (distMeters > 200 && Math.floor((distMeters - 50) / 800) > Math.floor((distMeters - 50 - (state.nextChunkX - worldOffsetX) / CFG.UNITS_PER_METER) / 800)) {
    const vehicleIntros = CHUNK_TEMPLATES.filter(t => t.category === 'vehicle_intro');
    const tmpl = rngPick(rng, vehicleIntros);
    return applyChunk(state, tmpl, worldOffsetX, rng);
  }

  const templates = getTemplatesForDifficulty(difficulty, [
    rngWeighted(rng, categories, weights),
  ]);
  const tmpl = templates.length > 0
    ? rngPick(rng, templates)
    : rngPick(rng, CHUNK_TEMPLATES.filter(t => t.category === 'rest'));

  return applyChunk(state, tmpl, worldOffsetX, rng);
}

function applyChunk(state: WorldState, tmpl: ChunkTemplate, worldOffsetX: number, rng: Rng): number {
  const baseX = state.nextChunkX - worldOffsetX; // relative to current viewport start

  for (const spawn of tmpl.spawns) {
    const wx = spawn.x + baseX;
    spawnFromDescriptor(state, spawn, wx, rng);
  }

  return state.nextChunkX + tmpl.width;
}

function spawnFromDescriptor(state: WorldState, spawn: ChunkSpawn, wx: number, rng: Rng): void {
  switch (spawn.type) {
    case 'zapper': {
      const z = makeZapper({
        x: wx + CFG.WORLD_W,
        y: spawn.y ?? 360,
        len: spawn.len ?? 160,
        angle: spawn.angle ?? 0,
        kind: (spawn.kind as Parameters<typeof makeZapper>[0]['kind']) ?? 'static',
        angularVel: spawn.kind === 'rotating' ? (rng() > 0.5 ? 0.025 : -0.025) : 0,
        slideAmp: spawn.amplitude ?? 80,
      });
      state.zappers.push(z);
      break;
    }
    case 'laser': {
      state.lasers.push(makeLaser(wx + CFG.WORLD_W, spawn.y ?? CFG.WORLD_H / 2));
      break;
    }
    case 'missile': {
      const m = makeMissile(
        spawn.y ?? CFG.WORLD_H / 2,
        wx + CFG.WORLD_W,
        (spawn.kind as Parameters<typeof makeMissile>[2]) ?? 'straight',
        spawn as unknown as number
      );
      m.x = wx + CFG.WORLD_W;
      state.missiles.push(m);
      break;
    }
    case 'coin': {
      spawnCoin(state.coins, wx + CFG.WORLD_W, spawn.y ?? CFG.WORLD_H / 2);
      break;
    }
    case 'spin_token': {
      spawnSpinToken(state.spinTokens, wx + CFG.WORLD_W, spawn.y ?? CFG.WORLD_H / 2);
      break;
    }
    case 'vehicle_crate': {
      spawnVehicleCrate(state.vehicleCrates, wx + CFG.WORLD_W, (spawn.kind as Parameters<typeof spawnVehicleCrate>[2]) ?? 'bounce_buggy');
      break;
    }
    case 'pendulum': {
      state.pendulums.push(makePendulum(wx + CFG.WORLD_W, CFG.CEILING_Y, 180 + rng() * 100));
      break;
    }
    case 'vent': {
      state.vents.push(makeVent(wx + CFG.WORLD_W, spawn.y ?? 200, spawn.amplitude ?? 240));
      break;
    }
  }
}

/** Remove hazards that have scrolled off. */
export function cullOffscreen(state: WorldState): void {
  const limit = -300;
  state.zappers = state.zappers.filter(z => z.active && z.x > limit);
  state.lasers = state.lasers.filter(l => l.active && l.x > limit);
  state.missiles = state.missiles.filter(m => m.active && m.x > limit);
  state.pendulums = state.pendulums.filter(p => p.active && p.x > limit);
  state.vents = state.vents.filter(v => v.active && v.x > limit);
  state.vehicleCrates = state.vehicleCrates.filter(c => c.active && c.x > limit);
}
