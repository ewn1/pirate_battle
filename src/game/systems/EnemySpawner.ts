/**
 * [ENEMY SPAWNER]
 * Decides WHEN and WHERE enemies appear. It never creates entities itself;
 * it returns a spawn request that the engine turns into an Enemy.
 *
 * Rules:
 *  - one spawn every `config.spawn.intervalSec` seconds of active match time;
 *  - spawn points are inside the arena, outside islands, away from other
 *    enemies and at least `minDistanceFromPlayer` from the player;
 *  - the first spawn is a Chaser and the second a Shooter, so both types
 *    always show up in a standard match; afterwards types follow the weights.
 */
import type { GameConfig } from "../config/GameConfig";
import type { Circle } from "../utils/Collision";
import type { EnemyType } from "../entities/Enemy";
import type { Rng } from "../utils/Random";

export interface SpawnRequest {
  type: EnemyType;
  x: number;
  y: number;
}

export interface SpawnContext {
  playerX: number;
  playerY: number;
  aliveEnemies: ReadonlyArray<{ x: number; y: number }>;
  islands: readonly Circle[];
}

const MAX_ATTEMPTS = 40;
const MIN_ENEMY_SEPARATION = 90;
const ISLAND_CLEARANCE = 40;

export class EnemySpawner {
  private readonly config: GameConfig;
  private readonly rng: Rng;
  private timer = 0;
  private spawnCount = 0;

  constructor(config: GameConfig, rng: Rng) {
    this.config = config;
    this.rng = rng;
  }

  public update(dt: number, ctx: SpawnContext): SpawnRequest | null {
    const { intervalSec, maxAlive } = this.config.spawn;

    // Keep accumulating, but never exceed one interval worth of "debt".
    this.timer = Math.min(intervalSec, this.timer + dt);
    if (this.timer < intervalSec) return null;
    if (ctx.aliveEnemies.length >= maxAlive) return null;

    const point = this.findSpawnPoint(ctx);
    if (!point) return null; // try again on the next step

    this.timer = 0;
    const type = this.pickType();
    this.spawnCount++;
    return { type, x: point.x, y: point.y };
  }

  public get totalSpawned(): number {
    return this.spawnCount;
  }

  private pickType(): EnemyType {
    if (this.spawnCount === 0) return "chaser";
    if (this.spawnCount === 1) return "shooter";
    const { chaser, shooter } = this.config.spawn.weights;
    return this.rng.next() < chaser / (chaser + shooter) ? "chaser" : "shooter";
  }

  private findSpawnPoint(ctx: SpawnContext): { x: number; y: number } | null {
    const { width, height } = this.config.arena;
    const { edgeMargin, minDistanceFromPlayer } = this.config.spawn;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const x = this.rng.range(edgeMargin, width - edgeMargin);
      const y = this.rng.range(edgeMargin, height - edgeMargin);
      if (this.isFree(x, y, minDistanceFromPlayer, ctx)) return { x, y };
    }

    // Fallback: the arena corner farthest from the player that is still free.
    const corners = [
      { x: edgeMargin, y: edgeMargin },
      { x: width - edgeMargin, y: edgeMargin },
      { x: edgeMargin, y: height - edgeMargin },
      { x: width - edgeMargin, y: height - edgeMargin },
    ].sort(
      (a, b) =>
        Math.hypot(b.x - ctx.playerX, b.y - ctx.playerY) -
        Math.hypot(a.x - ctx.playerX, a.y - ctx.playerY),
    );
    return corners.find((c) => this.isFree(c.x, c.y, minDistanceFromPlayer * 0.6, ctx)) ?? null;
  }

  private isFree(x: number, y: number, minPlayerDistance: number, ctx: SpawnContext): boolean {
    if (Math.hypot(x - ctx.playerX, y - ctx.playerY) < minPlayerDistance) return false;
    for (const island of ctx.islands) {
      if (Math.hypot(x - island.x, y - island.y) < island.radius + ISLAND_CLEARANCE) {
        return false;
      }
    }
    for (const enemy of ctx.aliveEnemies) {
      if (Math.hypot(x - enemy.x, y - enemy.y) < MIN_ENEMY_SEPARATION) return false;
    }
    return true;
  }
}
