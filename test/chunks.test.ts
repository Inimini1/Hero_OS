import { describe, it, expect } from 'vitest';
import { CHUNK_TEMPLATES } from '../src/sim/chunks';
import { CFG } from '../src/config';

describe('CHUNK_TEMPLATES', () => {
  it('has at least 40 templates', () => {
    expect(CHUNK_TEMPLATES.length).toBeGreaterThanOrEqual(40);
  });

  it('every template has required fields', () => {
    for (const t of CHUNK_TEMPLATES) {
      expect(typeof t.id).toBe('number');
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(['easy', 'medium', 'hard', 'coin_art', 'vehicle_intro', 'rest']).toContain(t.category);
      expect(typeof t.minDifficulty).toBe('number');
      expect(typeof t.maxDifficulty).toBe('number');
      expect(t.minDifficulty).toBeLessThanOrEqual(t.maxDifficulty);
      expect(Array.isArray(t.spawns)).toBe(true);
    }
  });

  it('hazard spawn positions are within world bounds', () => {
    for (const t of CHUNK_TEMPLATES) {
      for (const s of t.spawns) {
        if (s.type === 'zapper' || s.type === 'laser') {
          expect(s.y).toBeGreaterThanOrEqual(CFG.CEILING_Y - 10);
          expect(s.y).toBeLessThanOrEqual(CFG.FLOOR_Y + 10);
        }
      }
    }
  });

  it('coin spawn x positions are within chunk width', () => {
    const maxX = CFG.CHUNK_COLS * CFG.CHUNK_TILE;
    for (const t of CHUNK_TEMPLATES) {
      for (const s of t.spawns) {
        if (s.type === 'coin') {
          expect(s.x).toBeGreaterThanOrEqual(0);
          expect(s.x).toBeLessThanOrEqual(maxX);
        }
      }
    }
  });

  it('no duplicate template IDs', () => {
    const ids = CHUNK_TEMPLATES.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('each main category has at least 2 templates', () => {
    for (const cat of ['easy', 'medium', 'hard'] as const) {
      const count = CHUNK_TEMPLATES.filter(t => t.category === cat).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});
