import { CFG } from '../config';

export interface CameraState {
  shakeX: number;
  shakeY: number;
  zoomPunch: number;  // positive = zoom out, negative = zoom in
}

export function createCamera(): CameraState {
  return { shakeX: 0, shakeY: 0, zoomPunch: 0 };
}

export function tickCamera(cam: CameraState, events: readonly { type: string }[]): void {
  cam.shakeX *= CFG.SHAKE_DECAY;
  cam.shakeY *= CFG.SHAKE_DECAY;
  cam.zoomPunch *= 0.88;

  for (const evt of events) {
    if (evt.type === 'hero_died') {
      cam.shakeX = CFG.SHAKE_DEATH;
      cam.shakeY = CFG.SHAKE_DEATH;
      cam.zoomPunch = -0.06;
    }
    if (evt.type === 'near_miss') {
      cam.shakeX = Math.max(cam.shakeX, CFG.SHAKE_NEAR_MISS);
      cam.shakeY = Math.max(cam.shakeY, CFG.SHAKE_NEAR_MISS);
    }
    if (evt.type === 'pickup_collected' || evt.type === 'vehicle_start') {
      cam.zoomPunch = 0.04;
    }
    if (evt.type === 'coin_collected') {
      cam.zoomPunch = Math.max(cam.zoomPunch, 0.008);
    }
  }
}

export function applyCamera(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  heroX: number,
  heroY: number,
  screenShake: boolean
): void {
  // Zoom punch — scale around hero position
  if (Math.abs(cam.zoomPunch) > 0.001) {
    const s = 1 + cam.zoomPunch;
    ctx.translate(heroX, heroY);
    ctx.scale(s, s);
    ctx.translate(-heroX, -heroY);
  }

  if (!screenShake || (Math.abs(cam.shakeX) < 0.5 && Math.abs(cam.shakeY) < 0.5)) return;
  const sx = (Math.random() - 0.5) * cam.shakeX * 2;
  const sy = (Math.random() - 0.5) * cam.shakeY * 2;
  ctx.translate(sx, sy);
}

export function drawVignette(ctx: CanvasRenderingContext2D, dead: boolean, invulnTicks: number): void {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;
  const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);

  if (dead) {
    grd.addColorStop(0, 'rgba(80,0,0,0)');
    grd.addColorStop(1, 'rgba(80,0,0,0.65)');
  } else if (invulnTicks > 0) {
    const alpha = (Math.sin(invulnTicks * 0.3) * 0.5 + 0.5) * 0.3;
    grd.addColorStop(0, 'rgba(0,100,255,0)');
    grd.addColorStop(1, `rgba(0,100,255,${alpha})`);
  } else {
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.38)');
  }
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

/** White flash on hit-stop (death/impact frame). */
export function drawHitStopFlash(ctx: CanvasRenderingContext2D, hitStop: number): void {
  if (hitStop <= 0) return;
  const alpha = Math.min(0.7, hitStop / CFG.HIT_STOP_TICKS * 0.7);
  ctx.fillStyle = `rgba(255,240,200,${alpha})`;
  ctx.fillRect(0, 0, CFG.WORLD_W, CFG.WORLD_H);
}

const FLOOR_COLORS = ['#2a2a4a', '#2a1800', '#44aacc', '#2a0040', '#111120'];
const ACCENT_COLORS = ['#4477ff', '#ff8800', '#ffffff', '#ff00ff', '#00ffcc'];
const CEIL_COLORS  = ['#1a1a3a', '#1a0e00', '#338ea8', '#1f0030', '#0a0a18'];

/** Floor surface and ceiling with zone-specific tile patterns. */
export function drawFloorAndCeiling(
  ctx: CanvasRenderingContext2D,
  zoneIndex: number,
  scrollX: number
): void {
  const W = CFG.WORLD_W;
  const floorY = CFG.FLOOR_Y + 20;
  const ceilY  = CFG.CEILING_Y - 20;

  const floor  = FLOOR_COLORS[zoneIndex]  ?? FLOOR_COLORS[0]!;
  const accent = ACCENT_COLORS[zoneIndex] ?? ACCENT_COLORS[0]!;
  const ceil   = CEIL_COLORS[zoneIndex]   ?? CEIL_COLORS[0]!;

  // ── Floor ────────────────────────────────────────────────────────────────
  const fg = ctx.createLinearGradient(0, floorY, 0, floorY + 68);
  fg.addColorStop(0, accent + '55');
  fg.addColorStop(0.25, floor);
  fg.addColorStop(1, floor);
  ctx.fillStyle = fg;
  ctx.fillRect(0, floorY, W, 68);

  // Tile pattern on floor surface
  drawFloorTiles(ctx, zoneIndex, floorY, scrollX, accent, floor);

  // Floor glow line
  ctx.strokeStyle = accent + 'cc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY); ctx.lineTo(W, floorY);
  ctx.stroke();

  // ── Ceiling ───────────────────────────────────────────────────────────────
  const cg = ctx.createLinearGradient(0, ceilY - 48, 0, ceilY);
  cg.addColorStop(0, ceil);
  cg.addColorStop(0.75, floor);
  cg.addColorStop(1, accent + '44');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, ceilY);

  // Ceiling tile pattern
  drawCeilingTiles(ctx, zoneIndex, ceilY, scrollX, accent);

  ctx.strokeStyle = accent + '88';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ceilY); ctx.lineTo(W, ceilY);
  ctx.stroke();
}

function drawFloorTiles(
  ctx: CanvasRenderingContext2D,
  zone: number,
  floorY: number,
  scrollX: number,
  accent: string,
  _floor: string
): void {
  ctx.save();
  ctx.globalAlpha = 0.35;

  switch (zone) {
    case 0: { // Research Lab — metallic grid tiles
      const tileW = 80, tileH = 24;
      const offX = (-(scrollX * 0.9) % tileW + tileW) % tileW;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      for (let x = -tileW + offX; x < CFG.WORLD_W + tileW; x += tileW) {
        ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, floorY + tileH); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, floorY + tileH); ctx.lineTo(CFG.WORLD_W, floorY + tileH); ctx.stroke();
      break;
    }
    case 1: { // Cavern — cracked rock lines
      const seg = 60;
      const offX = (-(scrollX * 0.9) % (seg * 2) + seg * 2) % (seg * 2);
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 1;
      for (let x = -seg + offX; x < CFG.WORLD_W + seg; x += seg) {
        const jitter = Math.sin(x * 0.07) * 8;
        ctx.beginPath(); ctx.moveTo(x, floorY + 4 + jitter); ctx.lineTo(x + seg * 0.6, floorY + 16); ctx.stroke();
      }
      break;
    }
    case 2: { // Sky Deck — grated panels
      const tileW = 64;
      const offX = (-(scrollX * 0.9) % tileW + tileW) % tileW;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (let x = -tileW + offX; x < CFG.WORLD_W + tileW; x += tileW) {
        ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, floorY + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, floorY + 10); ctx.lineTo(x + tileW, floorY + 10); ctx.stroke();
      }
      break;
    }
    case 3: { // Neon Factory — diamond grating
      const tileW = 48;
      const offX = (-(scrollX * 0.9) % tileW + tileW) % tileW;
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 1;
      for (let x = -tileW + offX; x < CFG.WORLD_W + tileW; x += tileW) {
        ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x + tileW / 2, floorY + 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + tileW, floorY); ctx.lineTo(x + tileW / 2, floorY + 18); ctx.stroke();
      }
      break;
    }
    case 4: { // Space Station — clean panel seams
      const tileW = 120;
      const offX = (-(scrollX * 0.9) % tileW + tileW) % tileW;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1;
      for (let x = -tileW + offX; x < CFG.WORLD_W + tileW; x += tileW) {
        ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, floorY + 20); ctx.stroke();
        // Panel bolt circles
        ctx.beginPath(); ctx.arc(x + 4, floorY + 4, 2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 4, floorY + 16, 2, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}

function drawCeilingTiles(
  ctx: CanvasRenderingContext2D,
  zone: number,
  ceilY: number,
  scrollX: number,
  accent: string
): void {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;

  switch (zone) {
    case 0: { // Lab — overhead lighting strip
      const tileW = 160;
      const offX = (-(scrollX * 0.4) % tileW + tileW) % tileW;
      for (let x = -tileW + offX; x < CFG.WORLD_W + tileW; x += tileW) {
        ctx.fillStyle = accent + '22';
        ctx.fillRect(x + 20, ceilY - 16, 60, 16);
        ctx.strokeRect(x + 20, ceilY - 16, 60, 16);
      }
      break;
    }
    case 2: { // Sky Deck — rivets
      const tileW = 80;
      const offX = (-(scrollX * 0.4) % tileW + tileW) % tileW;
      for (let x = -tileW + offX; x < CFG.WORLD_W + tileW; x += tileW) {
        ctx.beginPath(); ctx.arc(x, ceilY - 6, 3, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    case 3: { // Neon — cable trays
      const tileW = 40;
      const offX = (-(scrollX * 0.4) % tileW + tileW) % tileW;
      for (let x = -tileW + offX; x < CFG.WORLD_W + tileW; x += tileW) {
        ctx.beginPath(); ctx.moveTo(x, ceilY - 3); ctx.lineTo(x + tileW * 0.6, ceilY - 3); ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
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
  const alpha = Math.sin((1 - zoneFade) * Math.PI) * 0.45;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, CFG.WORLD_W, CFG.WORLD_H);
}

/** Zone name announcement banner. Fades in then out over ~4 seconds. */
export function drawZoneBanner(
  ctx: CanvasRenderingContext2D,
  zoneName: string,
  alpha: number
): void {
  if (alpha <= 0) return;
  const W = CFG.WORLD_W;
  const y = 160;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Background strip
  const bw = 500, bh = 54;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - bw / 2, y - bh / 2, bw, bh, 8);
  ctx.fill();

  // Zone label
  ctx.fillStyle = '#aaaacc';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENTERING ZONE', W / 2, y - 14);

  // Zone name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(zoneName.toUpperCase(), W / 2, y + 10);

  ctx.restore();
}
