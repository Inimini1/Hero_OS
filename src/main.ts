import { CFG } from './config';
import { GameLoop } from './loop';
import { InputManager } from './input';
import { AudioManager } from './audio';
import { loadSave, writeSave, recordRun, spendCoins } from './save';
import type { SaveData } from './save';
import { createWorld, tickWorld } from './sim/world';
import type { WorldState } from './sim/types';
import { createGadgetSlot, hasExtraRevive, GADGET_DEFS } from './sim/gadgets';
import { generateMissions } from './sim/missions';
import { mulberry32, dailySeed } from './prng';
import { setupCanvas } from './render/canvas';
import { drawBackground, ZONE_THEMES } from './render/background';
import { drawHero } from './render/hero';
import { drawZappers, drawLasers, drawMissiles, drawPendulums, drawVents } from './render/hazards';
import { drawParticles, drawCoins, drawSpinTokens, drawVehicleCrates } from './render/particles';
import { drawHUD, drawPauseOverlay } from './render/hud';
import { drawFloorAndCeiling, drawVignette, drawZoneFade, drawHitStopFlash, drawZoneBanner, applyCamera, tickCamera, createCamera } from './render/effects';
import type { CameraState } from './render/effects';
import { drawMenuScene, drawGameOverScene, drawShopScene, drawMissionsScene, drawSettingsScene, drawTutorial, drawSpinMachine, hitButton, pickSpinPrize, OUTFIT_COSTS, JETPACK_COSTS } from './render/ui';
import type { SpinPrize, Button } from './render/ui';
import { DebugOverlay } from './debug';

type Scene =
  | 'boot'
  | 'menu'
  | 'run'
  | 'paused'
  | 'gameover'
  | 'shop'
  | 'missions'
  | 'settings'
  | 'spin';

// ── App State ──────────────────────────────────────────────────────────────

let scene: Scene = 'boot';
let simState: WorldState | null = null;
let prevHeroY: number = CFG.FLOOR_Y;
let camera: CameraState = createCamera();
const debug = new DebugOverlay();
let save = loadSave();
let menuHeroAnim = 0;
let uiButtons: Button[] = [];
let reviveUsed = false;
let isNewBest = false;
let gameoverShown = false;
let spinProgress = 0;
let spinPrize: SpinPrize = 'nothing';
let spinActive = false;
let spinDone = false;
let tutorialAlpha = 0;
let tutorialTimer = 0;
let isDaily = false;
let zoneBannerAlpha = 0;
let zoneBannerName = '';
let vehicleBannerAlpha = 0;
let vehicleBannerName = '';
let shopTab = 0;

interface CoinPopup { val: number; life: number; }
let coinPopups: CoinPopup[] = [];
let _lastFrameMs = 0;

// ── Setup ──────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const { ctx, cssW, cssH, offsetX, offsetY, scaleX } = setupCanvas(canvas);
const input = new InputManager(canvas);
const audio = new AudioManager();

input.updateScale(CFG.WORLD_W, CFG.WORLD_H, cssW, cssH, offsetX, offsetY);

// Resize handler
window.addEventListener('resize', () => {
  const setup = setupCanvas(canvas);
  input.updateScale(CFG.WORLD_W, CFG.WORLD_H, setup.cssW, setup.cssH, setup.offsetX, setup.offsetY);
});

// Page visibility
document.addEventListener('visibilitychange', () => {
  audio.handleVisibility(document.hidden);
});

// Mobile: request fullscreen + lock orientation on first interaction
let _mobileSetup = false;
function _setupMobile(): void {
  if (_mobileSetup) return;
  _mobileSetup = true;
  const el = document.documentElement;
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
    (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
  }
  const screen = window.screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } };
  if (screen.orientation?.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
document.addEventListener('touchstart', _setupMobile, { once: true });
document.addEventListener('click', _setupMobile, { once: true });

// Debug toggle
window.addEventListener('keydown', e => {
  if (e.code === 'Backquote') debug.toggle();
  if (e.code === 'Escape' && scene === 'run') togglePause();
  if (e.code === 'Escape' && scene === 'paused') togglePause();
});

// ── Scene transitions ──────────────────────────────────────────────────────

function startRun(daily = false): void {
  isDaily = daily;
  const seed = daily ? dailySeed() : Math.floor(Math.random() * 0xffffffff);
  const gadgets = save.gadgetSlots.map(s => ({ id: s.id, level: s.id ? (save.gadgetLevels[s.id] ?? 0) : 0 })) as [ReturnType<typeof createGadgetSlot>, ReturnType<typeof createGadgetSlot>];
  simState = createWorld(seed, gadgets, save.reducedMotion);
  simState.hero.outfit = save.outfit;
  simState.hero.jetpackStyle = save.jetpackStyle;
  simState.missions = save.pendingMissions.length >= 3
    ? (save.pendingMissions as typeof simState.missions)
    : generateMissions(save.rank, mulberry32(seed ^ 0xaaaa));
  if (save.pendingMissions.length < 3) {
    save.pendingMissions = simState.missions as unknown as SaveData['pendingMissions'];
    writeSave(save);
  }
  prevHeroY = CFG.FLOOR_Y;
  camera = createCamera();
  reviveUsed = false;
  isNewBest = false;
  gameoverShown = false;
  audio.unlock();
  audio.resetCoinPitch();
  if (!save.tutorialSeen) {
    tutorialAlpha = 1;
    tutorialTimer = 0;
    save.tutorialSeen = true;
    writeSave(save);
  } else {
    tutorialAlpha = 0;
  }
  scene = 'run';
}

function goToGameOver(): void {
  if (gameoverShown) return;
  gameoverShown = true;
  const state = simState!;
  const meters = Math.floor(state.distance / CFG.UNITS_PER_METER);
  const completedMissions = state.missions.filter(m => m.completed);
  const missionRewardCoins = completedMissions.reduce((s, m) => s + m.rewardCoins, 0);
  isNewBest = recordRun(save, meters, state.coinsThisRun, state.tokensThisRun, completedMissions.length, missionRewardCoins);
  if (isNewBest) audio.play('new_best');
  // Replace completed missions with fresh ones
  const newMissions = generateMissions(save.rank, mulberry32(Date.now() ^ 0xbeef));
  let newIdx = 0;
  save.pendingMissions = state.missions.map(m => {
    if (m.completed) return newMissions[newIdx++] ?? m;
    return m;
  }) as unknown as SaveData['pendingMissions'];
  writeSave(save);
  scene = 'gameover';
}

function togglePause(): void {
  if (!simState) return;
  simState.paused = !simState.paused;
  scene = simState.paused ? 'paused' : 'run';
}

function tryRevive(): void {
  if (!simState || reviveUsed) return;
  const isFree = hasExtraRevive(save.gadgetSlots);
  if (!isFree && !spendCoins(save, CFG.REVIVE_BASE_COST)) return;
  if (isFree) writeSave(save);
  reviveUsed = true;
  simState.dead = false;
  simState.hero.state = 'flying';
  simState.hero.vy = 0;
  simState.hero.invulnTicks = CFG.SHIELD_INVULN_TICKS * 2;
  simState.hero.y = CFG.WORLD_H / 2;
  gameoverShown = false;
  audio.play('revive');
  scene = 'run';
}

function handleUIAction(action: string): void {
  audio.play('ui_click');
  switch (action) {
    case 'play': startRun(false); break;
    case 'daily': startRun(true); break;
    case 'shop': scene = 'shop'; shopTab = 0; break;
    case 'missions': scene = 'missions'; break;
    case 'settings': scene = 'settings'; break;
    case 'back': scene = 'menu'; break;
    case 'retry': startRun(isDaily); break;
    case 'menu': scene = 'menu'; break;
    case 'revive': if (scene === 'gameover') tryRevive(); break;
    case 'spin': startSpin(); break;
    case 'continue': scene = 'menu'; break;
    case 'resume': if (scene === 'paused') togglePause(); break;

    // Settings
    case 'music_vol_up': save.musicVolume = Math.min(1, save.musicVolume + 0.1); audio.setMusicVolume(save.musicVolume); writeSave(save); break;
    case 'music_vol_down': save.musicVolume = Math.max(0, save.musicVolume - 0.1); audio.setMusicVolume(save.musicVolume); writeSave(save); break;
    case 'sfx_vol_up': save.sfxVolume = Math.min(1, save.sfxVolume + 0.1); audio.setSfxVolume(save.sfxVolume); writeSave(save); break;
    case 'sfx_vol_down': save.sfxVolume = Math.max(0, save.sfxVolume - 0.1); audio.setSfxVolume(save.sfxVolume); writeSave(save); break;
    case 'toggle_shake': save.screenShake = !save.screenShake; writeSave(save); break;
    case 'toggle_motion': save.reducedMotion = !save.reducedMotion; writeSave(save); break;
    case 'toggle_cb': save.colorblindMode = !save.colorblindMode; writeSave(save); break;
    case 'toggle_lh': save.leftHanded = !save.leftHanded; writeSave(save); break;
    case 'toggle_mute': save.muted = !save.muted; audio.setMuted(save.muted); writeSave(save); break;

    default:
      if (action.startsWith('outfit_')) {
        const idx = parseInt(action.slice(7));
        if (save.unlockedOutfits.includes(idx)) { save.outfit = idx; writeSave(save); }
      }
      if (action.startsWith('jetpack_')) {
        const idx = parseInt(action.slice(8));
        if (save.unlockedJetpackStyles.includes(idx)) { save.jetpackStyle = idx; writeSave(save); }
      }
      if (action.startsWith('gadget_')) {
        // handled below via dynamic import
      }
  }
}

// Can't use async in event handler directly, use sync version
function handleUIActionSync(action: string): void {
  audio.play('ui_click');
  switch (action) {
    case 'play': startRun(false); break;
    case 'daily': startRun(true); break;
    case 'shop': scene = 'shop'; shopTab = 0; break;
    case 'missions': scene = 'missions'; break;
    case 'settings': scene = 'settings'; break;
    case 'back': scene = 'menu'; break;
    case 'retry': startRun(isDaily); break;
    case 'menu': scene = 'menu'; break;
    case 'revive': if (scene === 'gameover') tryRevive(); break;
    case 'spin': startSpin(); break;
    case 'continue': scene = 'menu'; break;
    case 'resume': if (scene === 'paused') togglePause(); break;
    case 'unequip_s0': save.gadgetSlots[0] = { id: null, level: 0 }; writeSave(save); break;
    case 'unequip_s1': save.gadgetSlots[1] = { id: null, level: 0 }; writeSave(save); break;
    case 'music_vol_up': save.musicVolume = Math.min(1, save.musicVolume + 0.1); audio.setMusicVolume(save.musicVolume); writeSave(save); break;
    case 'music_vol_down': save.musicVolume = Math.max(0, save.musicVolume - 0.1); audio.setMusicVolume(save.musicVolume); writeSave(save); break;
    case 'sfx_vol_up': save.sfxVolume = Math.min(1, save.sfxVolume + 0.1); audio.setSfxVolume(save.sfxVolume); writeSave(save); break;
    case 'sfx_vol_down': save.sfxVolume = Math.max(0, save.sfxVolume - 0.1); audio.setSfxVolume(save.sfxVolume); writeSave(save); break;
    case 'toggle_shake': save.screenShake = !save.screenShake; writeSave(save); break;
    case 'toggle_motion': save.reducedMotion = !save.reducedMotion; writeSave(save); break;
    case 'toggle_cb': save.colorblindMode = !save.colorblindMode; writeSave(save); break;
    case 'toggle_lh': save.leftHanded = !save.leftHanded; writeSave(save); break;
    case 'toggle_mute': save.muted = !save.muted; audio.setMuted(save.muted); writeSave(save); break;
    default:
      if (action.startsWith('tab_')) {
        shopTab = parseInt(action.slice(4));
      } else if (action.startsWith('outfit_')) {
        const idx = parseInt(action.slice(7));
        if (save.unlockedOutfits.includes(idx)) { save.outfit = idx; writeSave(save); }
      } else if (action.startsWith('jetpack_')) {
        const idx = parseInt(action.slice(8));
        if (save.unlockedJetpackStyles.includes(idx)) { save.jetpackStyle = idx; writeSave(save); }
      } else if (action.startsWith('unlock_outfit_')) {
        const idx = parseInt(action.slice(14));
        const cost = OUTFIT_COSTS[idx] ?? 0;
        if (cost > 0 && spendCoins(save, cost)) {
          if (!save.unlockedOutfits.includes(idx)) save.unlockedOutfits.push(idx);
          save.outfit = idx;
          writeSave(save);
          audio.play('ui_confirm');
        }
      } else if (action.startsWith('unlock_jetpack_')) {
        const idx = parseInt(action.slice(15));
        const cost = JETPACK_COSTS[idx] ?? 0;
        if (cost > 0 && spendCoins(save, cost)) {
          if (!save.unlockedJetpackStyles.includes(idx)) save.unlockedJetpackStyles.push(idx);
          save.jetpackStyle = idx;
          writeSave(save);
          audio.play('ui_confirm');
        }
      } else if (action.startsWith('equip_s0_')) {
        const gid = action.slice(9);
        const lv = (save.gadgetLevels as Record<string, number>)[gid] ?? 0;
        save.gadgetSlots[0] = { id: gid as Parameters<typeof hasExtraRevive>[0][0]['id'], level: lv };
        writeSave(save);
      } else if (action.startsWith('equip_s1_')) {
        const gid = action.slice(9);
        const lv = (save.gadgetLevels as Record<string, number>)[gid] ?? 0;
        save.gadgetSlots[1] = { id: gid as Parameters<typeof hasExtraRevive>[0][0]['id'], level: lv };
        writeSave(save);
      } else if (action.startsWith('gadget_')) {
        const gadgetId = action.slice(7);
        const level = (save.gadgetLevels as Record<string, number>)[gadgetId] ?? 0;
        const def = GADGET_DEFS.find(d => d.id === gadgetId);
        if (def && level < def.maxLevel) {
          const cost = def.baseCost * (level + 1);
          if (spendCoins(save, cost)) {
            (save.gadgetLevels as Record<string, number>)[gadgetId] = level + 1;
            writeSave(save);
            audio.play('ui_confirm');
          }
        }
      }
  }
}

void handleUIAction; // suppress unused warning

// ── Click / tap handler ────────────────────────────────────────────────────

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const lx = (e.clientX - rect.left) * (CFG.WORLD_W / rect.width);
  const ly = (e.clientY - rect.top) * (CFG.WORLD_H / rect.height);
  const action = hitButton(uiButtons, lx, ly);
  if (action) {
    handleUIActionSync(action);
  }
});

// ── Spin Machine ───────────────────────────────────────────────────────────

function startSpin(): void {
  if (!simState || simState.tokensThisRun <= 0) return;
  simState.tokensThisRun--;
  spinProgress = 0;
  spinActive = true;
  spinDone = false;
  const hasLucky = save.gadgetSlots.some(s => s.id === 'lucky_charm');
  spinPrize = pickSpinPrize(hasLucky);
  scene = 'spin';
}

function applySpinPrize(): void {
  switch (spinPrize) {
    case 'coins_small': save.coins += 100; writeSave(save); break;
    case 'coins_big': save.coins += 500; writeSave(save); break;
    case 'revive': reviveUsed = false; break;
    case 'gadget_voucher': save.coins += 200; writeSave(save); break; // Convert to coins for now
    case 'vehicle_voucher': save.coins += 150; writeSave(save); break;
    case 'nothing': break;
  }
  spinDone = true;
}

// ── Sim tick ───────────────────────────────────────────────────────────────

function tick(holding: boolean): void {
  if (scene === 'run' && simState) {
    prevHeroY = simState.hero.y;
    tickWorld(simState, holding);

    // Handle sim events
    const events = simState._events;
    for (const evt of events) {
      switch (evt.type) {
        case 'coin_collected':
          audio.play('coin');
          coinPopups.push({ val: evt.value ?? 1, life: 1.0 });
          break;
        case 'spin_token_collected': audio.play('token_collect'); break;
        case 'hero_died': audio.play('explosion'); break;
        case 'vehicle_start': {
          audio.play('vehicle_pickup');
          const vnames: Record<string, string> = {
            bounce_buggy: 'BOUNCE BUGGY', gravity_suit: 'GRAVITY SUIT',
            sky_serpent: 'SKY SERPENT', stomp_mech: 'STOMP MECH',
            wave_sub: 'WAVE SUB', drill_rocket: 'DRILL ROCKET',
          };
          vehicleBannerName = vnames[simState!.vehicle.kind] ?? 'VEHICLE';
          vehicleBannerAlpha = 1;
          break;
        }
        case 'shield_hit': audio.play('shield_hit'); break;
        case 'mission_complete': audio.play('mission_complete'); break;
        case 'zone_change': {
          const zi = evt.value ?? 0;
          audio.setZone(zi);
          zoneBannerName = ZONE_THEMES[zi]?.name ?? '';
          zoneBannerAlpha = 1;
          break;
        }
      }
    }
    simState._events = [];

    // Jetpack sound
    audio.setJetpackThrust(holding ? simState.hero.thrustGain : 0);

    // Speed sound
    audio.setGameSpeed(simState.speed);

    // Tutorial
    if (tutorialAlpha > 0) {
      tutorialTimer++;
      if (simState.distance > 500) {
        tutorialAlpha = Math.max(0, tutorialAlpha - 0.02);
      }
    }

    // Zone banner fade
    if (zoneBannerAlpha > 0) {
      zoneBannerAlpha = Math.max(0, zoneBannerAlpha - 0.004);
    }

    // Vehicle banner fade
    if (vehicleBannerAlpha > 0) {
      vehicleBannerAlpha = Math.max(0, vehicleBannerAlpha - 0.005);
    }

    // Coin popup fade
    for (const p of coinPopups) p.life -= 0.018;
    coinPopups = coinPopups.filter(p => p.life > 0);

    // Trigger game over
    if (simState.dead && simState.hero.deathTimer > 90 && !gameoverShown) {
      goToGameOver();
    }

    // Camera events
    tickCamera(camera, events);
  }

  if (scene === 'spin' && spinActive && !spinDone) {
    spinProgress += 0.015;
    if (spinProgress >= 1) {
      spinActive = false;
      applySpinPrize();
    }
  }

  input.pollGamepad();
  menuHeroAnim++;
}

// ── Render ─────────────────────────────────────────────────────────────────

function render(interp: number, dt: number): void {
  _lastFrameMs = dt * 1000;
  debug.recordFrame(dt);

  ctx.clearRect(0, 0, CFG.WORLD_W, CFG.WORLD_H);

  if (scene === 'run' || scene === 'paused') {
    renderGameScene(interp);
  } else if (scene === 'menu') {
    renderMenuScene();
  } else if (scene === 'gameover') {
    renderGameOverScene();
  } else if (scene === 'shop') {
    renderShopScene();
  } else if (scene === 'missions') {
    renderMissionsScene();
  } else if (scene === 'settings') {
    renderSettingsScene();
  } else if (scene === 'spin') {
    renderSpinScene();
  } else if (scene === 'boot') {
    // Boot: show menu immediately
    scene = 'menu';
  }

  input.endFrame();
}

function renderGameScene(interp: number): void {
  if (!simState) return;

  ctx.save();

  // Camera shake + zoom punch
  applyCamera(ctx, camera, simState.hero.x, simState.hero.y, save.screenShake);

  // Background
  drawBackground(ctx, simState.zoneIndex, Math.min(4, simState.zoneIndex + 1), simState.zoneFade, simState.distance);

  // Floor / ceiling
  drawFloorAndCeiling(ctx, simState.zoneIndex, simState.distance);

  // Hazards
  drawZappers(ctx, simState.zappers);
  drawLasers(ctx, simState.lasers);
  drawMissiles(ctx, simState.missiles);
  drawPendulums(ctx, simState.pendulums);
  drawVents(ctx, simState.vents);

  // Vehicle crates
  drawVehicleCrates(ctx, simState.vehicleCrates);

  // Coins & tokens
  drawCoins(ctx, simState.coins, simState.tick);
  drawSpinTokens(ctx, simState.spinTokens);

  // Particles (behind hero) — skip smoke/casing when fps is low
  const slowFrame = _lastFrameMs > CFG.PARTICLE_ADAPTIVE_THRESHOLD;
  const bgParticles = simState.particles.filter(p => {
    if (!p.active) return false;
    if (p.kind === 'pickup_glow') return false;
    if (slowFrame && (p.kind === 'jetpack_smoke' || p.kind === 'casing' || p.kind === 'missile_smoke')) return false;
    return true;
  });
  drawParticles(ctx, bgParticles);

  // Hero
  drawHero(ctx, simState.hero, simState.vehicle, interp, prevHeroY, simState.tick);

  // Foreground particles
  drawParticles(ctx, simState.particles.filter(p => p.active && p.kind === 'pickup_glow'));

  // Zone fade
  drawZoneFade(ctx, simState.zoneFade);

  // Vignette
  drawVignette(ctx, simState.dead, simState.hero.invulnTicks);

  // Hit-stop flash
  drawHitStopFlash(ctx, simState.hitStop);

  ctx.restore();

  // Zone banner (outside camera transform so it's stable)
  drawZoneBanner(ctx, zoneBannerName, zoneBannerAlpha);

  // Vehicle pickup banner
  if (vehicleBannerAlpha > 0) drawVehicleBanner(ctx, vehicleBannerName, vehicleBannerAlpha);

  // HUD (no shake)
  if (!simState.dead) {
    drawHUD(ctx, simState, save.bestDistance, scene === 'paused', simState.tick);
  }

  // Coin popup flyovers
  for (const p of coinPopups) {
    const alpha = Math.min(1, p.life * 2.5);
    const drift = (1 - p.life) * 28;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${p.val}`, CFG.WORLD_W - 184, 77 - drift);
    ctx.restore();
  }

  // Tutorial
  drawTutorial(ctx, tutorialAlpha);

  // Debug
  debug.draw(ctx, simState, simState.tick);
  debug.drawHitboxes(ctx, simState);

  if (scene === 'paused') {
    uiButtons = drawPauseOverlay(ctx, simState.missions, simState.tick);
  } else {
    uiButtons = [];
  }
}

function renderMenuScene(): void {
  // Background
  const W = CFG.WORLD_W, H = CFG.WORLD_H;
  const theme = ZONE_THEMES[0]!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  drawFloorAndCeiling(ctx, 0, 0);
  drawVignette(ctx, false, 0);
  uiButtons = drawMenuScene(ctx, simState?.tick ?? menuHeroAnim, menuHeroAnim, save);
}

function renderGameOverScene(): void {
  if (!simState) { scene = 'menu'; return; }
  const W = CFG.WORLD_W, H = CFG.WORLD_H;
  // Show dim game background
  const theme = ZONE_THEMES[simState.zoneIndex]!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawFloorAndCeiling(ctx, simState.zoneIndex, simState.distance);

  const meters = Math.floor(simState.distance / CFG.UNITS_PER_METER);
  const isFreeRevive = hasExtraRevive(save.gadgetSlots) && !reviveUsed;
  const reviveCost = isFreeRevive ? 0 : CFG.REVIVE_BASE_COST;
  uiButtons = drawGameOverScene(
    ctx,
    meters, simState.coinsThisRun, simState.tokensThisRun,
    save.bestDistance, isNewBest,
    simState.missions, save,
    reviveCost, reviveUsed, simState.tokensThisRun,
    simState.seed
  );
}

function renderShopScene(): void {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d0d1a');
  grad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  uiButtons = drawShopScene(ctx, save, shopTab);
}

function renderMissionsScene(): void {
  const W = CFG.WORLD_W, H = CFG.WORLD_H;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d0d1a');
  grad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  const missions = (save.pendingMissions as unknown as import('./sim/types').Mission[]) ?? [];
  uiButtons = drawMissionsScene(ctx, missions, save.rank, save.rankProgress);
}

function renderSettingsScene(): void {
  uiButtons = drawSettingsScene(ctx, save);
}

function renderSpinScene(): void {
  if (!simState) { scene = 'menu'; return; }
  const W = CFG.WORLD_W, H = CFG.WORLD_H;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d0d1a');
  grad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  uiButtons = drawSpinMachine(ctx, spinProgress, spinPrize, spinActive);
  void H;
}

function drawVehicleBanner(ctx: CanvasRenderingContext2D, name: string, alpha: number): void {
  if (alpha <= 0) return;
  const W = CFG.WORLD_W;
  const y = 224; // below zone banner (which is at 160)

  ctx.save();
  ctx.globalAlpha = alpha;

  const bw = 440, bh = 46;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - bw / 2, y - bh / 2, bw, bh, 6);
  ctx.fill();

  ctx.fillStyle = '#ffdd88';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VEHICLE PICKUP', W / 2, y - 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(name, W / 2, y + 8);

  ctx.restore();
}

// ── Main loop start ────────────────────────────────────────────────────────

const loop = new GameLoop(
  (held) => tick(held),
  (interp, dt) => render(interp, dt),
  () => input.holding
);

// Hide loading screen
const loading = document.getElementById('loading');
if (loading) loading.style.display = 'none';

// Check for debug/jump query param
const params = new URLSearchParams(location.search);
if (params.has('debug')) debug.toggle();
if (params.has('zone')) {
  startRun();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  simState!.distance = parseInt(params.get('zone') ?? '0') * CFG.ZONE_DIST * CFG.UNITS_PER_METER;
}

loop.start();
