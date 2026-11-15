import { CFG } from '../config';
import type { Zapper, Laser, Missile, Pendulum, VacuumVent } from '../sim/types';

export function drawZappers(ctx: CanvasRenderingContext2D, zappers: Zapper[]): void {
  for (const z of zappers) {
    if (!z.active) continue;
    if (z.x < -400 || z.x > CFG.WORLD_W + 400) continue;
    drawZapper(ctx, z);
  }
}

function drawZapper(ctx: CanvasRenderingContext2D, z: Zapper): void {
  const hw = z.len / 2;
  const pulse = Math.sin(z.arcPhase * 0.4) * 0.5 + 0.5;

  ctx.save();
  ctx.translate(z.x, z.y);
  ctx.rotate(z.angle);
  ctx.lineCap = 'round';

  // Outer glow
  ctx.strokeStyle = `rgba(80,180,255,${0.15 + pulse * 0.1})`;
  ctx.lineWidth = CFG.ZAPPER_GLOW * 4;
  ctx.beginPath();
  ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0);
  ctx.stroke();

  // Mid glow
  ctx.strokeStyle = `rgba(140,210,255,${0.4 + pulse * 0.15})`;
  ctx.lineWidth = CFG.ZAPPER_GLOW;
  ctx.stroke();

  // Core bar
  ctx.strokeStyle = `rgba(220,240,255,${0.85 + pulse * 0.15})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Electric arcs — 3 overlapping jagged lines
  for (let arc = 0; arc < 3; arc++) {
    const steps = 10 + arc * 2;
    const amp = 5 + arc * 3;
    const phaseOff = arc * 1.1 + z.arcPhase;
    ctx.strokeStyle = arc === 0
      ? `rgba(200,240,255,${0.9 - arc * 0.2})`
      : `rgba(100,200,255,${0.5 - arc * 0.1})`;
    ctx.lineWidth = 2 - arc * 0.5;
    ctx.beginPath();
    ctx.moveTo(-hw, 0);
    for (let i = 1; i < steps; i++) {
      const lx = -hw + (i / steps) * z.len;
      const spread = 1 - Math.abs(i / steps - 0.5) * 2;
      const ly = Math.sin(phaseOff + i * 1.7) * amp * spread;
      ctx.lineTo(lx, ly);
    }
    ctx.lineTo(hw, 0);
    ctx.stroke();
  }

  // End caps
  for (const capX of [-hw, hw]) {
    // Outer ring
    const capGrd = ctx.createRadialGradient(capX, 0, 0, capX, 0, 10);
    capGrd.addColorStop(0, `rgba(200,240,255,${0.8 + pulse * 0.2})`);
    capGrd.addColorStop(0.5, `rgba(60,160,255,${0.5 + pulse * 0.1})`);
    capGrd.addColorStop(1, 'rgba(0,80,200,0)');
    ctx.fillStyle = capGrd;
    ctx.beginPath();
    ctx.arc(capX, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    // Core dot
    ctx.fillStyle = `rgba(255,255,255,${0.9 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.arc(capX, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Spark streaks
    ctx.strokeStyle = `rgba(180,230,255,${0.6 + pulse * 0.2})`;
    ctx.lineWidth = 1;
    for (let s = 0; s < 4; s++) {
      const sa = z.arcPhase * 0.5 + s * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(capX + Math.cos(sa) * 5, Math.sin(sa) * 5);
      ctx.lineTo(capX + Math.cos(sa) * (8 + pulse * 4), Math.sin(sa) * (8 + pulse * 4));
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawLasers(ctx: CanvasRenderingContext2D, lasers: Laser[]): void {
  for (const l of lasers) {
    if (!l.active) continue;
    drawLaser(ctx, l);
  }
}

function drawLaser(ctx: CanvasRenderingContext2D, l: Laser): void {
  if (l.state === 'idle') return;

  const y = l.y;

  if (l.state === 'warn') {
    // Warning: pulsing edge indicator + beam outline
    const pulse = Math.sin(l.timer * 0.3) * 0.5 + 0.5;

    // Edge warning arrows
    ctx.fillStyle = `rgba(255, 60, 0, ${0.6 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(CFG.WORLD_W - 24, y - 12);
    ctx.lineTo(CFG.WORLD_W - 4, y);
    ctx.lineTo(CFG.WORLD_W - 24, y + 12);
    ctx.closePath();
    ctx.fill();

    // Faint pre-beam
    const alpha = (l.timer / CFG.LASER_WARN_TICKS) * 0.4;
    ctx.fillStyle = `rgba(255,80,0,${alpha})`;
    ctx.fillRect(0, y - 2, CFG.WORLD_W, 4);
  }

  if (l.state === 'firing') {
    const firingProgress = l.timer / CFG.LASER_FIRE_TICKS;

    // Outer glow
    ctx.fillStyle = 'rgba(255,60,0,0.15)';
    ctx.fillRect(0, y - 20, CFG.WORLD_W, 40);

    // Mid glow
    ctx.fillStyle = 'rgba(255,100,0,0.4)';
    ctx.fillRect(0, y - 8, CFG.WORLD_W, 16);

    // Core beam
    ctx.fillStyle = `rgba(255,220,100,${0.8 + Math.sin(l.timer * 0.5) * 0.2})`;
    ctx.fillRect(0, y - 3, CFG.WORLD_W, 6);

    // Bright center
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, y - 1, CFG.WORLD_W, 2);

    // Fade at end
    if (firingProgress > 0.7) {
      ctx.fillStyle = `rgba(0,0,0,${(firingProgress - 0.7) / 0.3 * 0.8})`;
      ctx.fillRect(0, y - 20, CFG.WORLD_W, 40);
    }

    // Scanline effect
    ctx.strokeStyle = `rgba(255,160,0,${0.3 + Math.sin(l.timer * 1.2) * 0.2})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(CFG.WORLD_W, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawMissiles(ctx: CanvasRenderingContext2D, missiles: Missile[]): void {
  for (const m of missiles) {
    if (!m.active) continue;
    drawMissile(ctx, m);
  }
}

function drawMissile(ctx: CanvasRenderingContext2D, m: Missile): void {
  if (m.warnTimer > 0) {
    // Warning indicator on right edge
    const pulse = Math.sin((CFG.MISSILE_WARN_TICKS - m.warnTimer) * 0.25) * 0.5 + 0.5;
    const wy = m.y;
    ctx.fillStyle = `rgba(255, 60, 0, ${0.5 + pulse * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(CFG.WORLD_W - 4, wy - 10);
    ctx.lineTo(CFG.WORLD_W - 4, wy + 10);
    ctx.lineTo(CFG.WORLD_W - 24, wy);
    ctx.closePath();
    ctx.fill();
    // Tracking label
    ctx.fillStyle = `rgba(255,100,0,${0.6 + pulse * 0.4})`;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('⚠', CFG.WORLD_W - 30, wy + 4);
    return;
  }

  ctx.save();
  ctx.translate(m.x, m.y);

  // Rotate to match velocity
  const angle = Math.atan2(m.vy, m.vx);
  ctx.rotate(angle);

  // Smoke trail
  if (m.smokeTimer > 0) {
    ctx.fillStyle = 'rgba(100,100,100,0.3)';
    ctx.beginPath();
    ctx.ellipse(-20 - m.smokeTimer * 0.5, 0, 10 + m.smokeTimer * 0.3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body
  ctx.fillStyle = m.kind === 'homing' ? '#ff4400' : '#cc2200';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -6);
  ctx.lineTo(-10, 6);
  ctx.closePath();
  ctx.fill();

  // Nose
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(14, -4);
  ctx.lineTo(14, 4);
  ctx.closePath();
  ctx.fill();

  // Fins
  ctx.fillStyle = '#994400';
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(-14, -10); ctx.lineTo(-6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(-14, 10); ctx.lineTo(-6, 4);
  ctx.closePath();
  ctx.fill();

  // Exhaust flame
  const flameLen = 8 + Math.sin(m.smokeTimer * 0.5) * 4;
  const fg = ctx.createLinearGradient(-10, 0, -10 - flameLen, 0);
  fg.addColorStop(0, 'rgba(255,180,0,0.9)');
  fg.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-10, -4);
  ctx.lineTo(-10 - flameLen, 0);
  ctx.lineTo(-10, 4);
  ctx.closePath();
  ctx.fill();

  // Homing eye
  if (m.kind === 'homing') {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(6, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawPendulums(ctx: CanvasRenderingContext2D, pendulums: Pendulum[]): void {
  for (const p of pendulums) {
    if (!p.active) continue;
    drawPendulum(ctx, p);
  }
}

function drawPendulum(ctx: CanvasRenderingContext2D, p: Pendulum): void {
  const bobX = p.x + Math.sin(p.angle) * p.length;
  const bobY = p.pivotY + Math.cos(p.angle) * p.length;

  // Cable
  ctx.strokeStyle = 'rgba(150,150,180,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  // Anchor point
  ctx.fillStyle = '#8899aa';
  ctx.beginPath();
  ctx.arc(p.x, p.pivotY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Bob (wrecking ball)
  const grd = ctx.createRadialGradient(bobX - 5, bobY - 5, 2, bobX, bobY, p.bobRadius);
  grd.addColorStop(0, '#cccccc');
  grd.addColorStop(1, '#555566');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(bobX, bobY, p.bobRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#888899';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Chain links
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const lx = p.x + Math.sin(p.angle) * p.length * t;
    const ly = p.pivotY + Math.cos(p.angle) * p.length * t;
    ctx.strokeStyle = 'rgba(120,120,140,0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawVents(ctx: CanvasRenderingContext2D, vents: VacuumVent[]): void {
  for (const v of vents) {
    if (!v.active) continue;
    drawVent(ctx, v);
  }
}

function drawVent(ctx: CanvasRenderingContext2D, v: VacuumVent): void {
  const phase = (v.timer * 0.04) % 1;

  // Dark interior / danger zone extending left from vent mouth
  const dangerW = 160 + Math.sin(v.timer * 0.07) * 20;
  const dg = ctx.createLinearGradient(v.x - dangerW, 0, v.x, 0);
  dg.addColorStop(0, 'rgba(0,160,120,0)');
  dg.addColorStop(1, 'rgba(0,160,120,0.12)');
  ctx.fillStyle = dg;
  ctx.fillRect(v.x - dangerW, v.y, dangerW, v.height);

  // Suction streamlines (animated dashes moving rightward toward mouth)
  const lineCount = 8;
  for (let i = 0; i < lineCount; i++) {
    const ly = v.y + (i + 0.5) / lineCount * v.height;
    const linePhase = (phase + i * 0.12) % 1;
    const lx = v.x - dangerW + linePhase * dangerW;
    const alpha = 0.25 + Math.sin(linePhase * Math.PI) * 0.35;
    ctx.strokeStyle = `rgba(0,220,170,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -linePhase * 18;
    ctx.beginPath();
    ctx.moveTo(lx - 30, ly);
    ctx.lineTo(v.x, ly);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Vent grille body
  ctx.fillStyle = '#1a3030';
  ctx.strokeStyle = 'rgba(0,200,160,0.7)';
  ctx.lineWidth = 2;
  ctx.fillRect(v.x, v.y, 56, v.height);
  ctx.strokeRect(v.x, v.y, 56, v.height);

  // Grille slats
  ctx.strokeStyle = 'rgba(0,200,160,0.5)';
  ctx.lineWidth = 1.5;
  const slats = Math.floor(v.height / 18);
  for (let i = 0; i <= slats; i++) {
    const sy = v.y + (i / slats) * v.height;
    ctx.beginPath();
    ctx.moveTo(v.x + 4, sy);
    ctx.lineTo(v.x + 52, sy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(v.x + 28, v.y + 4);
  ctx.lineTo(v.x + 28, v.y + v.height - 4);
  ctx.stroke();

  // WARNING triangle
  const cy = v.y + v.height / 2;
  ctx.fillStyle = `rgba(255,200,0,${0.6 + Math.sin(v.timer * 0.15) * 0.3})`;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚠', v.x + 28, cy);
}
