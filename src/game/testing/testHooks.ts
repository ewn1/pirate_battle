/**
 * [TEST HOOKS]
 * Exposes `window.__PIRATE_TEST__` when test mode is on (`?e2e=1` or dev).
 *
 * The hook only OBSERVES state and CONTROLS TIME / PLACEMENT. Rules, inputs,
 * collisions and rendering run exactly as in a real match: tests still press
 * real keys/buttons and assert on the effects.
 *
 * Typical use (Playwright):
 *   await page.goto("/game?e2e=1&manual=1&seed=7");
 *   await page.evaluate(() => window.__PIRATE_TEST__!.step(1000));
 *   const snap = await page.evaluate(() => window.__PIRATE_TEST__!.getSnapshot());
 */
import type { EnemyType } from "../entities/Enemy";
import type { EngineSnapshot, GameEngine } from "../core/GameEngine";
import type { PerfApi } from "./perfProbe";

export interface PirateTestApi {
  /** Current simulation state as plain JSON. */
  getSnapshot(): EngineSnapshot;
  /** Advances the simulation by `ms` (fixed 1/60 s steps). */
  step(ms: number): void;
  /** True when the real ticker is disconnected from the simulation. */
  isManualClock(): boolean;
  /** Places an enemy at an exact position and returns its id. */
  spawnEnemy(type: EnemyType, x: number, y: number): number;
  /** Moves the player (and optionally rotates it). */
  teleportPlayer(x: number, y: number, heading?: number): void;
  /** Sets the player's current health (clamped to max). */
  setPlayerHealth(health: number): void;
}

declare global {
  interface Window {
    __PIRATE_TEST__?: PirateTestApi;
    __PIRATE_PERF__?: PerfApi;
  }
}

export function registerTestApi(engine: GameEngine): void {
  window.__PIRATE_TEST__ = {
    getSnapshot: () => engine.getSnapshot(),
    step: (ms) => engine.step(ms),
    isManualClock: () => engine.isManualClock(),
    spawnEnemy: (type, x, y) => engine.debugSpawnEnemy(type, x, y),
    teleportPlayer: (x, y, heading) => engine.debugTeleportPlayer(x, y, heading),
    setPlayerHealth: (health) => engine.debugSetPlayerHealth(health),
  };
}

export function unregisterTestApi(): void {
  delete window.__PIRATE_TEST__;
}
