import { CFG } from './config';
import type { WorldState } from './sim/types';
import { countActiveParticles } from './sim/particles';

export class DebugOverlay {
  private _enabled: boolean = CFG.DEBUG_DEFAULT;
  private _frameTimes: number[] = [];
  private _fps = 0;

  toggle(): void { this._enabled = !this._enabled; }
  get enabled(): boolean { return this._enabled; }

  recordFrame(dt: number): void {
    this._frameTimes.push(dt);
    if (this._frameTimes.length > 60) this._frameTimes.shift();
    const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
    this._fps = avg > 0 ? 1 / avg : 0;
  }

  draw(ctx: CanvasRenderingContext2D, state: WorldState, _simTick: number): void {
    if (!this._enabled) return;

    const W = CFG.WORLD_W;
    const lines: string[] = [
      `FPS: ${this._fps.toFixed(1)}`,
      `Speed: ${state.speed.toFixed(2)} u/t`,
      `Distance: ${(state.distance / CFG.UNITS_PER_METER).toFixed(1)} m`,
      `Seed: ${state.seed}`,
      `Zone: ${state.zoneIndex}`,
      `Particles: ${countActiveParticles(state.particles)}`,
      `Zappers: ${state.zappers.filter(z => z.active).length}`,
      `Lasers: ${state.lasers.filter(l => l.active).length}`,
      `Missiles: ${state.missiles.filter(m => m.active).length}`,
      `Coins: ${state.coins.filter(c => c.active).length}`,
      `Vehicle: ${state.vehicle.active ? state.vehicle.kind : 'none'}`,
      `Hero Y: ${state.hero.y.toFixed(1)} vy: ${state.hero.vy.toFixed(2)}`,
      `InvulnTicks: ${state.hero.invulnTicks}`,
    ];

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(W - 220, 0, 220, lines.length * 18 + 10);

    ctx.fillStyle = '#00ff88';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i] ?? '', W - 215, 5 + i * 18);
    }
  }

  drawHitboxes(ctx: CanvasRenderingContext2D, state: WorldState): void {
    if (!this._enabled) return;
    // Hero hitbox
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.hero.x, state.hero.y, CFG.HERO_HIT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Zapper hitboxes
    ctx.strokeStyle = '#ff0000';
    for (const z of state.zappers) {
      if (!z.active) continue;
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(z.angle);
      ctx.strokeRect(-z.len/2, -6, z.len, 12);
      ctx.restore();
    }
  }
}
