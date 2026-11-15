import { CFG } from '../config';
import { makeOffscreen } from './canvas';

export interface ZoneTheme {
  name: string;
  skyTop: string;
  skyBot: string;
  floorColor: string;
  accentColor: string;
  tint: string; // CSS color for overall tint
}

export const ZONE_THEMES: ZoneTheme[] = [
  { name: 'Research Lab',   skyTop: '#1a1a2e', skyBot: '#16213e', floorColor: '#2a2a4a', accentColor: '#4477ff', tint: 'rgba(0,0,80,0.1)' },
  { name: 'Cavern',         skyTop: '#0d1117', skyBot: '#1a1200', floorColor: '#2a1800', accentColor: '#ff8800', tint: 'rgba(80,40,0,0.1)' },
  { name: 'Sky Deck',       skyTop: '#1a6090', skyBot: '#3aa0d0', floorColor: '#44aacc', accentColor: '#ffffff', tint: 'rgba(0,120,180,0.08)' },
  { name: 'Neon Factory',   skyTop: '#0d0012', skyBot: '#1a0024', floorColor: '#2a0040', accentColor: '#ff00ff', tint: 'rgba(80,0,120,0.1)' },
  { name: 'Space Station',  skyTop: '#000008', skyBot: '#00000f', floorColor: '#111120', accentColor: '#00ffcc', tint: 'rgba(0,40,80,0.1)' },
];

/** Pre-rendered background layers per zone. */
const _bgLayers: Map<number, HTMLCanvasElement[]> = new Map();

function makeLabLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[0]!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Floor strip
  ctx.fillStyle = theme.floorColor;
  ctx.fillRect(0, CFG.FLOOR_Y + 20, W, H);

  // Props based on depth
  if (depth === 0) {
    // Far background: windows
    ctx.fillStyle = 'rgba(100,120,255,0.15)';
    for (let x = 60; x < W; x += 160) {
      ctx.fillRect(x, 100, 80, 60);
      ctx.strokeStyle = 'rgba(100,120,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 100, 80, 60);
    }
  } else if (depth === 1) {
    // Mid: pipes
    ctx.strokeStyle = 'rgba(60,80,120,0.6)';
    ctx.lineWidth = 12;
    for (let x = 100; x < W; x += 240) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, CFG.FLOOR_Y);
      ctx.stroke();
    }
    ctx.lineWidth = 8;
    for (let y = 150; y < CFG.FLOOR_Y - 50; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else {
    // Foreground: machinery silhouettes
    ctx.fillStyle = 'rgba(10,10,30,0.8)';
    for (let x = 0; x < W; x += 300) {
      ctx.fillRect(x, CFG.FLOOR_Y - 60, 60, 60);
      ctx.fillRect(x + 100, CFG.FLOOR_Y - 100, 40, 100);
    }
  }

  return c;
}

function makeCavernLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[1]!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = theme.floorColor;
  ctx.fillRect(0, CFG.FLOOR_Y + 20, W, H);

  if (depth === 0) {
    // Stalagmites/stalactites
    ctx.fillStyle = 'rgba(60,30,0,0.4)';
    for (let x = 80; x < W; x += 120 + depth * 40) {
      const h = 40 + Math.sin(x * 0.05) * 30;
      ctx.beginPath();
      ctx.moveTo(x - 15, 0); ctx.lineTo(x + 15, 0); ctx.lineTo(x, h);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 12, CFG.FLOOR_Y + 20); ctx.lineTo(x + 12, CFG.FLOOR_Y + 20); ctx.lineTo(x, CFG.FLOOR_Y + 20 - h * 0.6);
      ctx.fill();
    }
  } else if (depth === 1) {
    ctx.fillStyle = 'rgba(100,50,0,0.3)';
    for (let x = 40; x < W; x += 80) {
      ctx.fillRect(x, CFG.FLOOR_Y - 20, 20, 20);
    }
  } else {
    ctx.fillStyle = 'rgba(40,20,0,0.9)';
    for (let x = 0; x < W; x += 200) {
      ctx.fillRect(x, CFG.FLOOR_Y - 40, 60, 60);
    }
  }
  return c;
}

function makeSkyDeckLayer(W: number, H: number, depth: number): HTMLCanvasElement {
  const [c, ctx] = makeOffscreen(W, H);
  const theme = ZONE_THEMES[2]!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = theme.floorColor;
  ctx.fillRect(0, CFG.FLOOR_Y + 20, W, H);

  if (depth === 0) {
    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let x = 80; x < W; x += 200) {
      const y = 80 + Math.sin(x * 0.02) * 60;
      ctx.beginPath();
      ctx.ellipse(x, y, 60, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 40, y - 10, 40, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (depth === 1) {
    // Girders
    ctx.strokeStyle = 'rgba(200,220,240,0.3)';
    ctx.lineWidth = 6;
    for (let x = 60; x < W; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(0,80,120,0.7)';
    for (let x = 0; x < W; x += 180) {
      ctx.fillRect(x, CFG.FLOOR_Y - 50, 40, 60);
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

  ctx.fillStyle = theme.floorColor;
  ctx.fillRect(0, CFG.FLOOR_Y + 20, W, H);

  if (depth === 0) {
    // Neon signs in background
    const colors = ['#ff00ff', '#00ffff', '#ff8800', '#00ff88'];
    for (let x = 60; x < W; x += 160) {
      const col = colors[Math.floor(x / 160) % colors.length]!;
      ctx.strokeStyle = col + '33';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 80, 80, 40);
    }
  } else if (depth === 1) {
    ctx.strokeStyle = 'rgba(255,0,255,0.2)';
    ctx.lineWidth = 4;
    for (let y = 100; y < CFG.FLOOR_Y; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(60,0,80,0.9)';
    for (let x = 0; x < W; x += 160) {
      ctx.fillRect(x, CFG.FLOOR_Y - 80, 50, 100);
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

  ctx.fillStyle = theme.floorColor;
  ctx.fillRect(0, CFG.FLOOR_Y + 20, W, H);

  if (depth === 0) {
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 80; i++) {
      const sx = (i * 173) % W;
      const sy = (i * 97) % (CFG.FLOOR_Y - 40);
      const size = i % 3 === 0 ? 2 : 1;
      ctx.fillRect(sx, sy, size, size);
    }
    // Nebula
    const ng = ctx.createRadialGradient(W * 0.6, 150, 20, W * 0.6, 150, 180);
    ng.addColorStop(0, 'rgba(0,100,255,0.1)');
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, H);
  } else if (depth === 1) {
    ctx.strokeStyle = 'rgba(0,200,180,0.2)';
    ctx.lineWidth = 2;
    for (let x = 80; x < W; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(0,10,20,0.9)';
    for (let x = 0; x < W; x += 200) {
      ctx.fillRect(x, CFG.FLOOR_Y - 60, 70, 80);
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
    const parallaxSpeeds = [0.1, 0.25, 0.5];
    ctx.globalAlpha = alpha;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer) continue;
      const spd = parallaxSpeeds[i] ?? 0.1;
      const offset = (distanceTraveled * spd) % BG_W;
      ctx.drawImage(layer, -offset, 0);
      if (offset > 0) ctx.drawImage(layer, BG_W - offset, 0);
    }
    ctx.globalAlpha = 1;
  };

  drawZone(zoneIndex, 1);
  if (zoneFade < 1 && nextZoneIndex !== zoneIndex) {
    drawZone(nextZoneIndex, zoneFade);
  }
}
