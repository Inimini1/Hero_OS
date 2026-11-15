import { CFG } from './config';

export type TickFn = (held: boolean) => void;
export type RenderFn = (interp: number, dt: number) => void;

export class GameLoop {
  private _tickFn: TickFn;
  private _renderFn: RenderFn;
  private _running = false;
  private _accumulator = 0;
  private _lastTime = 0;
  private _rafId = 0;
  private _heldFn: () => boolean;
  private _simDt: number;

  constructor(tickFn: TickFn, renderFn: RenderFn, heldFn: () => boolean) {
    this._tickFn = tickFn;
    this._renderFn = renderFn;
    this._heldFn = heldFn;
    this._simDt = 1 / CFG.SIM_HZ;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._frame);
  }

  stop(): void {
    this._running = false;
    cancelAnimationFrame(this._rafId);
  }

  private _frame = (now: number): void => {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._frame);

    let dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    // Clamp to avoid spiral of death
    if (dt > CFG.DELTA_MAX) dt = CFG.DELTA_MAX;

    this._accumulator += dt;

    const held = this._heldFn();

    // Run fixed-rate simulation ticks
    while (this._accumulator >= this._simDt) {
      this._tickFn(held);
      this._accumulator -= this._simDt;
    }

    // Interpolation factor for rendering
    const interp = this._accumulator / this._simDt;
    this._renderFn(interp, dt);
  };
}
