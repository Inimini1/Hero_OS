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
  const meters = Math.floor(state.distance / CFG.UNITS_PER_METER);

  // ── Distance counter (TOP RIGHT — JJR style) ──────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, W - 188, 10, 176, 50, 8);
  ctx.fill();

  // Distance value — large bold white
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`${NUM_FMT.format(meters)}m`, W - 16, 16);

  // "BEST" badge if beating record
  if (meters > 0 && meters >= bestDistance && bestDistance > 0) {
    ctx.fillStyle = '#f5c800';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('★ BEST', W - 184, 42);
  }

  // Zone progress bar
  const zoneColors = ['#5599ff', '#ff7700', '#44ccff', '#ff44cc', '#8844ff'];
  const zoneColor = zoneColors[state.zoneIndex % zoneColors.length] ?? '#5599ff';
  const withinZone = meters % CFG.ZONE_DIST;
  const zoneProgress = withinZone / CFG.ZONE_DIST;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(W - 184, 51, 170, 4);
  ctx.fillStyle = zoneColor;
  ctx.fillRect(W - 184, 51, 170 * zoneProgress, 4);

  // ── Coin counter (TOP LEFT — JJR style) ─────────────────────────────
  if (state.vehicle.active && state.vehicle.hp > 0) {
    drawVehiclePanel(ctx, state);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 10, 10, 160, 50, 8);
    ctx.fill();
    drawCoinIcon(ctx, 32, 35);
    ctx.fillStyle = '#f5c800';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(NUM_FMT.format(state.coinsThisRun), 50, 35);

    // Spin tokens (small badge)
    if (state.tokensThisRun > 0) {
      ctx.fillStyle = '#cc55ff';
      ctx.font = 'bold 11px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(`★×${state.tokensThisRun}`, 50, 46);
    }
  }

  // ── All 3 mission bars (BOTTOM — always visible, JJR style) ──────────
  drawMissionBars(ctx, state.missions);

  // ── Pause hint ────────────────────────────────────────────────────────
  if (!paused) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('ESC = Pause', W - 12, CFG.WORLD_H - 4);
  }
}

function drawVehiclePanel(ctx: CanvasRenderingContext2D, state: WorldState): void {
  const isDrill = state.vehicle.kind === 'drill_rocket';
  const panelH = isDrill ? 56 : 44;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, 10, 10, 170, panelH, 8);
  ctx.fill();

  const vnames: Record<string, string> = {
    bounce_buggy: 'BOUNCE BUGGY', gravity_suit: 'GRAV SUIT',
    sky_serpent: 'SKY SERPENT',   stomp_mech: 'STOMP MECH',
    wave_sub: 'WAVE SUB',         drill_rocket: 'DRILL ROCKET',
  };
  const vcolors: Record<string, string> = {
    bounce_buggy: '#ff8822', gravity_suit: '#aa44ff',
    sky_serpent: '#22cc55',  stomp_mech: '#99aabb',
    wave_sub: '#1199dd',     drill_rocket: '#ee3300',
  };
  const col = vcolors[state.vehicle.kind] ?? '#ffffff';

  // Color dot
  const dotGrd = ctx.createRadialGradient(26, 28, 0, 26, 28, 7);
  dotGrd.addColorStop(0, col);
  dotGrd.addColorStop(1, col + '44');
  ctx.fillStyle = dotGrd;
  ctx.beginPath(); ctx.arc(26, 28, 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = col;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(vnames[state.vehicle.kind] ?? '?', 38, 24);

  // HP bar
  const hp = Math.min(1, state.vehicle.hp / 3);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(38, 33, 134, 6);
  ctx.fillStyle = hp > 0.5 ? '#44dd66' : hp > 0.25 ? '#ffcc00' : '#ff4444';
  ctx.fillRect(38, 33, 134 * hp, 6);

  if (isDrill) {
    const totalTicks = CFG.SIM_HZ * 5;
    const remaining = Math.max(0, 1 - state.vehicle.drillTimer / totalTicks);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(14, 46, 150, 5);
    ctx.fillStyle = remaining > 0.3 ? '#ff5500' : '#ff9900';
    ctx.fillRect(14, 46, 150 * remaining, 5);
    const secsLeft = Math.ceil(remaining * 5);
    ctx.fillStyle = '#ffaa77';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${secsLeft}s`, 168, 44);
  }
}

function drawMissionBars(ctx: CanvasRenderingContext2D, missions: Mission[]): void {
  const H = CFG.WORLD_H;
  const barW = 310;
  const barH = 22;
  const gap = 3;
  const totalH = missions.length * (barH + gap) - gap;
  const startY = H - totalH - 10;

  // Panel background
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  roundRect(ctx, 8, startY - 4, barW + 8, totalH + 8, 6);
  ctx.fill();

  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    if (!m) continue;
    const my = startY + i * (barH + gap);
    const progress = Math.min(1, m.progress / m.target);
    const done = m.completed;

    // Row background
    ctx.fillStyle = done ? 'rgba(0,200,100,0.15)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, 12, my, barW, barH, 4);
    ctx.fill();

    // Mission description
    const desc = getMissionDescription(m);
    const shortDesc = desc.length > 32 ? desc.slice(0, 32) + '…' : desc;
    ctx.fillStyle = done ? '#44ff99' : '#ccddff';
    ctx.font = `${done ? 'bold ' : ''}10px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(shortDesc, 16, my + barH * 0.38);

    // Progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(14, my + barH - 6, barW - 4, 4);
    ctx.fillStyle = done ? '#44ff99' : '#5599ff';
    ctx.fillRect(14, my + barH - 6, (barW - 4) * progress, 4);

    // Count
    ctx.fillStyle = done ? '#44ff99' : '#8899cc';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(m.progress)}/${m.target}`, barW + 14, my + barH * 0.38);
  }
}

function drawCoinIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 14);
  glow.addColorStop(0, 'rgba(255,220,0,0.5)');
  glow.addColorStop(1, 'rgba(255,180,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5c800';
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#cc8800';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 8.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,160,0.55)';
  ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 4, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
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

  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.fillRect(0, 0, W, H);

  // Panel
  ctx.fillStyle = 'rgba(12,16,32,0.96)';
  roundRect(ctx, W/2 - 230, 50, 460, H - 100, 12);
  ctx.fill();
  ctx.strokeStyle = '#3a4a7a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', W / 2, 110);

  const buttons: Button[] = [
    { x: W/2 - 180, y: 150, w: 160, h: 48, label: 'RESUME', color: '#1a4a1a', action: 'resume' },
    { x: W/2 + 20,  y: 150, w: 160, h: 48, label: 'MENU',   color: '#222244', action: 'menu' },
  ];
  drawButtons(ctx, buttons);

  // Mission progress section
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#6677aa';
  ctx.textAlign = 'center';
  ctx.fillText('MISSIONS', W / 2, 222);

  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    if (!m) continue;
    const my = 248 + i * 56;
    const progress = m.progress / m.target;
    const desc = getMissionDescription(m);

    ctx.fillStyle = m.completed ? 'rgba(0,255,100,0.18)' : 'rgba(255,255,255,0.07)';
    roundRect(ctx, W / 2 - 210, my - 20, 420, 46, 6);
    ctx.fill();

    ctx.fillStyle = m.completed ? '#44ff99' : '#ccddf0';
    ctx.font = m.completed ? 'bold 13px monospace' : '13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(desc.length > 44 ? desc.slice(0, 44) + '…' : desc, W / 2 - 200, my - 10);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(W / 2 - 200, my + 10, 400, 8);
    ctx.fillStyle = m.completed ? '#44ff99' : '#5599ff';
    ctx.fillRect(W / 2 - 200, my + 10, 400 * Math.min(1, progress), 8);

    ctx.fillStyle = '#6677aa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.floor(m.progress)}/${m.target}`, W / 2 + 200, my - 10);
  }

  return buttons;
}
