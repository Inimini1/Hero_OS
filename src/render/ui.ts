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

  // Hero walking animation (uses real drawHero with player's outfit/jetpack)
  drawMenuHero(ctx, 180 + Math.sin(heroAnim * 0.05) * 3, H - 90, heroAnim, save.outfit, save.jetpackStyle);

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

function drawMenuHero(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  frame: number,
  outfitIdx: number,
  jetpackStyle: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.5, 1.5);

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
    { x: W/2 - 150, y: btnY, w: 150, h: 50, label: reviveCost === 0 ? 'REVIVE FREE' : `REVIVE ${reviveCost}`, color: reviveUsed ? '#553322' : '#884400', action: 'revive', enabled: !reviveUsed && (reviveCost === 0 || save.coins >= reviveCost) },
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
      const idx = Math.floor(offset * SPIN_REEL.length) % SPIN_REEL.length;
      ctx.fillStyle = SPIN_COLORS[idx] ?? '#ffffff';
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SPIN_REEL[idx] ?? '?', rx + reelW / 2, ry + reelH / 2);
    } else {
      const prizeIdx = SPIN_PRIZES.indexOf(prize);
      ctx.fillStyle = SPIN_COLORS[prizeIdx] ?? '#ffffff';
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SPIN_REEL[prizeIdx] ?? '?', rx + reelW / 2, ry + reelH / 2);
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
