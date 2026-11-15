import { CFG } from '../config';
import type { Coin, SpinToken } from './types';

export function createCoinPool(size = 400): Coin[] {
  const pool: Coin[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({
      active: false, x: 0, y: 0,
      collected: false, magnetized: false,
      magnetVx: 0, magnetVy: 0, animFrame: 0,
    });
  }
  return pool;
}

export function createSpinTokenPool(size = 20): SpinToken[] {
  const pool: SpinToken[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({ active: false, x: 0, y: 0, animFrame: 0 });
  }
  return pool;
}

export function spawnCoin(pool: Coin[], x: number, y: number): boolean {
  for (let i = 0; i < pool.length; i++) {
    const c = pool[i] as Coin;
    if (!c.active) {
      c.active = true;
      c.x = x;
      c.y = y;
      c.collected = false;
      c.magnetized = false;
      c.magnetVx = 0;
      c.magnetVy = 0;
      c.animFrame = 0;
      return true;
    }
  }
  return false;
}

export function spawnSpinToken(pool: SpinToken[], x: number, y: number): void {
  for (let i = 0; i < pool.length; i++) {
    const t = pool[i] as SpinToken;
    if (!t.active) {
      t.active = true;
      t.x = x;
      t.y = y;
      t.animFrame = 0;
      return;
    }
  }
}

export function tickCoins(
  coins: Coin[],
  spinTokens: SpinToken[],
  scrollDelta: number,
  heroX: number,
  heroY: number,
  magnetActive: boolean,
  magnetRadius: number,
): {
  coinsCollected: number;
  spinTokensCollected: number;
  collectPositions: Array<{ x: number; y: number }>;
} {
  let coinsCollected = 0;
  let spinTokensCollected = 0;
  const collectPositions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < coins.length; i++) {
    const c = coins[i] as Coin;
    if (!c.active) continue;
    c.x -= scrollDelta;
    c.animFrame++;

    if (c.collected) {
      // Fly toward hero then disappear
      const dx = heroX - c.x;
      const dy = heroY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) {
        c.active = false;
        coinsCollected++;
        collectPositions.push({ x: c.x, y: c.y });
        continue;
      }
      c.x += (dx / dist) * CFG.COIN_MAGNET_SPEED * 1.5;
      c.y += (dy / dist) * CFG.COIN_MAGNET_SPEED * 1.5;
      continue;
    }

    if (c.x < -40) { c.active = false; continue; }

    // Check magnet
    const dx = heroX - c.x;
    const dy = heroY - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (magnetActive && dist < magnetRadius) {
      c.magnetized = true;
    }

    if (c.magnetized) {
      c.x += (dx / dist) * CFG.COIN_MAGNET_SPEED;
      c.y += (dy / dist) * CFG.COIN_MAGNET_SPEED;
    }

    // Direct collection (small hitbox)
    if (dist < CFG.HERO_RADIUS + CFG.COIN_RADIUS) {
      c.collected = true;
    }
  }

  for (let i = 0; i < spinTokens.length; i++) {
    const t = spinTokens[i] as SpinToken;
    if (!t.active) continue;
    t.x -= scrollDelta;
    t.animFrame++;
    if (t.x < -40) { t.active = false; continue; }
    const dx = heroX - t.x;
    const dy = heroY - t.y;
    if (dx * dx + dy * dy < (CFG.HERO_RADIUS + 18) ** 2) {
      t.active = false;
      spinTokensCollected++;
      collectPositions.push({ x: t.x, y: t.y });
    }
  }

  return { coinsCollected, spinTokensCollected, collectPositions };
}
