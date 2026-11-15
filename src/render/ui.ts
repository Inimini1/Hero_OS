import { CFG } from '../config';
import type { SaveData } from '../save';
import type { Mission } from '../sim/types';
import { getMissionDescription } from '../sim/missions';
import { GADGET_DEFS } from '../sim/gadgets';
import { OUTFIT_COLORS, JETPACK_STYLES } from './hero';

export interface Button {
  x: number; y: number; w: number; h: number;
  label: string;
  color: string;
  textColor?: string;
  action: string;
  enabled?: boolean;
}

export function hitButton(buttons: Button[], px: number, py: number): string | null {
  for (const btn of buttons) {
    if (btn.enabled === false) continue;
    if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
      return btn.action;
    }
  }
  return null;
}

export function drawButton(ctx: CanvasRenderingContext2D, btn: Button): void {
  const enabled = btn.enabled !== false;
  ctx.fillStyle = enabled ? btn.color : 'rgba(60,60,80,0.5)';
  ctx.beginPath();
  ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fill();

  // Highlight edge
  ctx.strokeStyle = enabled ? 'rgba(255,255,255,0.3)' : 'rgba(100,100,100,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bottom shadow edge
  ctx.strokeStyle = enabled ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(btn.x + 1, btn.y + 2, btn.w - 2, btn.h - 2, 7);
  ctx.stroke();

  ctx.fillStyle = btn.textColor ?? (enabled ? '#ffffff' : '#888899');
  ctx.font = `bold ${Math.min(btn.h * 0.4, 20)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
}

export function drawButtons(ctx: CanvasRenderingContext2D, buttons: Button[]): void {
  for (const btn of buttons) drawButton(ctx, btn);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 8): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ── Menu Scene ─────────────────────────────────────────────────────────────

export function drawMenuScene(
  ctx: CanvasRenderingContext2D,
  tick: number,
  heroAnim: number,
  save: SaveData
): Button[] {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;

  // Title
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, W / 2 - 280, 60, 560, 110);
  ctx.fill();

  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Glow
  ctx.shadowColor = '#4477ff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ROCKET', W / 2, 95);
  ctx.fillStyle = '#ff8800';
  ctx.fillText('RASCAL', W / 2, 155);
  ctx.shadowBlur = 0;

  // Hero walking animation
  drawMenuHero(ctx, 180 + Math.sin(heroAnim * 0.05) * 3, H - 90, heroAnim);

  // Best distance
  if (save.bestDistance > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, W / 2 - 200, 185, 400, 36);
    ctx.fill();
    ctx.fillStyle = '#ffdd00';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Best: ${Math.floor(save.bestDistance)}m`, W / 2, 203);
  }

  // Coins display
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W / 2 + 50, 185, 160, 36);
  ctx.fill();
  ctx.fillStyle = '#ffdd00';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`💰 ${save.coins}`, W / 2 + 130, 203);

  // Buttons
  const buttons: Button[] = [
    { x: W/2 - 140, y: H/2 - 60, w: 280, h: 56, label: 'PLAY', color: '#2244cc', action: 'play' },
    { x: W/2 - 140, y: H/2 + 10, w: 136, h: 44, label: 'SHOP', color: '#334422', action: 'shop' },
    { x: W/2 + 4, y: H/2 + 10, w: 136, h: 44, label: 'MISSIONS', color: '#334422', action: 'missions' },
    { x: W/2 - 140, y: H/2 + 68, w: 136, h: 44, label: 'SETTINGS', color: '#223344', action: 'settings' },
    { x: W/2 + 4, y: H/2 + 68, w: 136, h: 44, label: 'DAILY', color: '#443322', action: 'daily' },
  ];
  drawButtons(ctx, buttons);

  // Rank
  ctx.fillStyle = '#8888aa';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`Rank ${save.rank} · ${save.totalRuns} runs`, W / 2, H - 10);

  void tick;
  return buttons;
}

function drawMenuHero(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
  ctx.save();
  ctx.translate(x, y);

  // Simple animated character on the menu background
  const run = Math.sin(frame * 0.3) * 0.4;
  ctx.fillStyle = '#3355cc';
  ctx.fillRect(-10, -30, 20, 24);

  // Head
  ctx.fillStyle = '#ffcc99';
  ctx.beginPath();
  ctx.arc(0, -38, 10, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#223388';
  ctx.save();
  ctx.translate(-4, -8);
  ctx.rotate(run);
  ctx.fillRect(-3, 0, 6, 14);
  ctx.restore();
  ctx.save();
  ctx.translate(4, -8);
  ctx.rotate(-run);
  ctx.fillRect(-3, 0, 6, 14);
  ctx.restore();

  // Jetpack
  ctx.fillStyle = '#445566';
  ctx.fillRect(-18, -28, 8, 18);

  ctx.restore();
}

// ── Game Over Scene ────────────────────────────────────────────────────────

export function drawGameOverScene(
  ctx: CanvasRenderingContext2D,
  distanceMeters: number,
  coinsEarned: number,
  tokensEarned: number,
  bestDistance: number,
  isNewBest: boolean,
  missions: Mission[],
  save: SaveData,
  reviveCost: number,
  reviveUsed: boolean,
  spinTokens: number,
  seed: number
): Button[] {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  // Panel
  ctx.fillStyle = 'rgba(10,10,30,0.95)';
  roundRect(ctx, W/2 - 320, 30, 640, H - 60);
  ctx.fill();
  ctx.strokeStyle = '#334466';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  ctx.fillStyle = isNewBest ? '#ffdd00' : '#cc4444';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isNewBest ? 'NEW BEST!' : 'WIPED OUT', W/2, 80);

  // Stats
  const startY = 125;
  drawStatRow(ctx, 'Distance', `${distanceMeters}m`, W/2, startY);
  if (isNewBest) {
    ctx.fillStyle = '#ffdd00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('★ NEW BEST', W/2 + 230, startY);
  }
  drawStatRow(ctx, 'Coins', `+${coinsEarned}`, W/2, startY + 36);
  if (tokensEarned > 0) {
    drawStatRow(ctx, 'Spin Tokens', `+${tokensEarned}`, W/2, startY + 72);
  }
  drawStatRow(ctx, 'Best', `${Math.floor(bestDistance)}m`, W/2, startY + 108);

  // Seed
  ctx.fillStyle = '#445566';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Seed: ${seed}`, W/2, startY + 144);

  // Missions
  const missionY = startY + 170;
  ctx.fillStyle = '#8888aa';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MISSIONS', W/2, missionY);

  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    if (!m) continue;
    const my = missionY + 25 + i * 44;
    const progress = Math.min(1, m.progress / m.target);
    const desc = getMissionDescription(m);

    ctx.fillStyle = m.completed ? 'rgba(0,255,100,0.15)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, W/2 - 290, my - 15, 580, 36);
    ctx.fill();

    ctx.fillStyle = m.completed ? '#00ff88' : '#ccccee';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(desc.length > 50 ? desc.slice(0, 50) + '…' : desc, W/2 - 280, my - 2);

    ctx.fillStyle = '#222244';
    ctx.fillRect(W/2 - 280, my + 10, 560, 6);
    ctx.fillStyle = m.completed ? '#00ff88' : '#4488ff';
    ctx.fillRect(W/2 - 280, my + 10, 560 * progress, 6);
  }

  // Buttons
  const btnY = H - 160;
  const buttons: Button[] = [
    { x: W/2 - 310, y: btnY, w: 150, h: 50, label: 'RETRY', color: '#1a3a8a', action: 'retry' },
    { x: W/2 - 150, y: btnY, w: 150, h: 50, label: `REVIVE (${reviveCost})`, color: reviveUsed ? '#553322' : '#884400', action: 'revive', enabled: !reviveUsed && save.coins >= reviveCost },
    { x: W/2 + 10, y: btnY, w: 150, h: 50, label: `SPIN (${spinTokens})★`, color: spinTokens > 0 ? '#5500aa' : '#333355', action: 'spin', enabled: spinTokens > 0 },
    { x: W/2 + 170, y: btnY, w: 140, h: 50, label: 'MENU', color: '#222233', action: 'menu' },
  ];
  drawButtons(ctx, buttons);

  return buttons;
}

function drawStatRow(ctx: CanvasRenderingContext2D, label: string, value: string, cx: number, y: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(ctx, cx - 290, y - 14, 580, 30);
  ctx.fill();

  ctx.fillStyle = '#8888aa';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx - 278, y + 1);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(value, cx + 278, y + 1);
}

// ── Shop Scene ─────────────────────────────────────────────────────────────

export function drawShopScene(
  ctx: CanvasRenderingContext2D,
  save: SaveData,
  _selectedTab: number
): Button[] {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SHOP', W/2, 20);

  ctx.fillStyle = '#ffdd00';
  ctx.font = '20px monospace';
  ctx.fillText(`Coins: ${save.coins}`, W/2, 68);

  const buttons: Button[] = [];
  const COLS = 3;
  const startX = W/2 - 400;
  const startY = 120;

  for (let i = 0; i < GADGET_DEFS.length; i++) {
    const def = GADGET_DEFS[i]!;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const bx = startX + col * 270;
    const by = startY + row * 140;
    const level = save.gadgetLevels[def.id] ?? 0;
    const owned = level > 0;
    const maxed = level >= def.maxLevel;
    const upgCost = def.baseCost * (level + 1);
    const canBuy = !maxed && save.coins >= upgCost;

    ctx.fillStyle = owned ? 'rgba(20,40,80,0.8)' : 'rgba(20,20,30,0.8)';
    roundRect(ctx, bx, by, 260, 120);
    ctx.fill();
    ctx.strokeStyle = owned ? '#4477ff' : '#333355';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name, bx + 10, by + 10);

    ctx.fillStyle = '#8888aa';
    ctx.font = '11px monospace';
    const shortDesc = def.description.length > 32 ? def.description.slice(0, 32) + '…' : def.description;
    ctx.fillText(shortDesc, bx + 10, by + 32);

    if (level > 0) {
      ctx.fillStyle = '#4477ff';
      ctx.font = '11px monospace';
      ctx.fillText(`Lv ${level}: ${def.levelLabel(level - 1)}`, bx + 10, by + 52);
    }

    // Level pips
    for (let l = 0; l < def.maxLevel; l++) {
      ctx.fillStyle = l < level ? '#4477ff' : '#223344';
      ctx.beginPath();
      ctx.arc(bx + 12 + l * 14, by + 76, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buy/upgrade button
    const label = maxed ? 'MAXED' : owned ? `UPGRADE ${upgCost}` : `BUY ${upgCost}`;
    buttons.push({
      x: bx + 10, y: by + 90, w: 240, h: 24,
      label, color: canBuy ? '#1a3a8a' : '#223344',
      action: `gadget_${def.id}`,
      enabled: canBuy,
    });
  }

  drawButtons(ctx, buttons);

  // Cosmetics heading
  const cosY = startY + Math.ceil(GADGET_DEFS.length / COLS) * 140 + 20;
  ctx.fillStyle = '#8888aa';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('OUTFITS', W/2 - 200, cosY);
  ctx.fillText('JETPACKS', W/2 + 200, cosY);

  // Outfit swatches
  const outfitGridX = W/2 - 400;
  for (let i = 0; i < 10; i++) {
    const col2 = i % 5;
    const row2 = Math.floor(i / 5);
    const ox = outfitGridX + col2 * 56 + 10;
    const oy = cosY + 30 + row2 * 60;
    const unlocked = save.unlockedOutfits.includes(i);
    const outfit = OUTFIT_COLORS[i] ?? OUTFIT_COLORS[0]!;

    ctx.fillStyle = unlocked ? outfit.body : '#222233';
    roundRect(ctx, ox, oy, 44, 44);
    ctx.fill();
    if (save.outfit === i) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (!unlocked) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, ox, oy, 44, 44);
      ctx.fill();
      ctx.fillStyle = '#666677';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', ox + 22, oy + 22);
    }

    if (unlocked) {
      buttons.push({
        x: ox, y: oy, w: 44, h: 44,
        label: '', color: 'transparent',
        action: `outfit_${i}`,
      });
    }
  }

  // Jetpack swatches
  const jpGridX = W/2 + 100;
  for (let i = 0; i < 5; i++) {
    const ox = jpGridX + (i % 5) * 56 + 10;
    const oy = cosY + 30;
    const unlocked = save.unlockedJetpackStyles.includes(i);
    const style = JETPACK_STYLES[i] ?? JETPACK_STYLES[0]!;

    ctx.fillStyle = unlocked ? style.body : '#222233';
    roundRect(ctx, ox, oy, 44, 44);
    ctx.fill();
    if (save.jetpackStyle === i) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (unlocked) {
      buttons.push({ x: ox, y: oy, w: 44, h: 44, label: '', color: 'transparent', action: `jetpack_${i}` });
    }
  }

  buttons.push({ x: 20, y: 20, w: 100, h: 36, label: '← BACK', color: '#222233', action: 'back' });
  return buttons;
}

// ── Missions Scene ─────────────────────────────────────────────────────────

export function drawMissionsScene(
  ctx: CanvasRenderingContext2D,
  missions: Mission[],
  rank: number,
  rankProgress: number
): Button[] {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MISSIONS', W/2, 20);

  ctx.fillStyle = '#8888aa';
  ctx.font = '18px monospace';
  ctx.fillText(`Rank ${rank} · ${rankProgress}/3 to rank up`, W/2, 68);

  // Rank progress bar
  ctx.fillStyle = '#222244';
  roundRect(ctx, W/2 - 200, 94, 400, 12);
  ctx.fill();
  ctx.fillStyle = '#4477ff';
  roundRect(ctx, W/2 - 200, 94, 400 * (rankProgress / 3), 12);
  ctx.fill();

  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    if (!m) continue;
    const my = 140 + i * 150;
    const desc = getMissionDescription(m);
    const progress = Math.min(1, m.progress / m.target);

    ctx.fillStyle = m.completed ? 'rgba(0,255,100,0.1)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, W/2 - 320, my, 640, 130);
    ctx.fill();
    ctx.strokeStyle = m.completed ? '#00ff88' : '#334466';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = m.completed ? '#00ff88' : '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(desc, W/2 - 308, my + 14);

    ctx.fillStyle = '#8888aa';
    ctx.font = '14px monospace';
    ctx.fillText(`Reward: +${m.rewardCoins} coins`, W/2 - 308, my + 42);

    ctx.fillStyle = '#222244';
    roundRect(ctx, W/2 - 308, my + 70, 616, 14);
    ctx.fill();
    ctx.fillStyle = m.completed ? '#00ff88' : '#4488ff';
    roundRect(ctx, W/2 - 308, my + 70, 616 * progress, 14);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(m.progress)}/${m.target}`, W/2 + 308, my + 97);

    if (m.completed) {
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('✓ COMPLETE', W/2 + 308, my + 14);
    }
  }

  const buttons: Button[] = [
    { x: 20, y: 20, w: 100, h: 36, label: '← BACK', color: '#222233', action: 'back' },
  ];
  drawButtons(ctx, buttons);
  return buttons;
}

// ── Settings Scene ─────────────────────────────────────────────────────────

export function drawSettingsScene(
  ctx: CanvasRenderingContext2D,
  save: SaveData
): Button[] {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SETTINGS', W/2, 20);

  const buttons: Button[] = [];
  const startX = W/2 - 300;
  const col2X = W/2 + 50;

  // Volume sliders (shown as buttons for simplicity)
  const settings = [
    { label: `Music: ${Math.round(save.musicVolume * 100)}%`, action: 'music_vol', y: 90 },
    { label: `SFX: ${Math.round(save.sfxVolume * 100)}%`, action: 'sfx_vol', y: 150 },
  ];
  for (const s of settings) {
    ctx.fillStyle = '#8888aa';
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label, startX, s.y + 18);
    buttons.push({ x: W/2 + 60, y: s.y, w: 60, h: 36, label: '−', color: '#334466', action: `${s.action}_down` });
    buttons.push({ x: W/2 + 130, y: s.y, w: 60, h: 36, label: '+', color: '#334466', action: `${s.action}_up` });
  }

  const toggles = [
    { label: 'Screen Shake', value: save.screenShake, action: 'toggle_shake', y: 220 },
    { label: 'Reduced Motion', value: save.reducedMotion, action: 'toggle_motion', y: 280 },
    { label: 'Colorblind Mode', value: save.colorblindMode, action: 'toggle_cb', y: 340 },
    { label: 'Left-Handed UI', value: save.leftHanded, action: 'toggle_lh', y: 400 },
    { label: 'Mute All', value: save.muted, action: 'toggle_mute', y: 460 },
  ];

  for (const t of toggles) {
    ctx.fillStyle = '#8888aa';
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label, startX, t.y + 18);
    buttons.push({
      x: col2X + 50, y: t.y, w: 100, h: 36,
      label: t.value ? 'ON' : 'OFF',
      color: t.value ? '#224422' : '#442222',
      action: t.action,
    });
  }

  buttons.push({ x: 20, y: 20, w: 100, h: 36, label: '← BACK', color: '#222233', action: 'back' });
  drawButtons(ctx, buttons);
  void H;
  return buttons;
}

// ── Spin Machine ───────────────────────────────────────────────────────────

export type SpinPrize = 'coins_small' | 'coins_big' | 'revive' | 'gadget_voucher' | 'vehicle_voucher' | 'nothing';

const SPIN_PRIZES: SpinPrize[] = [
  'coins_small', 'coins_big', 'revive', 'gadget_voucher', 'vehicle_voucher', 'nothing',
];
const SPIN_LABELS: Record<SpinPrize, string> = {
  coins_small: '💰 100 Coins',
  coins_big: '💰💰 500 Coins',
  revive: '♻ Revive',
  gadget_voucher: '⚙ Gadget',
  vehicle_voucher: '🚀 Vehicle',
  nothing: 'Better Luck...',
};

export function pickSpinPrize(luckyCharm: boolean): SpinPrize {
  const weights = luckyCharm
    ? [30, 15, 15, 15, 15, 10]
    : [35, 10, 10, 10, 10, 25];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SPIN_PRIZES.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) return SPIN_PRIZES[i] as SpinPrize;
  }
  return 'nothing';
}

export function drawSpinMachine(
  ctx: CanvasRenderingContext2D,
  spinProgress: number, // 0–1 animation progress
  prize: SpinPrize,
  spinning: boolean
): Button[] {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPIN MACHINE', W/2, 80);

  // Reels
  const reelW = 140, reelH = 90, reelGap = 20;
  const totalW = 3 * reelW + 2 * reelGap;
  const startRX = W/2 - totalW/2;
  const ry = H/2 - 60;

  for (let r = 0; r < 3; r++) {
    const rx = startRX + r * (reelW + reelGap);
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, rx, ry, reelW, reelH, 8);
    ctx.fill();
    ctx.strokeStyle = '#4477ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (spinning) {
      const offset = (spinProgress * 10 + r * 2) % 1;
      ctx.fillStyle = `rgba(100,150,255,${0.5 + Math.sin(offset * Math.PI * 2) * 0.3})`;
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(['💰', '🎲', '⭐', '♻', '⚙'][Math.floor(offset * 5)] ?? '?', rx + reelW/2, ry + reelH/2);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icons = ['💰', '💰', '♻', '⚙', '🚀', '😶'];
      const prizeIdx = SPIN_PRIZES.indexOf(prize);
      ctx.fillText(icons[prizeIdx] ?? '?', rx + reelW/2, ry + reelH/2);
    }
  }

  // Result
  if (!spinning) {
    ctx.fillStyle = prize === 'nothing' ? '#884444' : '#44aa44';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SPIN_LABELS[prize], W/2, H/2 + 60);
  }

  const buttons: Button[] = [];
  if (!spinning) {
    buttons.push({ x: W/2 - 100, y: H - 100, w: 200, h: 50, label: 'CONTINUE', color: '#1a3a8a', action: 'continue' });
  }
  drawButtons(ctx, buttons);
  return buttons;
}

// ── Tutorial overlay ──────────────────────────────────────────────────────

export function drawTutorial(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  const W = CFG.WORLD_W;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, W/2 - 220, 280, 440, 80);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Hold to Thrust! Release to Fall', W/2, 310);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#aaaacc';
  ctx.fillText('Space / Click / Tap', W/2, 340);
  ctx.restore();
}
