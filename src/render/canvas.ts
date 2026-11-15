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

  // Use the body's client dimensions so safe-area padding is already subtracted.
  // Falls back to window.innerWidth/Height in case the body isn't laid out yet.
  const body = document.body;
  const availW = body.clientWidth  || window.innerWidth;
  const availH = body.clientHeight || window.innerHeight;

  const scale = Math.min(availW / CFG.WORLD_W, availH / CFG.WORLD_H);

  const cssW = Math.floor(CFG.WORLD_W * scale);
  const cssH = Math.floor(CFG.WORLD_H * scale);

  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // offsetX/Y used for translating pointer events into game coordinates.
  // The canvas is centred by body flexbox, so the offset is the leftover space / 2.
  const offsetX = Math.round((availW - cssW) / 2);
  const offsetY = Math.round((availH - cssH) / 2);

  const ctx = canvas.getContext('2d')!;
  // setTransform resets then applies in one step — safe to call on every resize
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

  return { canvas, ctx, dpr, cssW, cssH, offsetX, offsetY, scaleX: scale, scaleY: scale };
}

/** Offscreen canvas for pre-rendered layers. */
export function makeOffscreen(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}
