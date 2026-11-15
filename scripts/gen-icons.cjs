/**
 * Generates PWA icon PNGs using Playwright's browser canvas.
 * Run via: node scripts/gen-icons.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  for (const size of [192, 512]) {
    await page.setContent(`<canvas id="c" width="${size}" height="${size}"></canvas>`);
    const png = await page.evaluate((sz) => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      const s = sz / 192;

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, sz);
      bg.addColorStop(0, '#1a1a2e');
      bg.addColorStop(1, '#0d0d1a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, sz, sz);

      // Rocket body
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.ellipse(96*s, 110*s, 22*s, 36*s, 0, 0, Math.PI*2);
      ctx.fill();

      // Nose cone
      ctx.fillStyle = '#ffaa44';
      ctx.beginPath();
      ctx.moveTo(96*s, 60*s);
      ctx.lineTo(74*s, 100*s);
      ctx.lineTo(118*s, 100*s);
      ctx.closePath();
      ctx.fill();

      // Left fin
      ctx.fillStyle = '#cc4400';
      ctx.beginPath();
      ctx.moveTo(74*s, 130*s); ctx.lineTo(50*s, 155*s); ctx.lineTo(74*s, 145*s);
      ctx.closePath(); ctx.fill();

      // Right fin
      ctx.beginPath();
      ctx.moveTo(118*s, 130*s); ctx.lineTo(142*s, 155*s); ctx.lineTo(118*s, 145*s);
      ctx.closePath(); ctx.fill();

      // Flame
      const flame = ctx.createRadialGradient(96*s, 158*s, 2*s, 96*s, 163*s, 20*s);
      flame.addColorStop(0, 'rgba(255,255,100,0.95)');
      flame.addColorStop(0.5, 'rgba(255,100,0,0.8)');
      flame.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.ellipse(96*s, 158*s, 13*s, 22*s, 0, 0, Math.PI*2);
      ctx.fill();

      // Window
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.arc(96*s, 102*s, 10*s, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2*s;
      ctx.stroke();

      return canvas.toDataURL('image/png');
    }, size);

    const data = Buffer.from(png.split(',')[1], 'base64');
    const outPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
    fs.writeFileSync(outPath, data);
    console.log(`Written ${outPath}`);
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
