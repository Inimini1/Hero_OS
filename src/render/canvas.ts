import { CFG } from '../config';

export interface CanvasSetup {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  cssW: number;
  cssH: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

/** Fit logical 1280×720 into the window, letterboxed, high-DPI. */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasSetup {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  const scaleByW = winW / CFG.WORLD_W;
  const scaleByH = winH / CFG.WORLD_H;
  const scale = Math.min(scaleByW, scaleByH);

  const cssW = Math.floor(CFG.WORLD_W * scale);
  const cssH = Math.floor(CFG.WORLD_H * scale);

  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const offsetX = Math.round((winW - cssW) / 2);
  const offsetY = Math.round((winH - cssH) / 2);
  canvas.style.left = offsetX + 'px';
  canvas.style.top = offsetY + 'px';

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr * scale, dpr * scale);

  return { canvas, ctx, dpr, cssW, cssH, offsetX, offsetY, scaleX: scale, scaleY: scale };
}

/** Offscreen canvas for pre-rendered layers. */
export function makeOffscreen(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}
