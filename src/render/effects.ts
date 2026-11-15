import { CFG } from '../config';

export interface CameraState {
  shakeX: number;
  shakeY: number;
  zoomPunch: number;  // 0=normal, positive=zoomed out briefly
}

export function createCamera(): CameraState {
  return { shakeX: 0, shakeY: 0, zoomPunch: 0 };
}

export function tickCamera(cam: CameraState, events: readonly { type: string }[]): void {
  // Decay
  cam.shakeX *= CFG.SHAKE_DECAY;
  cam.shakeY *= CFG.SHAKE_DECAY;
  cam.zoomPunch *= 0.9;

  for (const evt of events) {
    if (evt.type === 'hero_died') {
      cam.shakeX = CFG.SHAKE_DEATH;
      cam.shakeY = CFG.SHAKE_DEATH;
      cam.zoomPunch = -0.05;
    }
    if (evt.type === 'near_miss') {
      cam.shakeX = Math.max(cam.shakeX, CFG.SHAKE_NEAR_MISS);
      cam.shakeY = Math.max(cam.shakeY, CFG.SHAKE_NEAR_MISS);
    }
    if (evt.type === 'pickup_collected' || evt.type === 'vehicle_start') {
      cam.zoomPunch = 0.03;
    }
  }
}

export function applyCamera(ctx: CanvasRenderingContext2D, cam: CameraState, screenShake: boolean): void {
  if (!screenShake || (Math.abs(cam.shakeX) < 0.5 && Math.abs(cam.shakeY) < 0.5)) return;
  const sx = (Math.random() - 0.5) * cam.shakeX * 2;
  const sy = (Math.random() - 0.5) * cam.shakeY * 2;
  ctx.translate(sx, sy);
}

export function drawVignette(ctx: CanvasRenderingContext2D, dead: boolean, invulnTicks: number): void {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;
  const grd = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.75);

  if (dead) {
    grd.addColorStop(0, 'rgba(80,0,0,0)');
    grd.addColorStop(1, 'rgba(80,0,0,0.6)');
  } else if (invulnTicks > 0) {
    const alpha = (Math.sin(invulnTicks * 0.3) * 0.5 + 0.5) * 0.3;
    grd.addColorStop(0, 'rgba(0,100,255,0)');
    grd.addColorStop(1, `rgba(0,100,255,${alpha})`);
  } else {
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.35)');
  }
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

/** Floor glow/surface line. */
export function drawFloorAndCeiling(ctx: CanvasRenderingContext2D, zoneIndex: number): void {
  const W = CFG.WORLD_W;
  const floorY = CFG.FLOOR_Y + 20;
  const ceilY = CFG.CEILING_Y - 20;

  const floorColors = ['#2a2a4a', '#2a1800', '#44aacc', '#2a0040', '#111120'];
  const accentColors = ['#4477ff', '#ff8800', '#ffffff', '#ff00ff', '#00ffcc'];

  const floor = floorColors[zoneIndex] ?? floorColors[0]!;
  const accent = accentColors[zoneIndex] ?? accentColors[0]!;

  // Floor
  const fg = ctx.createLinearGradient(0, floorY, 0, floorY + 60);
  fg.addColorStop(0, accent + '44');
  fg.addColorStop(0.3, floor);
  fg.addColorStop(1, floor);
  ctx.fillStyle = fg;
  ctx.fillRect(0, floorY, W, 60);

  // Floor glow line
  ctx.strokeStyle = accent + 'aa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY); ctx.lineTo(W, floorY);
  ctx.stroke();

  // Ceiling
  const cg = ctx.createLinearGradient(0, ceilY - 40, 0, ceilY);
  cg.addColorStop(0, floor);
  cg.addColorStop(1, accent + '44');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, ceilY);

  ctx.strokeStyle = accent + '66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ceilY); ctx.lineTo(W, ceilY);
  ctx.stroke();
}

/** Overlay bloom effect using 'lighter' composite. */
export function drawBloom(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Zone transition cross-fade overlay. */
export function drawZoneFade(ctx: CanvasRenderingContext2D, zoneFade: number): void {
  if (zoneFade >= 1) return;
  const alpha = Math.sin((1 - zoneFade) * Math.PI) * 0.4;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, CFG.WORLD_W, CFG.WORLD_H);
}
