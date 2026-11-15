import { CFG } from '../config';
import type { Hero, Vehicle, VehicleKind } from '../sim/types';

/** Draw Zara Volt with procedural animation. */
export function drawHero(
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  vehicle: Vehicle,
  interp: number,
  prevY: number,
  _tick: number
): void {
  if (vehicle.active && vehicle.hp > 0) {
    drawVehicleHero(ctx, hero, vehicle, interp, prevY);
    return;
  }

  const y = prevY + (hero.y - prevY) * interp;
  const x = hero.x;

  ctx.save();
  ctx.translate(x, y);

  // Death spin
  if (hero.state === 'dead') {
    ctx.rotate(hero.deathTimer * 0.12);
  } else {
    // Tilt based on velocity
    const tilt = hero.state === 'flying' ? -0.15 : 0;
    const thrustTilt = -hero.thrustGain * 0.12;
    ctx.rotate(tilt + thrustTilt);
  }

  // Flash when invulnerable
  if (hero.invulnTicks > 0 && Math.floor(hero.invulnTicks / 4) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // ── Jetpack (behind hero) ──────────────────────────────────────────────
  drawJetpack(ctx, hero.jetpackStyle, hero.thrustGain);

  // ── Body ──────────────────────────────────────────────────────────────
  const outfit = OUTFIT_COLORS[hero.outfit % OUTFIT_COLORS.length] ?? OUTFIT_COLORS[0]!;
  ctx.fillStyle = outfit.body;
  ctx.beginPath();
  ctx.ellipse(0, -4, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Head ──────────────────────────────────────────────────────────────
  ctx.fillStyle = outfit.skin;
  ctx.beginPath();
  ctx.ellipse(0, -18, 9, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hair
  ctx.fillStyle = outfit.hair;
  ctx.beginPath();
  ctx.ellipse(0, -24, 9, 5, 0, 0, Math.PI);
  ctx.fill();

  // Goggles
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(-5, -18, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, -18, 4, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outfit.goggle;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-1, -18); ctx.lineTo(1, -18);
  ctx.stroke();

  // ── Legs ──────────────────────────────────────────────────────────────
  if (hero.state === 'floor') {
    drawRunLegs(ctx, hero.floorRunFrame, outfit.pants);
  } else {
    // Flying pose - legs tucked
    ctx.fillStyle = outfit.pants;
    ctx.fillRect(-6, 6, 5, 10);
    ctx.fillRect(1, 6, 5, 10);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawJetpack(ctx: CanvasRenderingContext2D, style: number, thrustGain: number): void {
  const s = JETPACK_STYLES[style % JETPACK_STYLES.length] ?? JETPACK_STYLES[0]!;

  // Flame / exhaust glow (behind everything else)
  if (thrustGain > 0.02) {
    const flameLen = 8 + thrustGain * 22;
    const fg = ctx.createLinearGradient(-19, 0, -19 - flameLen, 0);
    fg.addColorStop(0, s.flame + 'dd');
    fg.addColorStop(0.4, s.flame + '88');
    fg.addColorStop(1, s.flame + '00');
    ctx.fillStyle = fg;
    // Upper nozzle flame
    ctx.beginPath();
    ctx.moveTo(-19, -4);
    ctx.lineTo(-19 - flameLen, -1 + thrustGain * 2);
    ctx.lineTo(-19, -1);
    ctx.closePath();
    ctx.fill();
    // Lower nozzle flame
    ctx.beginPath();
    ctx.moveTo(-19, 10);
    ctx.lineTo(-19 - flameLen, 7 - thrustGain * 2);
    ctx.lineTo(-19, 7);
    ctx.closePath();
    ctx.fill();
    // Glow halo
    const grd = ctx.createRadialGradient(-22, 3, 0, -22, 3, 12 + thrustGain * 10);
    grd.addColorStop(0, s.flame + '55');
    grd.addColorStop(1, s.flame + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(-22, 3, 12 + thrustGain * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Main pack body ────────────────────────────────────────────────────
  ctx.fillStyle = s.body;
  // Rounded rect body
  ctx.beginPath();
  ctx.roundRect(-20, -15, 10, 24, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Panel highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-19, -14, 8, 8);

  // Tank rivet details
  ctx.fillStyle = s.nozzle;
  ctx.fillRect(-18, -6, 7, 2);
  ctx.fillRect(-18, 0, 7, 2);

  // ── Upper nozzle ──────────────────────────────────────────────────────
  ctx.fillStyle = s.nozzle;
  ctx.fillRect(-21, -11, 4, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-21, -8, 4, 3);

  // ── Lower nozzle ──────────────────────────────────────────────────────
  ctx.fillStyle = s.nozzle;
  ctx.fillRect(-21, 5, 4, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-21, 5, 4, 3);

  // Status LED (always visible)
  const ledColor = thrustGain > 0.1 ? s.flame : '#00ff88';
  ctx.fillStyle = ledColor;
  ctx.beginPath();
  ctx.arc(-15, -11, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRunLegs(ctx: CanvasRenderingContext2D, frame: number, color: string): void {
  const a = Math.sin(frame * 0.3) * 0.5;
  ctx.fillStyle = color;
  // Left leg
  ctx.save();
  ctx.translate(-3, 8);
  ctx.rotate(a);
  ctx.fillRect(-3, 0, 5, 12);
  ctx.restore();
  // Right leg
  ctx.save();
  ctx.translate(3, 8);
  ctx.rotate(-a);
  ctx.fillRect(-2, 0, 5, 12);
  ctx.restore();
}

function drawVehicleHero(
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  vehicle: Vehicle,
  interp: number,
  prevY: number
): void {
  const y = prevY + (hero.y - prevY) * interp;
  ctx.save();
  ctx.translate(hero.x, y);
  drawVehicle(ctx, vehicle.kind, vehicle.hp <= 0 ? vehicle.breakTimer : 0);
  ctx.restore();
}

function drawVehicle(ctx: CanvasRenderingContext2D, kind: VehicleKind, breakTimer: number): void {
  const shakeX = breakTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
  const shakeY = breakTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
  ctx.translate(shakeX, shakeY);

  switch (kind) {
    case 'bounce_buggy': drawBounceBuggy(ctx); break;
    case 'gravity_suit': drawGravitySuit(ctx); break;
    case 'sky_serpent': drawSkySerpent(ctx); break;
    case 'stomp_mech': drawStompMech(ctx); break;
    case 'wave_sub': drawWaveSub(ctx); break;
    case 'drill_rocket': drawDrillRocket(ctx); break;
  }
}

function drawBounceBuggy(ctx: CanvasRenderingContext2D): void {
  // Body
  ctx.fillStyle = '#ff7700';
  ctx.fillRect(-28, -14, 56, 20);
  ctx.fillStyle = '#cc5500';
  ctx.fillRect(-24, -20, 48, 10);
  // Windows
  ctx.fillStyle = 'rgba(100,200,255,0.5)';
  ctx.fillRect(-18, -18, 16, 8);
  ctx.fillRect(2, -18, 16, 8);
  // Wheels
  ctx.fillStyle = '#333';
  for (const wx of [-18, 18]) {
    ctx.beginPath();
    ctx.arc(wx, 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Hero in cockpit
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath();
  ctx.ellipse(0, -16, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGravitySuit(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8800ff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#bb44ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Energy field
  const grd = ctx.createRadialGradient(0, 0, 10, 0, 0, 30);
  grd.addColorStop(0, 'rgba(136,0,255,0)');
  grd.addColorStop(1, 'rgba(180,100,255,0.3)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hero inside
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath();
  ctx.ellipse(0, -4, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkySerpent(ctx: CanvasRenderingContext2D): void {
  // Dragon-like creature
  ctx.fillStyle = '#00cc44';
  // Body segments
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-i * 14, Math.sin(i * 0.8) * 8, 14 - i * 2, 10 - i, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Head
  ctx.fillStyle = '#00dd44';
  ctx.beginPath();
  ctx.ellipse(14, 0, 16, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(20, -4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawStompMech(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8899aa';
  ctx.fillRect(-24, -30, 48, 36);
  ctx.fillStyle = '#667788';
  ctx.fillRect(-18, -40, 36, 14);
  // Visor
  ctx.fillStyle = 'rgba(255,100,0,0.8)';
  ctx.fillRect(-12, -38, 24, 8);
  // Arms
  ctx.fillStyle = '#8899aa';
  ctx.fillRect(-34, -24, 12, 20);
  ctx.fillRect(22, -24, 12, 20);
  // Legs
  ctx.fillStyle = '#667788';
  ctx.fillRect(-18, 6, 14, 20);
  ctx.fillRect(4, 6, 14, 20);
}

function drawWaveSub(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#0088cc';
  // Hull
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Conning tower
  ctx.fillStyle = '#006699';
  ctx.fillRect(-6, -20, 12, 10);
  // Porthole
  ctx.fillStyle = 'rgba(100,200,255,0.5)';
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  // Hero
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath();
  ctx.arc(0, -2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDrillRocket(ctx: CanvasRenderingContext2D): void {
  // Rocket body
  ctx.fillStyle = '#cc2200';
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-20, -12);
  ctx.lineTo(-20, 12);
  ctx.closePath();
  ctx.fill();
  // Drill tip
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.moveTo(44, 0);
  ctx.lineTo(28, -8);
  ctx.lineTo(28, 8);
  ctx.closePath();
  ctx.fill();
  // Windows
  ctx.fillStyle = 'rgba(100,200,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(5, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

export const OUTFIT_COLORS = [
  { body: '#3355cc', pants: '#223388', skin: '#ffcc99', hair: '#333333', goggle: '#00ccff' },
  { body: '#cc3333', pants: '#882222', skin: '#ffcc99', hair: '#8b4513', goggle: '#ffcc00' },
  { body: '#33cc55', pants: '#228844', skin: '#ffcc99', hair: '#000000', goggle: '#ff4444' },
  { body: '#cc8833', pants: '#885522', skin: '#c8a060', hair: '#1a0a00', goggle: '#44ff88' },
  { body: '#8833cc', pants: '#552288', skin: '#ffcc99', hair: '#ff88aa', goggle: '#00ff99' },
  { body: '#33cccc', pants: '#228888', skin: '#ffddb0', hair: '#ffd700', goggle: '#ff00ff' },
  { body: '#cccc33', pants: '#888822', skin: '#ffcc99', hair: '#cc0000', goggle: '#0033ff' },
  { body: '#cc3388', pants: '#882255', skin: '#ffcc99', hair: '#220033', goggle: '#aaff00' },
  { body: '#888888', pants: '#444444', skin: '#ffcc99', hair: '#ffffff', goggle: '#ff8800' },
  { body: '#ff8800', pants: '#cc5500', skin: '#c8a060', hair: '#000011', goggle: '#00cccc' },
];

export const JETPACK_STYLES = [
  { body: '#445566', nozzle: '#667788', flame: '#ff6600' }, // Classic
  { body: '#884400', nozzle: '#cc6600', flame: '#ffaa00' }, // Rusty
  { body: '#004488', nozzle: '#0066cc', flame: '#00aaff' }, // Ice
  { body: '#440044', nozzle: '#880088', flame: '#ff00ff' }, // Neon
  { body: '#004400', nozzle: '#008800', flame: '#00ff44' }, // Bio
];
