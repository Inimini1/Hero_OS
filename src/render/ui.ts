import { CFG } from '../config';
import type { SaveData } from '../save';
import type { Mission, Hero, Vehicle } from '../sim/types';
import { getMissionDescription } from '../sim/missions';
import { GADGET_DEFS } from '../sim/gadgets';
import { drawHero, OUTFIT_COLORS, JETPACK_STYLES } from './hero';

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

  // ── Title banner ────────────────────────────────────────────────────────
  // Gradient title panel
  const titleGrd = ctx.createLinearGradient(0, 30, 0, 170);
  titleGrd.addColorStop(0, 'rgba(0,0,0,0.75)');
  titleGrd.addColorStop(1, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = titleGrd;
  ctx.fillRect(0, 30, W, 140);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Orange-gold glow title (JJR-style warm palette)
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#ff9922';
  ctx.font = 'bold 78px monospace';
  ctx.fillText('ROCKET', W / 2, 92);
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffe040';
  ctx.fillText('RASCAL', W / 2, 158);
  ctx.shadowBlur = 0;

  // ── Hero animated display (right side) ──────────────────────────────
  drawMenuHero(ctx, W - 200 + Math.sin(heroAnim * 0.04) * 4, H - 85, heroAnim, save.outfit, save.jetpackStyle);

  // ── Stats strip ──────────────────────────────────────────────────────
  // Coins counter (top right corner)
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, W - 180, 10, 168, 36, 8);
  ctx.fill();
  // Coin icon
  const ci = ctx.createRadialGradient(W - 160, 28, 2, W - 160, 28, 10);
  ci.addColorStop(0, '#ffe040'); ci.addColorStop(1, 'rgba(255,180,0,0)');
  ctx.fillStyle = ci;
  ctx.beginPath(); ctx.arc(W - 160, 28, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe040';
  ctx.beginPath(); ctx.arc(W - 160, 28, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#885500';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', W - 160, 28.5);
  ctx.fillStyle = '#ffe040';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${save.coins}`, W - 148, 28);

  // Best distance badge
  if (save.bestDistance > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, W - 180, 52, 168, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#f5c800';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`★ BEST ${Math.floor(save.bestDistance)}m`, W - 96, 67);
  }

  // ── Buttons ──────────────────────────────────────────────────────────
  // Large centered PLAY button (JJR GO! button equivalent)
  const buttons: Button[] = [
    {
      x: W/2 - 150, y: H/2 - 50, w: 300, h: 64,
      label: '▶  PLAY',
      color: '#cc5500',
      textColor: '#ffffff',
      action: 'play',
    },
    { x: W/2 - 150, y: H/2 + 28, w: 144, h: 46, label: 'SHOP',     color: '#1a3344', action: 'shop' },
    { x: W/2 + 6,   y: H/2 + 28, w: 144, h: 46, label: 'MISSIONS', color: '#1a3344', action: 'missions' },
    { x: W/2 - 150, y: H/2 + 86, w: 144, h: 40, label: 'SETTINGS', color: '#1a2233', action: 'settings' },
    { x: W/2 + 6,   y: H/2 + 86, w: 144, h: 40, label: 'DAILY',    color: '#332211', action: 'daily' },
  ];
  drawButtons(ctx, buttons);

  // ── Bottom rank bar ──────────────────────────────────────────────────
  const rankGrd = ctx.createLinearGradient(0, H - 32, 0, H);
  rankGrd.addColorStop(0, 'rgba(0,0,0,0.0)');
  rankGrd.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = rankGrd;
  ctx.fillRect(0, H - 32, W, 32);
  ctx.fillStyle = '#8899bb';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`Rank ${save.rank}  ·  ${save.totalRuns} runs`, W / 2, H - 6);

  void tick;
  return buttons;
}

function drawMenuHero(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  frame: number,
  outfitIdx: number,
  jetpackStyle: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(2.0, 2.0);

  const hero: Hero = {
    x: 0, y: 0,
    vy: 0,
    state: 'floor',
    thrustGain: 0.25 + Math.sin(frame * 0.04) * 0.18,
    deathTimer: 0,
    invulnTicks: 0,
    outfit: outfitIdx,
    jetpackStyle,
    floorRunFrame: frame,
  };
  const vehicle: Vehicle = {
    active: false, kind: 'bounce_buggy', hp: 0,
    breakTimer: 0, vy: 0, flipped: false,
    serpentY: 0, mechFrame: 0, drillTimer: 0,
  };
  drawHero(ctx, hero, vehicle, 1, 0, frame);
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

  ctx.fillStyle = 'rgba(0,0,0,0.80)';
  ctx.fillRect(0, 0, W, H);

  // Panel — split layout: left stats, right missions
  ctx.fillStyle = 'rgba(10,14,28,0.97)';
  roundRect(ctx, W/2 - 330, 24, 660, H - 48);
  ctx.fill();
  ctx.strokeStyle = '#2a3a5a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Header ────────────────────────────────────────────────────────────
  const hdrColor = isNewBest ? '#f5c800' : '#ff4444';
  ctx.shadowColor = hdrColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = hdrColor;
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(isNewBest ? '★ NEW BEST! ★' : 'WIPEOUT!', W/2, 36);
  ctx.shadowBlur = 0;

  // ── Distance highlight ───────────────────────────────────────────────
  const distGrd = ctx.createLinearGradient(W/2 - 200, 94, W/2 + 200, 94);
  distGrd.addColorStop(0, 'rgba(85,153,255,0)');
  distGrd.addColorStop(0.5, 'rgba(85,153,255,0.18)');
  distGrd.addColorStop(1, 'rgba(85,153,255,0)');
  ctx.fillStyle = distGrd;
  ctx.fillRect(W/2 - 200, 94, 400, 46);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${distanceMeters}m`, W/2, 117);

  ctx.fillStyle = '#6677aa';
  ctx.font = '13px monospace';
  ctx.fillText('DISTANCE', W/2, 140);

  // ── Stats rows ────────────────────────────────────────────────────────
  const col1X = W/2 - 310;  // left panel
  let sy = 160;

  drawStatRow(ctx, 'Coins earned',  `+${coinsEarned}`,           W/2, sy);       sy += 32;
  if (tokensEarned > 0) {
    drawStatRow(ctx, 'Spin tokens', `+${tokensEarned}★`,         W/2, sy);       sy += 32;
  }
  drawStatRow(ctx, 'All-time best', `${Math.floor(bestDistance)}m`, W/2, sy);    sy += 32;

  void col1X;
  void seed;

  // ── Divider ───────────────────────────────────────────────────────────
  ctx.strokeStyle = '#2a3a5a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2 - 310, sy + 8); ctx.lineTo(W/2 + 310, sy + 8); ctx.stroke();
  sy += 20;

  // ── Missions ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#5566aa';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MISSIONS', W/2, sy);
  sy += 20;

  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    if (!m) continue;
    const progress = Math.min(1, m.progress / m.target);
    const desc = getMissionDescription(m);

    ctx.fillStyle = m.completed ? 'rgba(0,255,100,0.14)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, W/2 - 300, sy, 600, 38);
    ctx.fill();

    ctx.fillStyle = m.completed ? '#44ff99' : '#aabbdd';
    ctx.font = m.completed ? 'bold 12px monospace' : '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const shortDesc = desc.length > 52 ? desc.slice(0, 52) + '…' : desc;
    ctx.fillText(shortDesc, W/2 - 290, sy + 14);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(W/2 - 290, sy + 26, 580, 6);
    ctx.fillStyle = m.completed ? '#44ff99' : '#5599ff';
    ctx.fillRect(W/2 - 290, sy + 26, 580 * progress, 6);

    ctx.fillStyle = m.completed ? '#44ff99' : '#6677aa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(m.progress)}/${m.target}`, W/2 + 294, sy + 14);

    sy += 44;
  }

  // ── Buttons ───────────────────────────────────────────────────────────
  const btnY = H - 68;
  const buttons: Button[] = [
    {
      x: W/2 - 320, y: btnY, w: 140, h: 46,
      label: 'RETRY', color: '#cc4400', textColor: '#ffffff', action: 'retry',
    },
    {
      x: W/2 - 168, y: btnY, w: 160, h: 46,
      label: reviveCost === 0 ? 'FREE REVIVE' : `REVIVE ${reviveCost}`,
      color: reviveUsed ? '#3a2510' : '#884400', action: 'revive',
      enabled: !reviveUsed && (reviveCost === 0 || save.coins >= reviveCost),
    },
    {
      x: W/2 + 2, y: btnY, w: 160, h: 46,
      label: spinTokens > 0 ? `SPIN ★${spinTokens}` : 'SPIN (0)',
      color: spinTokens > 0 ? '#660099' : '#222244', action: 'spin',
      enabled: spinTokens > 0,
    },
    {
      x: W/2 + 172, y: btnY, w: 148, h: 46,
      label: 'MENU', color: '#1a2235', action: 'menu',
    },
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

// ── Outfit / jetpack swatch helpers ────────────────────────────────────────

function drawOutfitSwatch(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  outfitIdx: number,
  selected: boolean,
  unlocked: boolean
): void {
  const outfit = OUTFIT_COLORS[outfitIdx] ?? OUTFIT_COLORS[0]!;
  ctx.fillStyle = unlocked ? 'rgba(20,20,45,0.9)' : '#111122';
  roundRect(ctx, ox, oy, 44, 44);
  ctx.fill();

  if (unlocked) {
    ctx.save();
    ctx.translate(ox + 22, oy + 36);
    ctx.scale(0.68, 0.68);
    // Body
    ctx.fillStyle = outfit.body;
    ctx.beginPath();
    ctx.ellipse(0, -4, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = outfit.skin;
    ctx.beginPath();
    ctx.ellipse(0, -18, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = outfit.hair;
    ctx.beginPath();
    ctx.ellipse(0, -24, 9, 5, 0, 0, Math.PI);
    ctx.fill();
    // Legs
    ctx.fillStyle = outfit.pants;
    ctx.fillRect(-6, 6, 5, 10);
    ctx.fillRect(1, 6, 5, 10);
    ctx.restore();
  } else {
    ctx.fillStyle = '#666677';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', ox + 22, oy + 22); // 🔒 without emoji literal
  }

  if (selected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    roundRect(ctx, ox, oy, 44, 44);
    ctx.stroke();
  }
}

export const OUTFIT_COSTS  = [0, 300, 500, 700, 1000, 1500, 2000, 2500, 3000, 4000];
export const JETPACK_COSTS = [0, 400, 700, 1100, 1600];

// ── Shop Scene ─────────────────────────────────────────────────────────────

export function drawShopScene(
  ctx: CanvasRenderingContext2D,
  save: SaveData,
  selectedTab: number
): Button[] {
  const W = CFG.WORLD_W;
  const buttons: Button[] = [];

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SHOP', W / 2, 10);

  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${save.coins} coins`, W - 20, 14);

  const tabLabels = ['GADGETS', 'OUTFITS', 'EQUIP'];
  const tabW = 148, tabH = 34, tabY = 46;
  const tabsStartX = W / 2 - (tabLabels.length * tabW) / 2;
  for (let t = 0; t < tabLabels.length; t++) {
    buttons.push({
      x: tabsStartX + t * tabW, y: tabY, w: tabW - 2, h: tabH,
      label: tabLabels[t]!,
      color: t === selectedTab ? '#2244cc' : '#1a1a30',
      action: `tab_${t}`,
    });
  }

  const contentY = tabY + tabH + 8;
  if (selectedTab === 0)      drawGadgetsTab(ctx, save, buttons, contentY);
  else if (selectedTab === 1) drawOutfitsTab(ctx, save, buttons, contentY);
  else                        drawEquipTab(ctx, save, buttons, contentY);

  buttons.push({ x: 20, y: 10, w: 90, h: 32, label: '< BACK', color: '#222233', action: 'back' });
  drawButtons(ctx, buttons);
  return buttons;
}

function drawGadgetsTab(
  ctx: CanvasRenderingContext2D,
  save: SaveData,
  buttons: Button[],
  startY: number
): void {
  const W = CFG.WORLD_W;
  const COLS = 3, cardW = 260, cardH = 120, colGap = 15, rowGap = 10;
  const totalW = COLS * cardW + (COLS - 1) * colGap;
  const startX = (W - totalW) / 2;

  for (let i = 0; i < GADGET_DEFS.length; i++) {
    const def = GADGET_DEFS[i]!;
    const col = i % COLS, row = Math.floor(i / COLS);
    const bx = startX + col * (cardW + colGap);
    const by = startY + row * (cardH + rowGap);
    const level = save.gadgetLevels[def.id] ?? 0;
    const owned = level > 0;
    const maxed = level >= def.maxLevel;
    const upgCost = def.baseCost * (level + 1);
    const canBuy = !maxed && save.coins >= upgCost;

    ctx.fillStyle = owned ? 'rgba(20,40,80,0.85)' : 'rgba(14,14,26,0.85)';
    ctx.beginPath();
    ctx.roundRect(bx, by, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = owned ? '#4477ff' : '#2a2a4a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name, bx + 10, by + 10);

    ctx.fillStyle = '#8888aa';
    ctx.font = '11px monospace';
    const shortDesc = def.description.length > 34 ? def.description.slice(0, 34) + '…' : def.description;
    ctx.fillText(shortDesc, bx + 10, by + 30);

    if (owned) {
      ctx.fillStyle = '#66aaff';
      ctx.font = '11px monospace';
      ctx.fillText(`Lv ${level}: ${def.levelLabel(level - 1)}`, bx + 10, by + 48);
    }

    for (let l = 0; l < def.maxLevel; l++) {
      ctx.fillStyle = l < level ? '#4477ff' : '#223344';
      ctx.beginPath();
      ctx.arc(bx + 12 + l * 14, by + 78, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const label = maxed ? 'MAXED' : owned ? `UPGRADE ${upgCost}` : `BUY ${upgCost}`;
    buttons.push({
      x: bx + 10, y: by + cardH - 26, w: cardW - 20, h: 22,
      label, color: canBuy ? '#1a3a8a' : '#1a1a2a',
      action: `gadget_${def.id}`,
      enabled: canBuy,
    });
  }
}

function drawOutfitsTab(
  ctx: CanvasRenderingContext2D,
  save: SaveData,
  buttons: Button[],
  startY: number
): void {
  const W = CFG.WORLD_W;

  ctx.fillStyle = '#8888aa';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('OUTFITS', W / 4, startY);

  const slotW = 100, slotH = 108;
  const outfitGridX = 44;
  for (let i = 0; i < 10; i++) {
    const col = i % 5, row = Math.floor(i / 5);
    const ox = outfitGridX + col * slotW;
    const oy = startY + 22 + row * slotH;
    const unlocked = save.unlockedOutfits.includes(i);
    const cost = OUTFIT_COSTS[i] ?? 0;
    const selected = save.outfit === i;

    ctx.fillStyle = selected ? 'rgba(30,50,100,0.9)' : (unlocked ? 'rgba(20,20,45,0.8)' : 'rgba(10,10,18,0.8)');
    ctx.beginPath();
    ctx.roundRect(ox + 2, oy, 88, slotH - 6, 6);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (unlocked) {
      drawOutfitSwatch(ctx, ox + 24, oy + 4, i, false, true);
      buttons.push({ x: ox + 2, y: oy, w: 88, h: 50, label: '', color: 'transparent', action: `outfit_${i}` });
    } else {
      ctx.fillStyle = '#555566';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', ox + 46, oy + 26);
    }

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (i === 0) {
      ctx.fillStyle = '#00ff88';
      ctx.fillText('FREE', ox + 46, oy + 56);
    } else if (unlocked) {
      ctx.fillStyle = selected ? '#66aaff' : '#888899';
      ctx.fillText(selected ? 'EQUIPPED' : 'OWNED', ox + 46, oy + 56);
    } else {
      ctx.fillStyle = save.coins >= cost ? '#ffdd00' : '#885500';
      ctx.fillText(`${cost}c`, ox + 46, oy + 56);
      const canBuy = save.coins >= cost;
      buttons.push({
        x: ox + 6, y: oy + 70, w: 80, h: 22,
        label: 'BUY', color: canBuy ? '#1a3a8a' : '#1a1a2a',
        action: `unlock_outfit_${i}`,
        enabled: canBuy,
      });
    }
  }

  ctx.fillStyle = '#8888aa';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('JETPACKS', (W * 3) / 4, startY);

  const jpSlotW = 112, jpSlotH = 108;
  const jpGridX = W / 2 + 20;
  for (let i = 0; i < 5; i++) {
    const ox = jpGridX + i * jpSlotW;
    const oy = startY + 22;
    const unlocked = save.unlockedJetpackStyles.includes(i);
    const cost = JETPACK_COSTS[i] ?? 0;
    const selected = save.jetpackStyle === i;
    const style = JETPACK_STYLES[i] ?? JETPACK_STYLES[0]!;

    ctx.fillStyle = selected ? 'rgba(30,50,100,0.9)' : (unlocked ? 'rgba(20,20,45,0.8)' : 'rgba(10,10,18,0.8)');
    ctx.beginPath();
    ctx.roundRect(ox, oy, jpSlotW - 8, jpSlotH - 6, 6);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (unlocked) {
      drawMiniJetpack(ctx, ox + (jpSlotW - 8) / 2, oy + 28, style);
      buttons.push({ x: ox, y: oy, w: jpSlotW - 8, h: 50, label: '', color: 'transparent', action: `jetpack_${i}` });
    } else {
      ctx.fillStyle = '#555566';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', ox + (jpSlotW - 8) / 2, oy + 26);
    }

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (i === 0) {
      ctx.fillStyle = '#00ff88';
      ctx.fillText('FREE', ox + (jpSlotW - 8) / 2, oy + 56);
    } else if (unlocked) {
      ctx.fillStyle = selected ? '#66aaff' : '#888899';
      ctx.fillText(selected ? 'EQUIPPED' : 'OWNED', ox + (jpSlotW - 8) / 2, oy + 56);
    } else {
      ctx.fillStyle = save.coins >= cost ? '#ffdd00' : '#885500';
      ctx.fillText(`${cost}c`, ox + (jpSlotW - 8) / 2, oy + 56);
      const canBuy = save.coins >= cost;
      buttons.push({
        x: ox + 4, y: oy + 70, w: jpSlotW - 16, h: 22,
        label: 'BUY', color: canBuy ? '#1a3a8a' : '#1a1a2a',
        action: `unlock_jetpack_${i}`,
        enabled: canBuy,
      });
    }
  }
}

function drawMiniJetpack(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  style: { body: string; nozzle: string; flame: string }
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = style.body;
  ctx.beginPath();
  ctx.roundRect(-10, -14, 10, 24, 2);
  ctx.fill();
  ctx.fillStyle = style.nozzle;
  ctx.fillRect(-12, -10, 4, 6);
  ctx.fillRect(-12, 4, 4, 6);
  ctx.fillStyle = style.flame;
  ctx.beginPath();
  ctx.arc(-16, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-16, 7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEquipTab(
  ctx: CanvasRenderingContext2D,
  save: SaveData,
  buttons: Button[],
  startY: number
): void {
  const W = CFG.WORLD_W;

  const panelW = 480, panelH = 80;
  const slot0X = W / 2 - panelW - 20;
  const slot1X = W / 2 + 20;

  for (let s = 0; s < 2; s++) {
    const sx = s === 0 ? slot0X : slot1X;
    const slot = save.gadgetSlots[s];
    const slotDef = slot?.id ? GADGET_DEFS.find(d => d.id === slot.id) : null;

    ctx.fillStyle = 'rgba(10,20,50,0.85)';
    ctx.beginPath();
    ctx.roundRect(sx, startY, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = slotDef ? '#4477ff' : '#2a2a4a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#8888aa';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`SLOT ${s + 1}`, sx + 12, startY + 8);

    if (slotDef) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(slotDef.name, sx + 12, startY + 28);
      ctx.fillStyle = '#66aaff';
      ctx.font = '12px monospace';
      ctx.fillText(`Lv ${slot?.level ?? 0}: ${slotDef.levelLabel((slot?.level ?? 1) - 1)}`, sx + 12, startY + 48);
      buttons.push({
        x: sx + panelW - 90, y: startY + 24, w: 78, h: 28,
        label: 'UNEQUIP', color: '#442222',
        action: `unequip_s${s}`,
      });
    } else {
      ctx.fillStyle = '#444455';
      ctx.font = 'bold 15px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText('--- EMPTY ---', sx + 12, startY + panelH / 2);
    }
  }

  const listY = startY + panelH + 18;
  ctx.fillStyle = '#8888aa';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('OWNED GADGETS', W / 2, listY);

  const ownedDefs = GADGET_DEFS.filter(d => (save.gadgetLevels[d.id] ?? 0) > 0);
  if (ownedDefs.length === 0) {
    ctx.fillStyle = '#555566';
    ctx.font = '14px monospace';
    ctx.fillText('No gadgets bought yet. Go to GADGETS tab.', W / 2, listY + 28);
    return;
  }

  const rowH = 48, rowW = W - 200;
  const rowX = 100;
  for (let i = 0; i < ownedDefs.length; i++) {
    const def = ownedDefs[i]!;
    const level = save.gadgetLevels[def.id] ?? 0;
    const ry = listY + 22 + i * rowH;
    const inS0 = save.gadgetSlots[0]?.id === def.id;
    const inS1 = save.gadgetSlots[1]?.id === def.id;

    ctx.fillStyle = (inS0 || inS1) ? 'rgba(20,40,80,0.7)' : 'rgba(14,14,26,0.6)';
    ctx.beginPath();
    ctx.roundRect(rowX, ry, rowW, rowH - 4, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${def.name}  Lv${level}`, rowX + 12, ry + (rowH - 4) / 2);

    const btnW = 100, btnH = 26, btnY = ry + 10;
    buttons.push({
      x: rowX + rowW - 220, y: btnY, w: btnW, h: btnH,
      label: inS0 ? 'IN SLOT 1' : 'SLOT 1',
      color: inS0 ? '#1a4a1a' : '#223344',
      action: `equip_s0_${def.id}`,
      enabled: !inS0,
    });
    buttons.push({
      x: rowX + rowW - 110, y: btnY, w: btnW, h: btnH,
      label: inS1 ? 'IN SLOT 2' : 'SLOT 2',
      color: inS1 ? '#1a4a1a' : '#223344',
      action: `equip_s1_${def.id}`,
      enabled: !inS1,
    });
  }
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
  coins_small:     '+100 COINS',
  coins_big:       '+500 COINS',
  revive:          'REVIVE 1UP',
  gadget_voucher:  'GADGET CRED',
  vehicle_voucher: 'VEHICLE CRED',
  nothing:         'BETTER LUCK',
};

const SPIN_REEL  = ['+100', '+500', '1UP', 'GADG', 'VHCL', '????'];
const SPIN_COLORS = ['#ffee00', '#ffcc00', '#00ff88', '#8899ff', '#ff8800', '#886688'];

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

  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);

  // Machine cabinet
  ctx.fillStyle = 'rgba(12,16,32,0.98)';
  roundRect(ctx, W/2 - 290, 40, 580, H - 80);
  ctx.fill();
  ctx.strokeStyle = '#3a3a6a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header — "SPIN MACHINE" with orange glow (JJR slot style)
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ff9922';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SPIN MACHINE', W/2, 56);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#5566aa';
  ctx.font = '14px monospace';
  ctx.fillText('Pull the lever — what\'s your prize?', W/2, 102);

  // Reel window frame
  const reelW = 148, reelH = 110, reelGap = 16;
  const totalW = 3 * reelW + 2 * reelGap;
  const startRX = W/2 - totalW/2;
  const ry = 136;

  // Outer chrome frame
  ctx.fillStyle = '#2a2a4a';
  roundRect(ctx, startRX - 14, ry - 10, totalW + 28, reelH + 20, 12);
  ctx.fill();
  ctx.strokeStyle = '#5566aa';
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let r = 0; r < 3; r++) {
    const rx = startRX + r * (reelW + reelGap);

    // Reel background
    ctx.fillStyle = '#0a0c1a';
    roundRect(ctx, rx, ry, reelW, reelH, 8);
    ctx.fill();

    // Reel border glow
    ctx.strokeStyle = spinning ? '#ff8800' : '#5599ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Symbol
    let idx: number;
    if (spinning) {
      const offset = (spinProgress * 12 + r * 2.5) % 1;
      idx = Math.floor(offset * SPIN_REEL.length) % SPIN_REEL.length;
    } else {
      idx = SPIN_PRIZES.indexOf(prize);
    }
    // Symbol glow when done
    if (!spinning) {
      const symGrd = ctx.createRadialGradient(rx + reelW/2, ry + reelH/2, 0, rx + reelW/2, ry + reelH/2, 55);
      const sc = SPIN_COLORS[idx] ?? '#ffffff';
      symGrd.addColorStop(0, sc + '33');
      symGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = symGrd;
      ctx.fillRect(rx - 10, ry - 10, reelW + 20, reelH + 20);
    }
    ctx.fillStyle = SPIN_COLORS[idx] ?? '#ffffff';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SPIN_REEL[idx] ?? '?', rx + reelW / 2, ry + reelH / 2);
  }

  // Center line indicator
  ctx.strokeStyle = 'rgba(255,200,0,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(startRX - 18, ry + reelH/2);
  ctx.lineTo(startRX + totalW + 18, ry + reelH/2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Result banner
  if (!spinning) {
    const isWin = prize !== 'nothing';
    ctx.fillStyle = isWin ? 'rgba(0,180,80,0.2)' : 'rgba(180,0,0,0.2)';
    roundRect(ctx, W/2 - 240, ry + reelH + 24, 480, 56, 8);
    ctx.fill();

    ctx.shadowColor = isWin ? '#44ff99' : '#ff4444';
    ctx.shadowBlur = 12;
    ctx.fillStyle = isWin ? '#44ff99' : '#ff5555';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SPIN_LABELS[prize], W/2, ry + reelH + 52);
    ctx.shadowBlur = 0;
  } else {
    // Spinning indicator
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dots = '.'.repeat(Math.floor(spinProgress * 6) % 4);
    ctx.fillText(`Spinning${dots}`, W/2, ry + reelH + 52);
  }

  const buttons: Button[] = [];
  if (!spinning) {
    buttons.push({
      x: W/2 - 120, y: H - 90, w: 240, h: 54,
      label: 'CONTINUE', color: '#cc5500', textColor: '#ffffff', action: 'continue',
    });
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
