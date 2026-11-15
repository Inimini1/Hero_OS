import { describe, it, expect } from 'vitest';
import { circleVsCircle, circleVsAABB, circleVsOBB } from '../src/sim/physics';
import type { Circle, OBB } from '../src/sim/physics';

describe('circleVsCircle', () => {
  it('detects overlap', () => {
    const a: Circle = { x: 0, y: 0, r: 5 };
    const b: Circle = { x: 3, y: 0, r: 5 };
    expect(circleVsCircle(a, b)).toBe(true);
  });

  it('no overlap when apart', () => {
    const a: Circle = { x: 0, y: 0, r: 5 };
    const b: Circle = { x: 20, y: 0, r: 5 };
    expect(circleVsCircle(a, b)).toBe(false);
  });

  it('touching edge is NOT overlap (strict <)', () => {
    const a: Circle = { x: 0, y: 0, r: 5 };
    const b: Circle = { x: 10, y: 0, r: 5 };
    expect(circleVsCircle(a, b)).toBe(false);
  });

  it('same position always overlaps', () => {
    const a: Circle = { x: 10, y: 10, r: 1 };
    expect(circleVsCircle(a, a)).toBe(true);
  });
});

describe('circleVsAABB', () => {
  it('circle fully inside box', () => {
    // cx,cy,cr, rx,ry,rw,rh
    expect(circleVsAABB(50, 50, 5, 40, 40, 20, 20)).toBe(true);
  });

  it('circle outside box', () => {
    expect(circleVsAABB(100, 100, 5, 40, 40, 20, 20)).toBe(false);
  });

  it('circle partially overlapping box edge', () => {
    // right edge at x=60, circle center at x=65 r=10 — overlaps by 5
    expect(circleVsAABB(65, 50, 10, 40, 40, 20, 20)).toBe(true);
  });

  it('circle just outside box corner', () => {
    // corner at (60,60), circle at (68,68) r=5, dist ≈ 11.3 > 5
    expect(circleVsAABB(68, 68, 5, 40, 40, 20, 20)).toBe(false);
  });
});

describe('circleVsOBB', () => {
  it('circle inside axis-aligned OBB', () => {
    const c: Circle = { x: 50, y: 50, r: 5 };
    const box: OBB = { cx: 50, cy: 50, hw: 20, hh: 12, angle: 0 };
    expect(circleVsOBB(c, box)).toBe(true);
  });

  it('no collision when clearly apart', () => {
    const c: Circle = { x: 200, y: 200, r: 5 };
    const box: OBB = { cx: 40, cy: 40, hw: 20, hh: 12, angle: 0 };
    expect(circleVsOBB(c, box)).toBe(false);
  });

  it('rotated OBB collision returns boolean', () => {
    const c: Circle = { x: 100, y: 115, r: 5 };
    const box: OBB = { cx: 100, cy: 100, hw: 20, hh: 5, angle: Math.PI / 4 };
    expect(typeof circleVsOBB(c, box)).toBe('boolean');
  });
});
