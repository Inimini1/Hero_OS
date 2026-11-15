import { CFG } from '../config';
import type { VehicleKind, ZapperKind, MissileKind } from './types';

/** ASCII grid: 48 cols × 9 rows. Each tile = 40 wu.
 *  Tile meanings:
 *  . = empty
 *  C = coin
 *  c = coin row (bottom 3 rows only, ignored above)
 *  Z = zapper (horizontal)
 *  / = zapper angled 45°
 *  \ = zapper angled -45°
 *  R = rotating zapper
 *  S = sliding zapper
 *  L = laser (horizontal beam, full width at this row)
 *  M = straight missile warning
 *  H = homing missile warning
 *  V = vehicle crate
 *  T = spin token
 *  P = pendulum anchor
 *  W = vacuum vent
 */

export type ChunkCategory = 'easy' | 'medium' | 'hard' | 'coin_art' | 'vehicle_intro' | 'rest';

export interface ChunkSpawn {
  type: 'zapper' | 'laser' | 'missile' | 'coin' | 'spin_token' | 'vehicle_crate' | 'pendulum' | 'vent';
  x: number;        // relative x in world units from chunk start
  y: number;        // world y
  angle?: number;   // for zappers
  kind?: ZapperKind | MissileKind | VehicleKind;
  len?: number;     // zapper length
  amplitude?: number; // for sliding zappers
  salvoIndex?: number; // 0-2 for salvo missiles
}

export interface ChunkTemplate {
  id: number;
  name: string;
  category: ChunkCategory;
  minDifficulty: number;  // 0–1
  maxDifficulty: number;
  width: number;          // world units
  spawns: ChunkSpawn[];
}

const T = CFG.CHUNK_TILE; // 40 wu
const W = CFG.CHUNK_COLS; // 48 tiles = 1920 wu wide
const WORLD_H = CFG.WORLD_H; // 720

// Row to world Y: row 0=top (y=40), row 8=bottom (y=680)
// Rows map to: row i → y = 48 + i * (672-48)/8 = 48 + i*78
function rowY(row: number): number {
  return CFG.CEILING_Y + row * ((CFG.FLOOR_Y - CFG.CEILING_Y) / 8);
}

function col(c: number): number { return c * T; }

// ── Template definitions ───────────────────────────────────────────────────

function zapperH(x: number, y: number, len = 160): ChunkSpawn {
  return { type: 'zapper', x, y, angle: 0, kind: 'static', len };
}
function zapperA(x: number, y: number, angle: number, len = 160): ChunkSpawn {
  return { type: 'zapper', x, y, angle, kind: 'static', len };
}
function zapperR(x: number, y: number, len = 160): ChunkSpawn {
  return { type: 'zapper', x, y, angle: 0, kind: 'rotating', len };
}
function zapperS(x: number, y: number, len = 120, amp = 80): ChunkSpawn {
  return { type: 'zapper', x, y, angle: 0, kind: 'sliding', len, amplitude: amp };
}
function laser(x: number, row: number): ChunkSpawn {
  return { type: 'laser', x, y: rowY(row) };
}
function missile(x: number, row: number, k: MissileKind = 'straight'): ChunkSpawn {
  return { type: 'missile', x, y: rowY(row), kind: k };
}
function coin(x: number, y: number): ChunkSpawn {
  return { type: 'coin', x, y };
}
function coinRow(x: number, row: number, count: number, spacing = 50): ChunkSpawn[] {
  const spawns: ChunkSpawn[] = [];
  for (let i = 0; i < count; i++) {
    spawns.push(coin(x + i * spacing, rowY(row)));
  }
  return spawns;
}
function coinArc(x: number, centerY: number, count: number, radius: number): ChunkSpawn[] {
  const spawns: ChunkSpawn[] = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI + (i / (count - 1)) * Math.PI;
    spawns.push(coin(x + (i / (count - 1)) * 400, centerY + Math.sin(a) * radius));
  }
  return spawns;
}
function coinSine(x: number, count: number, amplitude: number, wavelength: number): ChunkSpawn[] {
  const spawns: ChunkSpawn[] = [];
  for (let i = 0; i < count; i++) {
    const px = x + i * (wavelength / count);
    const py = WORLD_H / 2 + Math.sin((i / count) * Math.PI * 2) * amplitude;
    spawns.push(coin(px, py));
  }
  return spawns;
}
function spinToken(x: number, row: number): ChunkSpawn {
  return { type: 'spin_token', x, y: rowY(row) };
}
function vcrate(x: number, k: VehicleKind): ChunkSpawn {
  return { type: 'vehicle_crate', x, y: 0, kind: k };
}
function pendulum(x: number): ChunkSpawn {
  return { type: 'pendulum', x, y: CFG.CEILING_Y };
}
function vent(x: number, row: number, h: number): ChunkSpawn {
  return { type: 'vent', x, y: rowY(row), amplitude: h } as ChunkSpawn;
}

export const CHUNK_TEMPLATES: ChunkTemplate[] = [

  // ─── EASY ──────────────────────────────────────────────────────────────

  {
    id: 0, name: 'Open Road', category: 'easy',
    minDifficulty: 0, maxDifficulty: 0.5,
    width: W * T,
    spawns: [
      ...coinRow(col(5), 4, 12),
      ...coinRow(col(22), 2, 10),
      ...coinRow(col(36), 6, 8),
    ],
  },

  {
    id: 1, name: 'Low Zapper', category: 'easy',
    minDifficulty: 0.05, maxDifficulty: 0.5,
    width: W * T,
    spawns: [
      zapperH(col(16), rowY(7)),
      zapperH(col(32), rowY(7)),
      ...coinRow(col(5), 3, 10),
      ...coinRow(col(20), 1, 8),
    ],
  },

  {
    id: 2, name: 'High Zapper', category: 'easy',
    minDifficulty: 0.05, maxDifficulty: 0.5,
    width: W * T,
    spawns: [
      zapperH(col(14), rowY(1)),
      zapperH(col(30), rowY(1)),
      ...coinRow(col(6), 5, 10),
      ...coinRow(col(22), 7, 8),
    ],
  },

  {
    id: 3, name: 'Coin Wave', category: 'easy',
    minDifficulty: 0, maxDifficulty: 0.3,
    width: W * T,
    spawns: [
      ...coinSine(col(3), 20, 160, 1800),
    ],
  },

  {
    id: 4, name: 'Staggered Low', category: 'easy',
    minDifficulty: 0.1, maxDifficulty: 0.5,
    width: W * T,
    spawns: [
      zapperH(col(10), rowY(6)),
      zapperH(col(20), rowY(7)),
      zapperH(col(30), rowY(6)),
      zapperH(col(40), rowY(7)),
      ...coinRow(col(5), 3, 8),
      ...coinRow(col(14), 2, 6),
    ],
  },

  {
    id: 5, name: 'Token Bonus', category: 'rest',
    minDifficulty: 0, maxDifficulty: 1,
    width: W * T,
    spawns: [
      spinToken(col(24), 4),
      ...coinRow(col(8), 3, 10),
      ...coinRow(col(32), 5, 10),
    ],
  },

  {
    id: 6, name: 'Angled Zappers', category: 'easy',
    minDifficulty: 0.1, maxDifficulty: 0.5,
    width: W * T,
    spawns: [
      zapperA(col(12), rowY(5), Math.PI / 4),
      zapperA(col(28), rowY(3), -Math.PI / 4),
      ...coinRow(col(4), 4, 10),
      ...coinRow(col(32), 6, 8),
    ],
  },

  // ─── MEDIUM ────────────────────────────────────────────────────────────

  {
    id: 7, name: 'Zapper Stack', category: 'medium',
    minDifficulty: 0.2, maxDifficulty: 0.7,
    width: W * T,
    spawns: [
      zapperH(col(10), rowY(2)),
      zapperH(col(10), rowY(6)),
      zapperH(col(24), rowY(1)),
      zapperH(col(24), rowY(5)),
      zapperH(col(38), rowY(3)),
      ...coinRow(col(14), 4, 8),
    ],
  },

  {
    id: 8, name: 'Rotating Pair', category: 'medium',
    minDifficulty: 0.25, maxDifficulty: 0.75,
    width: W * T,
    spawns: [
      zapperR(col(14), rowY(4)),
      zapperR(col(32), rowY(4)),
      ...coinRow(col(5), 7, 8),
      ...coinRow(col(5), 1, 8),
    ],
  },

  {
    id: 9, name: 'Laser Gauntlet', category: 'medium',
    minDifficulty: 0.3, maxDifficulty: 0.8,
    width: W * T,
    spawns: [
      laser(col(8), 2),
      laser(col(20), 6),
      laser(col(32), 3),
      ...coinRow(col(14), 4, 6),
    ],
  },

  {
    id: 10, name: 'Missile Alley', category: 'medium',
    minDifficulty: 0.3, maxDifficulty: 0.8,
    width: W * T,
    spawns: [
      missile(col(10), 2),
      missile(col(26), 6),
      missile(col(40), 4),
      ...coinRow(col(5), 4, 10),
    ],
  },

  {
    id: 11, name: 'Sliding Zappers', category: 'medium',
    minDifficulty: 0.25, maxDifficulty: 0.7,
    width: W * T,
    spawns: [
      zapperS(col(12), rowY(4), 140, 100),
      zapperS(col(28), rowY(4), 140, 100),
      ...coinRow(col(5), 7, 8),
      ...coinRow(col(5), 1, 8),
    ],
  },

  {
    id: 12, name: 'Zappers and Missiles', category: 'medium',
    minDifficulty: 0.35, maxDifficulty: 0.8,
    width: W * T,
    spawns: [
      zapperH(col(8), rowY(5)),
      missile(col(16), 2),
      zapperH(col(24), rowY(3)),
      missile(col(36), 6),
      ...coinRow(col(12), 4, 6),
    ],
  },

  {
    id: 13, name: 'High-Low Alternating', category: 'medium',
    minDifficulty: 0.2, maxDifficulty: 0.6,
    width: W * T,
    spawns: [
      zapperH(col(8), rowY(1), 200),
      zapperH(col(16), rowY(7), 200),
      zapperH(col(24), rowY(1), 200),
      zapperH(col(32), rowY(7), 200),
      zapperH(col(40), rowY(1), 200),
      ...coinRow(col(10), 4, 8, 55),
    ],
  },

  {
    id: 14, name: 'Coin Arc', category: 'coin_art',
    minDifficulty: 0, maxDifficulty: 0.5,
    width: W * T,
    spawns: [
      ...coinArc(col(8), WORLD_H / 2, 20, 180),
      ...coinArc(col(26), WORLD_H / 2, 20, 180),
    ],
  },

  {
    id: 15, name: 'Triple Stack', category: 'hard',
    minDifficulty: 0.5, maxDifficulty: 1,
    width: W * T,
    spawns: [
      zapperH(col(10), rowY(1)),
      zapperH(col(10), rowY(4)),
      zapperH(col(10), rowY(7)),
      zapperH(col(24), rowY(2)),
      zapperH(col(24), rowY(5)),
      zapperH(col(38), rowY(1)),
      zapperH(col(38), rowY(4)),
      zapperH(col(38), rowY(7)),
      ...coinRow(col(14), 3, 6),
      ...coinRow(col(14), 6, 6),
    ],
  },

  // ─── HARD ──────────────────────────────────────────────────────────────

  {
    id: 16, name: 'Rotating Gauntlet', category: 'hard',
    minDifficulty: 0.5, maxDifficulty: 1,
    width: W * T,
    spawns: [
      zapperR(col(8), rowY(4)),
      zapperR(col(18), rowY(4)),
      zapperR(col(28), rowY(4)),
      zapperR(col(38), rowY(4)),
      ...coinRow(col(5), 1, 6),
      ...coinRow(col(5), 7, 6),
    ],
  },

  {
    id: 17, name: 'Laser Shower', category: 'hard',
    minDifficulty: 0.5, maxDifficulty: 1,
    width: W * T,
    spawns: [
      laser(col(6), 1),
      laser(col(14), 7),
      laser(col(22), 2),
      laser(col(30), 6),
      laser(col(38), 4),
      ...coinRow(col(10), 4, 5),
    ],
  },

  {
    id: 18, name: 'Missile Swarm', category: 'hard',
    minDifficulty: 0.6, maxDifficulty: 1,
    width: W * T,
    spawns: [
      missile(col(8), 1, 'homing'),
      missile(col(16), 7, 'straight'),
      missile(col(24), 3, 'homing'),
      missile(col(36), 5, 'straight'),
      zapperH(col(20), rowY(4), 120),
      ...coinRow(col(5), 4, 8),
    ],
  },

  {
    id: 19, name: 'Chaos Zone', category: 'hard',
    minDifficulty: 0.65, maxDifficulty: 1,
    width: W * T,
    spawns: [
      zapperH(col(8), rowY(2)),
      laser(col(16), 6),
      missile(col(24), 1, 'homing'),
      zapperR(col(32), rowY(4)),
      missile(col(40), 7, 'straight'),
      ...coinRow(col(12), 4, 6),
    ],
  },

  {
    id: 20, name: 'Narrow Passage', category: 'hard',
    minDifficulty: 0.5, maxDifficulty: 1,
    width: W * T,
    spawns: [
      zapperH(col(10), rowY(1), 300),
      zapperH(col(10), rowY(7), 300),
      zapperH(col(24), rowY(2), 240),
      zapperH(col(24), rowY(6), 240),
      zapperH(col(36), rowY(1), 300),
      zapperH(col(36), rowY(7), 300),
      ...coinRow(col(12), 4, 8, 50),
    ],
  },

  // ─── COIN ART ──────────────────────────────────────────────────────────

  {
    id: 21, name: 'Coin Star', category: 'coin_art',
    minDifficulty: 0, maxDifficulty: 0.7,
    width: W * T,
    spawns: (() => {
      const spawns: ChunkSpawn[] = [];
      const cx = col(24), cy = WORLD_H / 2;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = i % 2 === 0 ? 160 : 70;
        spawns.push(coin(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      return spawns;
    })(),
  },

  {
    id: 22, name: 'Coin Spiral', category: 'coin_art',
    minDifficulty: 0, maxDifficulty: 0.5,
    width: W * T,
    spawns: (() => {
      const spawns: ChunkSpawn[] = [];
      for (let i = 0; i < 24; i++) {
        const t = i / 24;
        const a = t * Math.PI * 4;
        const r = 60 + t * 160;
        const cx = col(24), cy = WORLD_H / 2;
        spawns.push(coin(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.6));
      }
      return spawns;
    })(),
  },

  {
    id: 23, name: 'Coin Heart', category: 'coin_art',
    minDifficulty: 0, maxDifficulty: 0.5,
    width: W * T,
    spawns: (() => {
      const spawns: ChunkSpawn[] = [];
      const cx = col(24), cy = WORLD_H / 2;
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        spawns.push(coin(cx + hx * 8, cy + hy * 7));
      }
      return spawns;
    })(),
  },

  {
    id: 24, name: 'Double Wave', category: 'coin_art',
    minDifficulty: 0, maxDifficulty: 0.4,
    width: W * T,
    spawns: [
      ...coinSine(col(2), 24, 120, 1900),
      ...coinSine(col(2), 24, -120, 1900).map(s => ({ ...s, y: WORLD_H - s.y + (CFG.CEILING_Y + (CFG.FLOOR_Y - CFG.CEILING_Y)/2) + (CFG.CEILING_Y + (CFG.FLOOR_Y - CFG.CEILING_Y)/2) - s.y })),
    ],
  },

  // ─── VEHICLE INTROS ────────────────────────────────────────────────────

  {
    id: 25, name: 'Buggy Drop', category: 'vehicle_intro',
    minDifficulty: 0, maxDifficulty: 1,
    width: W * T,
    spawns: [
      vcrate(col(16), 'bounce_buggy'),
      zapperH(col(28), rowY(2)),
      zapperH(col(36), rowY(5)),
      ...coinRow(col(6), 4, 8),
    ],
  },

  {
    id: 26, name: 'Gravity Suit Drop', category: 'vehicle_intro',
    minDifficulty: 0.2, maxDifficulty: 1,
    width: W * T,
    spawns: [
      vcrate(col(14), 'gravity_suit'),
      zapperH(col(24), rowY(4)),
      laser(col(34), 2),
      ...coinRow(col(5), 6, 8),
    ],
  },

  {
    id: 27, name: 'Serpent Intro', category: 'vehicle_intro',
    minDifficulty: 0.3, maxDifficulty: 1,
    width: W * T,
    spawns: [
      vcrate(col(12), 'sky_serpent'),
      laser(col(22), 3),
      laser(col(32), 6),
      missile(col(38), 2),
      ...coinRow(col(5), 4, 10),
    ],
  },

  {
    id: 28, name: 'Mech Stomp Intro', category: 'vehicle_intro',
    minDifficulty: 0.4, maxDifficulty: 1,
    width: W * T,
    spawns: [
      vcrate(col(10), 'stomp_mech'),
      zapperH(col(22), rowY(2)),
      zapperH(col(22), rowY(6)),
      missile(col(34), 4, 'homing'),
      ...coinRow(col(5), 4, 8),
    ],
  },

  // ─── REST ──────────────────────────────────────────────────────────────

  {
    id: 29, name: 'Coin Shower', category: 'rest',
    minDifficulty: 0, maxDifficulty: 1,
    width: W * T,
    spawns: (() => {
      const spawns: ChunkSpawn[] = [];
      for (let c = 2; c < 46; c += 2) {
        for (let r = 1; r < 8; r += 2) {
          if (Math.abs(c - 24) + Math.abs(r - 4) < 10) {
            spawns.push(coin(col(c), rowY(r)));
          }
        }
      }
      return spawns;
    })(),
  },

  {
    id: 30, name: 'Open Easy', category: 'rest',
    minDifficulty: 0, maxDifficulty: 1,
    width: W * T,
    spawns: [
      ...coinRow(col(6), 4, 16, 60),
    ],
  },

  // ─── MEDIUM-HARD ───────────────────────────────────────────────────────

  {
    id: 31, name: 'Zappers and Lasers', category: 'medium',
    minDifficulty: 0.4, maxDifficulty: 0.85,
    width: W * T,
    spawns: [
      zapperH(col(8), rowY(5)),
      laser(col(14), 2),
      zapperH(col(20), rowY(6)),
      laser(col(28), 1),
      zapperR(col(36), rowY(4)),
      ...coinRow(col(5), 3, 7),
    ],
  },

  {
    id: 32, name: 'Sliding Maze', category: 'medium',
    minDifficulty: 0.3, maxDifficulty: 0.75,
    width: W * T,
    spawns: [
      zapperS(col(10), rowY(3), 160, 120),
      zapperS(col(22), rowY(5), 160, 120),
      zapperS(col(34), rowY(3), 160, 120),
      ...coinRow(col(5), 7, 8),
      ...coinRow(col(14), 1, 6),
    ],
  },

  {
    id: 33, name: 'Homing Pairs', category: 'hard',
    minDifficulty: 0.55, maxDifficulty: 1,
    width: W * T,
    spawns: [
      missile(col(8), 2, 'homing'),
      missile(col(8), 6, 'homing'),
      missile(col(24), 1, 'straight'),
      missile(col(24), 7, 'straight'),
      missile(col(38), 4, 'homing'),
      zapperH(col(16), rowY(4), 100),
      ...coinRow(col(5), 4, 8),
    ],
  },

  {
    id: 34, name: 'Zapper Corridor', category: 'hard',
    minDifficulty: 0.5, maxDifficulty: 1,
    width: W * T,
    spawns: [
      zapperH(col(8), rowY(1), 240), zapperH(col(8), rowY(7), 240),
      zapperH(col(16), rowY(2), 200), zapperH(col(16), rowY(6), 200),
      zapperH(col(24), rowY(3), 160), zapperH(col(24), rowY(5), 160),
      zapperH(col(32), rowY(2), 200), zapperH(col(32), rowY(6), 200),
      zapperH(col(40), rowY(1), 240), zapperH(col(40), rowY(7), 240),
      ...coinRow(col(10), 4, 8, 55),
    ],
  },

  {
    id: 35, name: 'Angled Pairs', category: 'medium',
    minDifficulty: 0.3, maxDifficulty: 0.75,
    width: W * T,
    spawns: [
      zapperA(col(10), rowY(3), Math.PI / 4, 200),
      zapperA(col(10), rowY(5), -Math.PI / 4, 200),
      zapperA(col(26), rowY(3), Math.PI / 4, 200),
      zapperA(col(26), rowY(5), -Math.PI / 4, 200),
      ...coinRow(col(5), 7, 6),
      ...coinRow(col(14), 1, 6),
    ],
  },

  {
    id: 36, name: 'Pendulum Swing', category: 'medium',
    minDifficulty: 0.3, maxDifficulty: 0.8,
    width: W * T,
    spawns: [
      pendulum(col(12)),
      pendulum(col(28)),
      pendulum(col(42)),
      ...coinRow(col(5), 7, 8),
    ],
  },

  {
    id: 37, name: 'Vent Rush', category: 'medium',
    minDifficulty: 0.3, maxDifficulty: 0.75,
    width: W * T,
    spawns: [
      vent(col(14), 2, 240),
      vent(col(30), 2, 240),
      zapperH(col(22), rowY(5)),
      ...coinRow(col(5), 4, 8),
    ],
  },

  {
    id: 38, name: 'Rotating Corridor', category: 'hard',
    minDifficulty: 0.5, maxDifficulty: 1,
    width: W * T,
    spawns: [
      zapperR(col(8), rowY(2)),
      zapperR(col(14), rowY(6)),
      zapperR(col(20), rowY(2)),
      zapperR(col(26), rowY(6)),
      zapperR(col(32), rowY(2)),
      zapperR(col(38), rowY(6)),
      ...coinRow(col(10), 4, 7, 55),
    ],
  },

  {
    id: 39, name: 'Calm Before Storm', category: 'rest',
    minDifficulty: 0, maxDifficulty: 1,
    width: W * T,
    spawns: [
      spinToken(col(24), 4),
      ...coinRow(col(5), 4, 18, 55),
    ],
  },

  {
    id: 40, name: 'Drill Intro', category: 'vehicle_intro',
    minDifficulty: 0.5, maxDifficulty: 1,
    width: W * T,
    spawns: [
      vcrate(col(8), 'drill_rocket'),
      zapperH(col(18), rowY(1)), zapperH(col(18), rowY(4)), zapperH(col(18), rowY(7)),
      laser(col(28), 2), laser(col(28), 6),
      missile(col(36), 4, 'homing'),
      ...coinRow(col(5), 4, 6),
    ],
  },

  {
    id: 41, name: 'Salvo Dodge', category: 'hard',
    minDifficulty: 0.65, maxDifficulty: 1,
    width: W * T,
    spawns: [
      { type: 'missile', x: col(10), y: rowY(2), kind: 'salvo' },
      zapperH(col(20), rowY(5)),
      { type: 'missile', x: col(32), y: rowY(6), kind: 'salvo' },
      ...coinRow(col(5), 4, 8),
    ],
  },

  {
    id: 42, name: 'Wave Sub Intro', category: 'vehicle_intro',
    minDifficulty: 0.3, maxDifficulty: 1,
    width: W * T,
    spawns: [
      vcrate(col(12), 'wave_sub'),
      laser(col(24), 3),
      laser(col(32), 5),
      zapperH(col(38), rowY(2)),
      ...coinRow(col(5), 4, 10),
    ],
  },

  {
    id: 43, name: 'Maximum Chaos', category: 'hard',
    minDifficulty: 0.75, maxDifficulty: 1,
    width: W * T,
    spawns: [
      zapperR(col(8), rowY(2)), zapperR(col(8), rowY(6)),
      laser(col(16), 4),
      missile(col(24), 1, 'homing'), missile(col(24), 7, 'homing'),
      zapperH(col(32), rowY(3)), zapperH(col(32), rowY(5)),
      missile(col(40), 4, 'straight'),
      ...coinRow(col(12), 4, 5, 60),
    ],
  },
];

/** Get templates for a given difficulty (0-1). */
export function getTemplatesForDifficulty(
  difficulty: number,
  includeCategories: ChunkCategory[] = ['easy', 'medium', 'hard', 'coin_art', 'rest']
): ChunkTemplate[] {
  return CHUNK_TEMPLATES.filter(t =>
    includeCategories.includes(t.category) &&
    difficulty >= t.minDifficulty &&
    difficulty <= t.maxDifficulty + 0.1
  );
}
