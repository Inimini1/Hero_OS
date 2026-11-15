/**
 * Generates PWA icons as PNGs using the Canvas API (node-canvas).
 * Run once: node scripts/gen-icons.mjs
 * Requires: npm install -D canvas  (only needed to regenerate icons)
 *
 * If node-canvas isn't available the pre-generated fallback SVG is used instead.
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';

function drawIcon(size) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const s = size / 192; // scale factor

  // Rocket body
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.ellipse(96 * s, 110 * s, 22 * s, 36 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose cone
  ctx.fillStyle = '#ffaa44';
  ctx.beginPath();
  ctx.moveTo(96 * s, 60 * s);
  ctx.lineTo(74 * s, 100 * s);
  ctx.lineTo(118 * s, 100 * s);
  ctx.closePath();
  ctx.fill();

  // Fins
  ctx.fillStyle = '#cc4400';
  ctx.beginPath();
  ctx.moveTo(74 * s, 130 * s);
  ctx.lineTo(50 * s, 155 * s);
  ctx.lineTo(74 * s, 145 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(118 * s, 130 * s);
  ctx.lineTo(142 * s, 155 * s);
  ctx.lineTo(118 * s, 145 * s);
  ctx.closePath();
  ctx.fill();

  // Flame
  const flame = ctx.createRadialGradient(96 * s, 160 * s, 2 * s, 96 * s, 165 * s, 20 * s);
  flame.addColorStop(0, 'rgba(255,255,100,0.9)');
  flame.addColorStop(0.5, 'rgba(255,100,0,0.7)');
  flame.addColorStop(1, 'rgba(255,50,0,0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.ellipse(96 * s, 160 * s, 14 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Window
  ctx.fillStyle = '#88ccff';
  ctx.beginPath();
  ctx.arc(96 * s, 102 * s, 10 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  return c.toBuffer('image/png');
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', drawIcon(192));
writeFileSync('public/icon-512.png', drawIcon(512));
console.log('Icons generated: public/icon-192.png, public/icon-512.png');
