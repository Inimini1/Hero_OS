import { CFG } from '../config';
import type { WorldState } from '../sim/types';
import type { Mission } from '../sim/types';
import { getMissionDescription } from '../sim/missions';
import { type Button, drawButtons } from './ui';

const NUM_FMT = new Intl.NumberFormat('en-US');

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: WorldState,
  bestDistance: number,
  paused: boolean,
  _tick: number
): void {
  const W = CFG.WORLD_W;

  // ── Distance + zone progress ──────────────────────────────────────────
  const meters = Math.floor(state.distance / CFG.UNITS_PER_METER);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W - 180, 12, 168, 44);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${NUM_FMT.format(meters)} m`, W - 20, 29);

  // Best indicator
  if (meters > 0 && meters >= bestDistance && bestDistance > 0) {
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('★ BEST', W - 20, 44);
  }

  // Zone progress bar (bottom 4px of panel)
  const zoneColors = ['#4477ff', '#ff7700', '#44ccff', '#ff44cc', '#8844ff'];
  const zoneColor = zoneColors[state.zoneIndex % zoneColors.length] ?? '#4477ff';
  const withinZone = meters % CFG.ZONE_DIST;
  const zoneProgress = withinZone / CFG.ZONE_DIST;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(W - 178, 50, 164, 4);
  ctx.fillStyle = zoneColor;
  ctx.fillRect(W - 178, 50, 164 * zoneProgress, 4);

  // ── Coins ─────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W - 180, 62, 168, 30);
  ctx.fill();
  drawCoinIcon(ctx, W - 160, 77);
  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(NUM_FMT.format(state.coinsThisRun), W - 20, 77);

  // ── Spin tokens ───────────────────────────────────────────────────────
  if (state.tokensThisRun > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, W - 180, 98, 168, 28);
    ctx.fill();
    ctx.fillStyle = '#ff88cc';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`★ ${state.tokensThisRun}`, W - 20, 112);
  }

  // ── Vehicle icon ──────────────────────────────────────────────────────
  if (state.vehicle.active && state.vehicle.hp > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, 12, 12, 100, 36);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const vnames: Record<string, string> = {
      bounce_buggy: 'BUGGY',
      gravity_suit: 'GRAV SUIT',
      sky_serpent: 'SERPENT',
      stomp_mech: 'MECH',
      wave_sub: 'WAVE SUB',
      drill_rocket: 'DRILL',
    };
    ctx.fillText(vnames[state.vehicle.kind] ?? '?', 20, 30);

    // HP bar
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(14, 40, 92 * state.vehicle.hp, 4);
  }

  // ── Mission ticker ────────────────────────────────────────────────────
  drawMissionTicker(ctx, state.missions, _tick);

  // ── Pause hint ────────────────────────────────────────────────────────
  if (!paused) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ESC = Pause', 12, CFG.WORLD_H - 20);
  }
}

function drawMissionTicker(ctx: CanvasRenderingContext2D, missions: Mission[], tick: number): void {
  const idx = Math.floor(tick / (CFG.SIM_HZ * 3)) % missions.length;
  const m = missions[idx];
  if (!m || m.completed) return;

  const progress = m.progress / m.target;
  const desc = getMissionDescription(m);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 12, CFG.WORLD_H - 60, 280, 40);
  ctx.fill();

  ctx.fillStyle = '#aaaacc';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(desc.length > 36 ? desc.slice(0, 36) + '…' : desc, 16, CFG.WORLD_H - 56);

  // Progress bar
  ctx.fillStyle = '#333355';
  ctx.fillRect(14, CFG.WORLD_H - 36, 274, 10);
  ctx.fillStyle = progress >= 1 ? '#00ff88' : '#4488ff';
  ctx.fillRect(14, CFG.WORLD_H - 36, 274 * Math.min(1, progress), 10);

  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(m.progress)}/${m.target}`, 294, CFG.WORLD_H - 56);
}

function drawCoinIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Glow
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 12);
  glow.addColorStop(0, 'rgba(255,220,0,0.4)');
  glow.addColorStop(1, 'rgba(255,180,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = '#ffdd00';
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  // Edge
  ctx.strokeStyle = '#cc8800';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 7.5, 0, Math.PI * 2);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,160,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 2, 3.5, 2.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Symbol
  ctx.fillStyle = '#885500';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', x, y + 0.5);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 6): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draw pause overlay. Returns clickable buttons. */
export function drawPauseOverlay(
  ctx: CanvasRenderingContext2D,
  missions: Mission[],
  _tick: number
): Button[] {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', W / 2, 90);

  // Buttons
  const buttons: Button[] = [
    { x: W/2 - 165, y: 130, w: 150, h: 48, label: 'RESUME', color: '#1a4a1a', action: 'resume' },
    { x: W/2 + 15,  y: 130, w: 150, h: 48, label: 'MENU',   color: '#222233', action: 'menu' },
  ];
  drawButtons(ctx, buttons);

  // Mission progress
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#8888aa';
  ctx.textAlign = 'center';
  ctx.fillText('MISSIONS', W / 2, 206);

  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    if (!m) continue;
    const my = 234 + i * 55;
    const progress = m.progress / m.target;
    const desc = getMissionDescription(m);

    ctx.fillStyle = m.completed ? 'rgba(0,255,100,0.2)' : 'rgba(255,255,255,0.08)';
    roundRect(ctx, W / 2 - 200, my - 20, 400, 44);
    ctx.fill();

    ctx.fillStyle = m.completed ? '#00ff88' : '#ccccee';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(desc.length > 42 ? desc.slice(0, 42) + '…' : desc, W / 2 - 190, my - 6);

    ctx.fillStyle = '#333355';
    ctx.fillRect(W / 2 - 190, my + 10, 380, 8);
    ctx.fillStyle = m.completed ? '#00ff88' : '#4488ff';
    ctx.fillRect(W / 2 - 190, my + 10, 380 * Math.min(1, progress), 8);

    ctx.fillStyle = '#888899';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(m.progress)}/${m.target}`, W / 2 + 190, my - 6);
  }

  return buttons;
}
