/** Collision detection primitives. All positions in world units. */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface OBB {
  cx: number;   // center x
  cy: number;   // center y
  hw: number;   // half-width
  hh: number;   // half-height
  angle: number; // rotation in radians
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Circle vs circle. */
export function circleVsCircle(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const minDist = a.r + b.r;
  return dx * dx + dy * dy < minDist * minDist;
}

/** Circle vs axis-aligned rectangle. */
export function circleVsAABB(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  const nearX = Math.max(rx, Math.min(rx + rw, cx));
  const nearY = Math.max(ry, Math.min(ry + rh, cy));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}

/** Circle vs oriented bounding box using SAT. */
export function circleVsOBB(circle: Circle, box: OBB): boolean {
  const cos = Math.cos(-box.angle);
  const sin = Math.sin(-box.angle);
  const dx = circle.x - box.cx;
  const dy = circle.y - box.cy;
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  const nearX = Math.max(-box.hw, Math.min(box.hw, localX));
  const nearY = Math.max(-box.hh, Math.min(box.hh, localY));
  const distX = localX - nearX;
  const distY = localY - nearY;
  return distX * distX + distY * distY < circle.r * circle.r;
}

/** Circle vs line segment (closest point on segment to circle center). */
export function circleVsSegment(circle: Circle, seg: Segment): boolean {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = circle.x - seg.x1;
    const ey = circle.y - seg.y1;
    return ex * ex + ey * ey < circle.r * circle.r;
  }
  let t = ((circle.x - seg.x1) * dx + (circle.y - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = seg.x1 + t * dx;
  const nearY = seg.y1 + t * dy;
  const ex = circle.x - nearX;
  const ey = circle.y - nearY;
  return ex * ex + ey * ey < circle.r * circle.r;
}

/** Closest distance from point to segment. */
export function pointSegmentDist(px: number, py: number, seg: Segment): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = px - seg.x1, ey = py - seg.y1;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = seg.x1 + t * dx;
  const ny = seg.y1 + t * dy;
  const ex = px - nx, ey = py - ny;
  return Math.sqrt(ex * ex + ey * ey);
}

/** Reflect velocity off a surface defined by normal (nx, ny). Elasticity 0=dead, 1=elastic. */
export function reflectVelocity(
  vx: number, vy: number, nx: number, ny: number, e: number
): [number, number] {
  const dot = vx * nx + vy * ny;
  return [vx - (1 + e) * dot * nx, vy - (1 + e) * dot * ny];
}

/** AABB for a chunk tile position. */
export function tileBounds(col: number, row: number, tileSize: number): [number, number, number, number] {
  return [col * tileSize, row * tileSize, tileSize, tileSize];
}
