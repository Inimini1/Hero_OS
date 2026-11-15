import { CFG } from '../config';
import { makeOffscreen } from './canvas';

export interface ZoneTheme {
  name: string;
  skyTop: string;
  skyBot: string;
  floorColor: string;
  accentColor: string;
  tint: string;
}

export const ZONE_THEMES: ZoneTheme[] = [
  { name: 'Research Lab',   skyTop: '#1a1a2e', skyBot: '#16213e', floorColor: '#2a2a4a', accentColor: '#4477ff', tint: 'rgba(0,0,80,0.1)' },
  { name: 'Cavern',         skyTop: '#0d0a06', skyBot: '#1a1200', floorColor: '#2a1800', accentColor: '#ff8800', tint: 'rgba(80,40,0,0.1)' },
  { name: 'Sky Deck',       skyTop: '#1a6090', skyBot: '#3aa0d0', floorColor: '#44aacc', accentColor: '#ffffff', tint: 'rgba(0,120,180,0.08)' },
  { name: 'Neon Factory',   skyTop: '#0d0012', skyBot: '#1a0024', floorColor: '#2a0040', accentColor: '#ff00ff', tint: 'rgba(80,0,120,0.1)' },
  { name: 'Space Station',  skyTop: '#000008', skyBot: '#00000f', floorColor: '#111120', accentColor: '#00ffcc', tint: 'rgba(0,40,80,0.1)' },
];

/** Pre-rendered background layers per zone. */
const _bgLayers: Map<number, HTMLCanvasElement[]> = new Map();

function makeLabLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[0]!;

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (depth === 0) {
    // Far: grid of monitor screens along the back wall
    for (let x = 40; x < W; x += 200) {
      const screenY = 80 + Math.sin(x * 0.03) * 40;
      // Monitor body
      ctx.fillStyle = '#1e2244';
      ctx.fillRect(x, screenY, 120, 80);
      ctx.strokeStyle = '#334488';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, screenY, 120, 80);
      // Screen glow (varies per position)
      const hue = (x * 7) % 60;
      ctx.fillStyle = `hsla(${200 + hue},80%,40%,0.5)`;
      ctx.fillRect(x + 6, screenY + 6, 108, 68);
      // Scanline shimmer
      ctx.strokeStyle = `hsla(${200 + hue},100%,70%,0.3)`;
      ctx.lineWidth = 1;
      for (let ly = screenY + 10; ly < screenY + 76; ly += 8) {
        ctx.beginPath(); ctx.moveTo(x + 6, ly); ctx.lineTo(x + 114, ly); ctx.stroke();
      }
      // Status indicator dot
      ctx.fillStyle = '#00ff88';
      ctx.beginPath(); ctx.arc(x + 108, screenY + 8, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Warning stripe along floor level
    ctx.fillStyle = 'rgba(255,200,0,0.1)';
    ctx.fillRect(0, CFG.FLOOR_Y - 10, W, 10);

  } else if (depth === 1) {
    // Mid: vertical pipes and horizontal conduits
    ctx.strokeStyle = 'rgba(60,80,160,0.55)';
    ctx.lineWidth = 14;
    for (let x = 80; x < W; x += 220) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CFG.FLOOR_Y - 20); ctx.stroke();
      // Pipe joint ring
      ctx.lineWidth = 20;
      ctx.beginPath(); ctx.moveTo(x, CFG.FLOOR_Y * 0.35); ctx.lineTo(x, CFG.FLOOR_Y * 0.35 + 2); ctx.stroke();
      ctx.lineWidth = 14;
    }
    // Horizontal duct
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(60,80,140,0.4)';
    for (let y = 140; y < CFG.FLOOR_Y - 60; y += 110) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Accent glow strip
    ctx.strokeStyle = 'rgba(68,120,255,0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, CFG.CEILING_Y + 40); ctx.lineTo(W, CFG.CEILING_Y + 40); ctx.stroke();

  } else {
    // Near: machinery silhouettes with blinking status lights
    ctx.fillStyle = 'rgba(10,10,30,0.88)';
    for (let x = 0; x < W; x += 280) {
      // Control console
      ctx.fillRect(x, CFG.FLOOR_Y - 70, 80, 70);
      ctx.fillRect(x + 100, CFG.FLOOR_Y - 100, 50, 100);
      ctx.fillRect(x + 180, CFG.FLOOR_Y - 55, 60, 55);
      // Blinking lights (pre-rendered as a range of alpha states)
      const lights = [
        { lx: x + 10, ly: CFG.FLOOR_Y - 62, col: '#00ff88' },
        { lx: x + 30, ly: CFG.FLOOR_Y - 62, col: '#ff4444' },
        { lx: x + 108, ly: CFG.FLOOR_Y - 92, col: '#ffcc00' },
      ];
      for (const l of lights) {
        ctx.fillStyle = l.col + 'aa';
        ctx.beginPath(); ctx.arc(l.lx, l.ly, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  return c;
}

function makeCavernLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[1]!;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(0.4, '#1a0e00');
  grad.addColorStop(1, '#261500');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (depth === 0) {
    // Far: vast cave ceiling with stalactites and glowing mineral veins
    ctx.fillStyle = 'rgba(60,30,0,0.5)';
    for (let x = 60; x < W; x += 90 + Math.sin(x * 0.04) * 30) {
      const h = 30 + Math.sin(x * 0.05) * 25 + Math.sin(x * 0.13) * 15;
      ctx.beginPath();
      ctx.moveTo(x - 12, 0); ctx.lineTo(x + 12, 0); ctx.lineTo(x, h);
      ctx.fill();
    }
    // Mineral vein glow
    for (let i = 0; i < 12; i++) {
      const vx = (i * 273 + 60) % W;
      const vy = 20 + (i * 97) % 80;
      const grd = ctx.createRadialGradient(vx, vy, 0, vx, vy, 20 + (i % 4) * 10);
      grd.addColorStop(0, 'rgba(255,100,0,0.3)');
      grd.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(vx - 30, vy - 30, 60, 60);
    }
    // Crystal clusters at mid height
    ctx.fillStyle = 'rgba(255,80,0,0.15)';
    for (let x = 120; x < W; x += 340) {
      for (let j = 0; j < 4; j++) {
        const cx = x + j * 18;
        const ch = 20 + j * 10;
        ctx.beginPath();
        ctx.moveTo(cx, 300); ctx.lineTo(cx - 8, 300 + ch); ctx.lineTo(cx + 8, 300 + ch);
        ctx.fill();
      }
    }

  } else if (depth === 1) {
    // Mid: glowing crystal formations and boulder silhouettes
    ctx.fillStyle = 'rgba(100,50,0,0.4)';
    for (let x = 40; x < W; x += 70) {
      ctx.beginPath();
      ctx.arc(x, CFG.FLOOR_Y + 10, 20 + Math.sin(x * 0.1) * 10, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    // Crystal spires
    for (let x = 100; x < W; x += 200) {
      const crystalY = 200 + Math.sin(x * 0.03) * 80;
      ctx.fillStyle = 'rgba(255,120,0,0.2)';
      ctx.beginPath();
      ctx.moveTo(x, crystalY);
      ctx.lineTo(x - 10, crystalY + 60);
      ctx.lineTo(x + 10, crystalY + 60);
      ctx.fill();
      // Crystal glow
      const grd = ctx.createRadialGradient(x, crystalY, 0, x, crystalY, 40);
      grd.addColorStop(0, 'rgba(255,100,0,0.2)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x - 40, crystalY - 20, 80, 80);
    }

  } else {
    // Near: dark rock formations
    ctx.fillStyle = 'rgba(30,15,0,0.92)';
    for (let x = 0; x < W; x += 160) {
      const bh = 60 + Math.sin(x * 0.08) * 30;
      ctx.beginPath();
      ctx.moveTo(x, CFG.FLOOR_Y + 10);
      ctx.lineTo(x + 20, CFG.FLOOR_Y - bh + 20);
      ctx.lineTo(x + 60, CFG.FLOOR_Y - bh);
      ctx.lineTo(x + 100, CFG.FLOOR_Y - bh + 15);
      ctx.lineTo(x + 140, CFG.FLOOR_Y + 10);
      ctx.fill();
    }
    // Ceiling rock lumps
    ctx.fillStyle = 'rgba(25,12,0,0.95)';
    for (let x = 0; x < W; x += 120) {
      const lh = 30 + Math.sin(x * 0.09) * 20;
      ctx.fillRect(x, 0, 90, CFG.CEILING_Y - 20 + lh);
    }
  }
  return c;
}

function makeSkyDeckLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[2]!;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d4a70');
  grad.addColorStop(0.5, theme.skyBot);
  grad.addColorStop(1, '#5ac8e8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (depth === 0) {
    // Far: distant city skyline and multilayered clouds
    // City silhouette
    ctx.fillStyle = 'rgba(10,30,50,0.6)';
    for (let x = 0; x < W; x += 50) {
      const bh = 40 + Math.sin(x * 0.07) * 30 + Math.sin(x * 0.17) * 20;
      ctx.fillRect(x, CFG.FLOOR_Y - bh - 80, 44, bh);
      // Antenna
      if ((x / 50) % 3 === 0) ctx.fillRect(x + 20, CFG.FLOOR_Y - bh - 95, 3, 15);
    }
    // Clouds (bottom layer)
    for (let i = 0; i < 8; i++) {
      const cx = (i * 213 + 80) % W;
      const cy = 60 + (i * 47) % 100;
      ctx.fillStyle = `rgba(255,255,255,${0.08 + (i % 3) * 0.04})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 80 + i * 10, 20 + i * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 50, cy - 8, 50 + i * 8, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sun/light source
    const sunGrd = ctx.createRadialGradient(W * 0.8, 40, 0, W * 0.8, 40, 120);
    sunGrd.addColorStop(0, 'rgba(255,240,180,0.25)');
    sunGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGrd;
    ctx.fillRect(W * 0.6, 0, W * 0.4, 160);

  } else if (depth === 1) {
    // Mid: structural girders and cloud wisps
    ctx.strokeStyle = 'rgba(180,220,255,0.28)';
    ctx.lineWidth = 8;
    for (let x = 60; x < W; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, CFG.CEILING_Y - 20);
      ctx.lineTo(x, CFG.FLOOR_Y + 20);
      ctx.stroke();
      // Crossbrace
      if ((x / 160) % 2 === 0) {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, CFG.CEILING_Y + 60);
        ctx.lineTo(x + 160, CFG.CEILING_Y + 60);
        ctx.stroke();
        ctx.lineWidth = 8;
      }
    }
    // Cloud wisps
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let x = 100; x < W; x += 300) {
      ctx.beginPath();
      ctx.ellipse(x, 160, 100, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    // Near: platform edge details
    ctx.fillStyle = 'rgba(0,60,100,0.82)';
    for (let x = 0; x < W; x += 200) {
      ctx.fillRect(x, CFG.FLOOR_Y - 55, 50, 65);
      // Railing posts
      ctx.fillStyle = 'rgba(100,180,220,0.5)';
      ctx.fillRect(x + 2, CFG.FLOOR_Y - 50, 4, 40);
      ctx.fillRect(x + 44, CFG.FLOOR_Y - 50, 4, 40);
      ctx.fillStyle = 'rgba(0,60,100,0.82)';
    }
    // Window highlights
    ctx.fillStyle = 'rgba(100,200,255,0.12)';
    for (let x = 60; x < W; x += 200) {
      ctx.fillRect(x, CFG.CEILING_Y - 20, 80, CFG.FLOOR_Y - CFG.CEILING_Y + 40);
    }
  }
  return c;
}

function makeNeonLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[3]!;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (depth === 0) {
    // Far: billboard-style neon signs
    const signColors = ['#ff00ff', '#00ffff', '#ff8800', '#00ff88', '#ff0088'];
    for (let x = 60; x < W; x += 200) {
      const col = signColors[Math.floor(x / 200) % signColors.length]!;
      const signY = 60 + Math.sin(x * 0.03) * 40;
      // Sign back
      ctx.fillStyle = 'rgba(10,0,20,0.8)';
      ctx.fillRect(x, signY, 100, 50);
      // Neon outline
      ctx.strokeStyle = col + '66';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 4, signY + 4, 92, 42);
      ctx.strokeStyle = col + '44';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, signY + 2, 96, 46);
      // Glow
      const grd = ctx.createRadialGradient(x + 50, signY + 25, 0, x + 50, signY + 25, 60);
      grd.addColorStop(0, col + '22');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x - 10, signY - 10, 120, 70);
      // Text-like glyph (blocky line pattern)
      ctx.strokeStyle = col + 'aa';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 20, signY + 15); ctx.lineTo(x + 60, signY + 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 20, signY + 25); ctx.lineTo(x + 50, signY + 25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 20, signY + 35); ctx.lineTo(x + 55, signY + 35); ctx.stroke();
    }

  } else if (depth === 1) {
    // Mid: industrial conveyor/pipe infrastructure
    ctx.strokeStyle = 'rgba(255,0,255,0.18)';
    ctx.lineWidth = 5;
    for (let y = 100; y < CFG.FLOOR_Y - 40; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      // Joints
      for (let x = 60; x < W; x += 120) {
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(0,255,255,0.15)';
    ctx.lineWidth = 4;
    for (let x = 80; x < W; x += 160) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

  } else {
    // Near: factory silhouettes with neon highlights
    ctx.fillStyle = 'rgba(15,0,25,0.92)';
    for (let x = 0; x < W; x += 160) {
      const bh = 80 + Math.sin(x * 0.06) * 40;
      ctx.fillRect(x, CFG.FLOOR_Y - bh, 70, bh);
      // Neon trim
      ctx.strokeStyle = 'rgba(255,0,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, CFG.FLOOR_Y - bh, 70, bh);
      // Chimney
      ctx.fillStyle = 'rgba(15,0,25,0.92)';
      ctx.fillRect(x + 25, CFG.FLOOR_Y - bh - 20, 12, 20);
      // Glow at chimney top
      const grd = ctx.createRadialGradient(x + 31, CFG.FLOOR_Y - bh - 20, 0, x + 31, CFG.FLOOR_Y - bh - 20, 15);
      grd.addColorStop(0, 'rgba(255,0,255,0.3)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x + 16, CFG.FLOOR_Y - bh - 35, 30, 30);
    }
  }
  return c;
}

function makeSpaceLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[4]!;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (depth === 0) {
    // Far: star field with Earth visible in upper right
    // Stars — varied sizes
    for (let i = 0; i < 120; i++) {
      const sx = (i * 173 + 11) % W;
      const sy = (i * 97 + 7) % (CFG.FLOOR_Y - 40);
      const brightness = 0.4 + (i % 5) * 0.12;
      const size = i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1;
      ctx.fillStyle = `rgba(255,255,255,${brightness})`;
      ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill();
    }
    // Distant planet (Earth-like)
    const pGrd = ctx.createRadialGradient(W * 0.78, 80, 0, W * 0.78, 80, 55);
    pGrd.addColorStop(0, 'rgba(50,100,220,0.7)');
    pGrd.addColorStop(0.5, 'rgba(30,140,80,0.6)');
    pGrd.addColorStop(0.9, 'rgba(20,60,160,0.5)');
    pGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pGrd;
    ctx.beginPath(); ctx.arc(W * 0.78, 80, 55, 0, Math.PI * 2); ctx.fill();
    // Cloud wisps on planet
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(W * 0.78, 70, 30, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    // Nebula
    const ng = ctx.createRadialGradient(W * 0.3, 180, 0, W * 0.3, 180, 200);
    ng.addColorStop(0, 'rgba(80,0,120,0.1)');
    ng.addColorStop(0.5, 'rgba(0,60,160,0.07)');
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, 360);

  } else if (depth === 1) {
    // Mid: module truss structure
    ctx.strokeStyle = 'rgba(0,200,180,0.22)';
    ctx.lineWidth = 3;
    for (let x = 80; x < W; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      // Perpendicular beams
      if ((x / 120) % 3 === 0) {
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x, CFG.CEILING_Y + 80); ctx.lineTo(x + 120, CFG.CEILING_Y + 80); ctx.stroke();
        ctx.lineWidth = 3;
      }
    }
    // Module connection rings
    for (let x = 160; x < W; x += 240) {
      ctx.strokeStyle = 'rgba(0,220,200,0.2)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, CFG.CEILING_Y + 80, 20, 0, Math.PI * 2); ctx.stroke();
    }

  } else {
    // Near: bulkhead panels with airlock details
    ctx.fillStyle = 'rgba(5,8,16,0.90)';
    for (let x = 0; x < W; x += 200) {
      ctx.fillRect(x, CFG.FLOOR_Y - 65, 85, 75);
      ctx.strokeStyle = 'rgba(0,200,180,0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, CFG.FLOOR_Y - 65, 85, 75);
      // Airlock ring
      ctx.beginPath(); ctx.arc(x + 42, CFG.FLOOR_Y - 28, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 42, CFG.FLOOR_Y - 28, 12, 0, Math.PI * 2); ctx.stroke();
      // Status LEDs
      ctx.fillStyle = '#00ffcc88';
      ctx.beginPath(); ctx.arc(x + 10, CFG.FLOOR_Y - 58, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(5,8,16,0.90)';
    }
    // Ceiling panels
    ctx.fillStyle = 'rgba(5,8,16,0.90)';
    for (let x = 0; x < W; x += 160) {
      ctx.fillRect(x, 0, 120, CFG.CEILING_Y - 15);
      ctx.strokeStyle = 'rgba(0,200,180,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 0, 120, CFG.CEILING_Y - 15);
    }
  }
  return c;
}

const MAKERS = [makeLabLayer, makeCavernLayer, makeSkyDeckLayer, makeNeonLayer, makeSpaceLayer];
const BG_W = CFG.WORLD_W * 3; // wide enough for parallax scroll

export function getBgLayers(zoneIndex: number): HTMLCanvasElement[] {
  if (_bgLayers.has(zoneIndex)) return _bgLayers.get(zoneIndex)!;
  const maker = MAKERS[zoneIndex] ?? MAKERS[0]!;
  const layers = [
    maker(BG_W, CFG.WORLD_H, 0),
    maker(BG_W, CFG.WORLD_H, 1),
    maker(BG_W, CFG.WORLD_H, 2),
  ];
  _bgLayers.set(zoneIndex, layers);
  return layers;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  zoneIndex: number,
  nextZoneIndex: number,
  zoneFade: number,
  distanceTraveled: number
): void {
  const drawZone = (zi: number, alpha: number): void => {
    const layers = getBgLayers(zi);
    const parallaxSpeeds = [0.08, 0.22, 0.55];
    ctx.globalAlpha = alpha;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer) continue;
      const spd = parallaxSpeeds[i] ?? 0.08;
      const offset = (distanceTraveled * spd) % BG_W;
      ctx.drawImage(layer, -offset, 0);
      // Tile: second copy fills the right portion when first copy runs short
      if (offset > 0) ctx.drawImage(layer, BG_W - offset, 0);
    }
    ctx.globalAlpha = 1;
  };

  drawZone(zoneIndex, 1);
  if (zoneFade < 1 && nextZoneIndex !== zoneIndex) {
    drawZone(nextZoneIndex, zoneFade);
  }
}
