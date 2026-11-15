import type { Particle } from '../sim/types';
import type { Coin, SpinToken, VehicleCrate } from '../sim/types';

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    if (!p.active || p.life <= 0) continue;

    ctx.save();
    ctx.globalAlpha = p.a * p.life;

    switch (p.kind) {
      case 'jetpack_fire':
      case 'jetpack_smoke':
        drawFireParticle(ctx, p);
        break;
      case 'casing':
        drawCasing(ctx, p);
        break;
      case 'coin_sparkle':
        drawSparkle(ctx, p);
        break;
      case 'explosion':
        drawExplosionParticle(ctx, p);
        break;
      case 'missile_smoke':
        drawFireParticle(ctx, p);
        break;
      case 'pickup_glow':
        drawPickupGlow(ctx, p);
        break;
      default:
        drawFireParticle(ctx, p);
    }
    ctx.restore();
  }
}

function drawFireParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const r = p.size * p.life;
  const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},1)`);
  grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawCasing(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
  ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
  const s = p.size * p.life;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - s);
  ctx.lineTo(p.x + s * 0.3, p.y - s * 0.3);
  ctx.lineTo(p.x + s, p.y);
  ctx.lineTo(p.x + s * 0.3, p.y + s * 0.3);
  ctx.lineTo(p.x, p.y + s);
  ctx.lineTo(p.x - s * 0.3, p.y + s * 0.3);
  ctx.lineTo(p.x - s, p.y);
  ctx.lineTo(p.x - s * 0.3, p.y - s * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawExplosionParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const r = p.size * p.life;
  // Additive blending for hot particles
  ctx.globalCompositeOperation = 'lighter';
  const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},0.8)`);
  grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function drawPickupGlow(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.globalCompositeOperation = 'lighter';
  const r = p.size * p.life;
  const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},0.6)`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export function drawCoins(ctx: CanvasRenderingContext2D, coins: Coin[], tick: number): void {
  for (const c of coins) {
    if (!c.active) continue;
    drawCoin(ctx, c, tick);
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, c: Coin, tick: number): void {
  const squish = Math.abs(Math.cos(c.animFrame * 0.08)) * 0.3 + 0.7;
  const glint = Math.sin(c.animFrame * 0.12 + tick * 0.01) * 0.3 + 0.7;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(squish, 1 / squish);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 2, 10, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Coin body
  const grd = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
  grd.addColorStop(0, `rgba(255, 240, 80, ${glint})`);
  grd.addColorStop(0.6, 'rgba(220, 180, 20, 1)');
  grd.addColorStop(1, 'rgba(160, 120, 0, 1)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  // Rim
  ctx.strokeStyle = 'rgba(255,200,0,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Symbol
  ctx.fillStyle = 'rgba(140, 100, 0, 0.8)';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', 0, 0);

  ctx.restore();
}

export function drawSpinTokens(ctx: CanvasRenderingContext2D, tokens: SpinToken[]): void {
  for (const t of tokens) {
    if (!t.active) continue;
    drawSpinToken(ctx, t);
  }
}

function drawSpinToken(ctx: CanvasRenderingContext2D, t: SpinToken): void {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.animFrame * 0.03);

  // Glow
  const grd = ctx.createRadialGradient(0, 0, 4, 0, 0, 20);
  grd.addColorStop(0, 'rgba(255,100,200,0.5)');
  grd.addColorStop(1, 'rgba(255,100,200,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  // Star shape
  ctx.fillStyle = '#ff88cc';
  ctx.strokeStyle = '#ffaadd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const ia = a + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
    else ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
    ctx.lineTo(Math.cos(ia) * 6, Math.sin(ia) * 6);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawVehicleCrates(ctx: CanvasRenderingContext2D, crates: VehicleCrate[]): void {
  for (const c of crates) {
    if (!c.active) continue;
    drawVehicleCrate(ctx, c);
  }
}

function drawVehicleCrate(ctx: CanvasRenderingContext2D, c: VehicleCrate): void {
  ctx.save();
  ctx.translate(c.x, c.y);

  // Drop shadow
  if (c.dropAnim < 1) {
    const shadowY = 560 - c.y + 20;
    ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - Math.abs(c.y - 560) / 400)})`;
    ctx.beginPath();
    ctx.ellipse(0, shadowY, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crate box
  ctx.fillStyle = '#885500';
  ctx.strokeStyle = '#cc8800';
  ctx.lineWidth = 2;
  ctx.fillRect(-24, -24, 48, 48);
  ctx.strokeRect(-24, -24, 48, 48);

  // Cross straps
  ctx.strokeStyle = '#cc8800';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-24, 0); ctx.lineTo(24, 0);
  ctx.moveTo(0, -24); ctx.lineTo(0, 24);
  ctx.stroke();

  // Vehicle icon color dot + abbreviation
  const iconColors: Record<string, string> = {
    bounce_buggy: '#ff7700',
    gravity_suit: '#8800ff',
    sky_serpent: '#00cc44',
    stomp_mech: '#8899aa',
    wave_sub: '#0088cc',
    drill_rocket: '#cc2200',
  };
  const iconLabels: Record<string, string> = {
    bounce_buggy: 'BB', gravity_suit: 'GS',
    sky_serpent: 'SS', stomp_mech: 'SM',
    wave_sub: 'WS', drill_rocket: 'DR',
  };
  const col = iconColors[c.kind] ?? '#888888';
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(iconLabels[c.kind] ?? '??', 0, 0);

  // Glow
  ctx.globalCompositeOperation = 'lighter';
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
  grd.addColorStop(0, `${iconColors[c.kind] ?? '#888888'}44`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
}
