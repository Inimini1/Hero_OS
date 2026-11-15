// Captures every debug scene to ./shots (or --out <dir>).
//   node scripts/shots.mjs                 all scenes
//   node scripts/shots.mjs --only hero     scenes whose name contains "hero"
//   node scripts/shots.mjs --out shots/before
//   node scripts/shots.mjs --url http://localhost:5173   reuse a running dev server
// Set PW_CHROMIUM to a Chromium binary if Playwright's bundled browser is not installed.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1280, H = 720;
const HERO_X = 220, FLOOR_Y = 672, CEILING_Y = 48, MID_Y = (FLOOR_Y + CEILING_Y) / 2;

const heroCrop = y => ({ x: 40, y: Math.max(0, Math.min(H - 260, y - 150)), width: 420, height: 260 });
const stageCrop = { x: 380, y: 60, width: 860, height: 600 };

const ZONES = ['lab', 'cavern', 'sky', 'neon', 'space'];
const VEHICLES = ['bounce_buggy', 'gravity_suit', 'sky_serpent', 'stomp_mech', 'wave_sub', 'drill_rocket'];
const HAZARDS = [
  'zapper', 'zapper_rot', 'zapper_slide', 'laser_warn', 'laser_fire',
  'missile_warn', 'missile', 'missile_homing', 'salvo', 'pendulum', 'vent',
  'coins', 'token', 'crate',
];

/** @type {{group: string, name: string, query: string, crop?: {x:number,y:number,width:number,height:number}}[]} */
const SCENES = [
  // Hero and jetpack
  { group: 'hero', name: 'hero-floor', query: 'state=floor&hud=0', crop: heroCrop(FLOOR_Y) },
  { group: 'hero', name: 'hero-floor-f2', query: 'state=floor&hud=0&t=246', crop: heroCrop(FLOOR_Y) },
  { group: 'hero', name: 'hero-floor-f3', query: 'state=floor&hud=0&t=252', crop: heroCrop(FLOOR_Y) },
  { group: 'hero', name: 'hero-flying', query: 'state=flying&hud=0', crop: heroCrop(MID_Y) },
  { group: 'hero', name: 'hero-falling', query: 'state=falling&hud=0', crop: heroCrop(MID_Y) },
  { group: 'hero', name: 'hero-ceiling', query: 'state=ceiling&hud=0', crop: heroCrop(CEILING_Y) },
  { group: 'hero', name: 'hero-dead', query: 'state=dead&hud=0', crop: heroCrop(MID_Y) },
  ...[1, 2, 3, 4].map(j => ({
    group: 'hero', name: `hero-jetpack-${j}`, query: `state=flying&hud=0&jetpack=${j}&outfit=${j}`, crop: heroCrop(MID_Y),
  })),

  // Hazards and pickups, in the Research Lab
  ...HAZARDS.map(h => ({ group: 'hazards', name: `hazard-${h}`, query: `zone=lab&hazard=${h}&hud=0`, crop: stageCrop })),
  { group: 'hazards', name: 'hazard-all', query: 'zone=lab&hazard=all' },

  // Zone backgrounds, clean and with hazards for readability checks
  ...ZONES.map(z => ({ group: 'zones', name: `zone-${z}`, query: `zone=${z}&state=flying&hud=0` })),
  ...ZONES.map(z => ({ group: 'zones', name: `zone-${z}-busy`, query: `zone=${z}&hazard=all` })),

  // Vehicles
  ...VEHICLES.map(v => ({
    group: 'vehicles', name: `vehicle-${v}`, query: `vehicle=${v}&hud=0`,
    crop: heroCrop(v === 'bounce_buggy' || v === 'stomp_mech' ? FLOOR_Y : MID_Y),
  })),

  // HUD and UI states
  { group: 'ui', name: 'ui-menu', query: 'state=menu' },
  { group: 'ui', name: 'ui-hud', query: 'state=flying&hazard=coins' },
  { group: 'ui', name: 'ui-paused', query: 'state=paused&hazard=coins' },
  { group: 'ui', name: 'ui-gameover', query: 'state=gameover' },
  { group: 'ui', name: 'ui-gameover-best', query: 'state=gameover_best' },
  { group: 'ui', name: 'ui-shop-0', query: 'state=shop&tab=0' },
  { group: 'ui', name: 'ui-shop-1', query: 'state=shop&tab=1' },
  { group: 'ui', name: 'ui-shop-2', query: 'state=shop&tab=2' },
  { group: 'ui', name: 'ui-missions', query: 'state=missions' },
  { group: 'ui', name: 'ui-settings', query: 'state=settings' },
  { group: 'ui', name: 'ui-spin', query: 'state=spin' },
  { group: 'ui', name: 'ui-spin-done', query: 'state=spin_done' },
];

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const outDir = path.resolve(ROOT, arg('--out') ?? 'shots');
const only = arg('--only');
const scenes = only ? SCENES.filter(s => s.name.includes(only) || s.group === only) : SCENES;

let server = null;
let baseUrl = arg('--url');
if (!baseUrl) {
  server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  serviceWorkers: 'block',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await mkdir(outDir, { recursive: true });
for (const s of scenes) {
  await page.goto(`${baseUrl}/?${s.query}`);
  await page.waitForSelector('#game-canvas[data-ready="1"]');
  // Two frames so offscreen background layers are built and painted.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: path.join(outDir, `${s.name}.png`) });
  if (s.crop) await page.screenshot({ path: path.join(outDir, `${s.name}@crop.png`), clip: s.crop });
  console.log(`${s.name}  ?${s.query}`);
}

const groups = [...new Set(scenes.map(s => s.group))];
const html = `<!doctype html><meta charset="utf-8"><title>Rocket Rascal shots</title>
<style>body{background:#111;color:#ddd;font:14px system-ui;margin:16px}h2{margin:24px 0 8px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px}
figure{margin:0}img{width:100%;display:block;border:1px solid #333}figcaption{padding:4px 0;color:#999}</style>
${groups.map(g => `<h2>${g}</h2><div class="g">${scenes.filter(s => s.group === g).map(s =>
    `<figure><a href="${s.name}.png"><img loading="lazy" src="${s.crop ? `${s.name}@crop.png` : `${s.name}.png`}"></a>` +
    `<figcaption>${s.name} &middot; ?${s.query.replace(/&/g, '&amp;')}</figcaption></figure>`).join('')}</div>`).join('\n')}`;
await writeFile(path.join(outDir, 'index.html'), html);

await browser.close();
if (server) await server.close();

if (errors.length) {
  console.error(`\n${errors.length} page error(s):\n` + [...new Set(errors)].join('\n'));
  process.exit(1);
}
console.log(`\n${scenes.length} scenes -> ${path.relative(ROOT, outDir)}/ (open index.html for a contact sheet)`);
