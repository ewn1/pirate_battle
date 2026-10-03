/**
 * [ENEMY]
 * Simulation state and AI of both enemy types.
 *
 *  - Chaser : turns toward the player and rams it (explodes on impact).
 *  - Shooter: approaches until `preferredRange`, then holds position and
 *             fires when the player is inside `attackRange`.
 *
 * Both rotate at a limited turn rate, avoid islands, take damage and stop
 * participating in the simulation the moment they are destroyed.
 */
import type { GameConfig } from "../config/GameConfig";
import type { Circle } from "../utils/Collision";
import { normalizeAngle, steerAroundIslands } from "../utils/Collision";
import type { ProjectileSpec } from "./Projectile";
import { ShipVisual } from "../ui/ShipVisual";

export type EnemyType = "chaser" | "shooter";

/** How long the sinking animation lingers after destruction (s). */
const SINK_DURATION = 0.9;

export interface EnemyContext {
  playerX: number;
  playerY: number;
  islands: readonly Circle[];
  arena: { width: number; height: number };
}

export class Enemy {
  public readonly id: number;
  public readonly type: EnemyType;
  public readonly visual: ShipVisual;
  public readonly radius: number;
  public readonly maxHealth: number;

  public x: number;
  public y: number;
  public heading: number;
  public health: number;

  /** False as soon as the enemy is destroyed (no damage, shots or collisions). */
  public alive = true;
  /** True once the sinking animation ended and the engine may remove it. */
  public removable = false;

  private readonly config: GameConfig;
  private fireCooldown: number;
  private sinkTimer = 0;

  constructor(
    id: number,
    type: EnemyType,
    config: GameConfig,
    x: number,
    y: number,
    initialHeading: number,
  ) {
    this.id = id;
    this.type = type;
    this.config = config;
    const stats = type === "chaser" ? config.chaser : config.shooter;
    this.x = x;
    this.y = y;
    this.heading = initialHeading;
    this.radius = stats.radius;
    this.maxHealth = stats.health;
    this.health = stats.health;
    // Shooters need a moment before their first shot.
    this.fireCooldown = type === "shooter" ? config.shooter.fireCooldown * 0.6 : 0;
    this.visual = new ShipVisual({
      colorSlot: type === "chaser" ? 2 : 3,
      scale: 0.55,
      isEnemy: true,
    });
    this.syncView(0);
  }

  /**
   * Advances the AI by `dt` seconds.
   * Returns a projectile spec when the Shooter fires this step.
   */
  public update(dt: number, ctx: EnemyContext): ProjectileSpec | null {
    if (!this.alive) {
      this.sinkTimer += dt;
      if (this.sinkTimer >= SINK_DURATION) this.removable = true;
      return null;
    }

    const stats = this.type === "chaser" ? this.config.chaser : this.config.shooter;
    const dx = ctx.playerX - this.x;
    const dy = ctx.playerY - this.y;
    const distance = Math.hypot(dx, dy);
    const angleToPlayer = Math.atan2(dy, dx);

    // 1. Steering: aim at the player but go around islands in the way.
    const desired = steerAroundIslands(
      this.x,
      this.y,
      angleToPlayer,
      this.radius,
      distance,
      ctx.islands,
    );

    // 2. Rotation with a limited turn rate.
    const diff = normalizeAngle(desired - this.heading);
    const maxTurn = stats.turnRate * dt;
    this.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));

    // 3. Movement along the heading.
    let shot: ProjectileSpec | null = null;
    if (this.type === "chaser") {
      this.advance(this.config.chaser.speed * dt);
    } else {
      const shooter = this.config.shooter;
      if (distance > shooter.preferredRange) {
        this.advance(shooter.speed * dt);
      }

      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      const aimError = Math.abs(normalizeAngle(angleToPlayer - this.heading));
      if (distance <= shooter.attackRange && aimError < 0.3 && this.fireCooldown <= 0) {
        this.fireCooldown = shooter.fireCooldown;
        const muzzle = this.radius + 8;
        shot = {
          weapon: "enemy",
          x: this.x + Math.cos(this.heading) * muzzle,
          y: this.y + Math.sin(this.heading) * muzzle,
          angle: this.heading,
          speed: shooter.projectile.speed,
          damage: shooter.projectile.damage,
          lifetime: shooter.projectile.lifetime,
          owner: "enemy",
        };
      }
    }

    // 4. Stay inside the arena.
    const margin = this.radius;
    this.x = Math.min(ctx.arena.width - margin, Math.max(margin, this.x));
    this.y = Math.min(ctx.arena.height - margin, Math.max(margin, this.y));

    return shot;
  }

  public takeDamage(amount: number) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.visual.flash();
  }

  /** Marks the enemy as destroyed. Idempotent. */
  public destroyShip() {
    if (!this.alive) return;
    this.alive = false;
    this.health = Math.max(0, this.health);
    this.visual.markSunk();
  }

  /** Pushes the simulation state into the Pixi view. */
  public syncView(dt: number) {
    this.visual.setPose(this.x, this.y, this.heading);
    if (this.alive) {
      this.visual.setHealth(this.health, this.maxHealth);
    } else {
      this.visual.setAlpha(Math.max(0, 1 - this.sinkTimer / SINK_DURATION));
    }
    this.visual.update(dt);
  }

  public destroy() {
    this.visual.destroy();
  }

  private advance(distance: number) {
    this.x += Math.cos(this.heading) * distance;
    this.y += Math.sin(this.heading) * distance;
  }
}
