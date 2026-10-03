/**
 * [PLAYER]
 * Simulation state of the player's ship: movement, health and weapon
 * cooldowns. All numbers come from GameConfig. Time is advanced only by the
 * engine's fixed step, so pausing freezes cooldowns automatically.
 */
import type { GameConfig } from "../config/GameConfig";
import type { ActionState } from "../utils/InputManager";
import type { ProjectileSpec } from "./Projectile";
import { ShipVisual } from "../ui/ShipVisual";

export type WeaponKind = "front" | "left" | "right";

export class Player {
  public readonly id: number;
  public readonly visual: ShipVisual;
  private readonly config: GameConfig;

  public x: number;
  public y: number;
  /** Travel direction in radians (0 = east). */
  public heading: number;
  /** Signed speed along the heading (px/s). */
  public speed = 0;
  public health: number;
  public readonly maxHealth: number;
  public readonly radius: number;

  /** Remaining cooldown per weapon (seconds). */
  public cooldowns: Record<WeaponKind, number> = { front: 0, left: 0, right: 0 };

  constructor(id: number, config: GameConfig, x: number, y: number) {
    this.id = id;
    this.config = config;
    this.x = x;
    this.y = y;
    this.heading = 0;
    this.health = config.player.maxHealth;
    this.maxHealth = config.player.maxHealth;
    this.radius = config.player.radius;
    this.visual = new ShipVisual({ colorSlot: 1, scale: 0.65, isEnemy: false });
    this.syncView(0);
  }

  /** Rotation, acceleration/drag and arena clamping. */
  public update(dt: number, input: ActionState) {
    const cfg = this.config.player;

    if (input.left) this.heading -= cfg.rotationSpeed * dt;
    if (input.right) this.heading += cfg.rotationSpeed * dt;

    if (input.forward) {
      this.speed = Math.min(cfg.maxSpeed, this.speed + cfg.acceleration * dt);
    } else if (input.backward) {
      this.speed = Math.max(
        -cfg.reverseMaxSpeed,
        this.speed - cfg.acceleration * 0.6 * dt,
      );
    } else {
      this.speed *= Math.pow(cfg.dragPerSecond, dt);
      if (Math.abs(this.speed) < 1) this.speed = 0;
    }

    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;

    // Keep the ship inside the visible arena.
    const margin = this.radius + 6;
    const { width, height } = this.config.arena;
    this.x = Math.min(width - margin, Math.max(margin, this.x));
    this.y = Math.min(height - margin, Math.max(margin, this.y));

    for (const kind of ["front", "left", "right"] as const) {
      if (this.cooldowns[kind] > 0) {
        this.cooldowns[kind] = Math.max(0, this.cooldowns[kind] - dt);
      }
    }
  }

  /**
   * Fires every requested weapon that is off cooldown.
   * Returns the projectiles to create (engine owns their lifecycle).
   */
  public collectShots(input: ActionState): ProjectileSpec[] {
    const shots: ProjectileSpec[] = [];
    const cfg = this.config.player;

    if (input.fireFront && this.cooldowns.front <= 0) {
      this.cooldowns.front = cfg.frontal.cooldown;
      const offset = this.radius + 6;
      shots.push({
        weapon: "front",
        x: this.x + Math.cos(this.heading) * offset,
        y: this.y + Math.sin(this.heading) * offset,
        angle: this.heading,
        speed: cfg.frontal.speed,
        damage: cfg.frontal.damage,
        lifetime: cfg.frontal.lifetime,
        owner: "player",
      });
    }

    if (input.fireLeft && this.cooldowns.left <= 0) {
      this.cooldowns.left = cfg.broadside.cooldown;
      shots.push(...this.broadsideVolley(-1));
    }

    if (input.fireRight && this.cooldowns.right <= 0) {
      this.cooldowns.right = cfg.broadside.cooldown;
      shots.push(...this.broadsideVolley(1));
    }

    return shots;
  }

  /** Three parallel projectiles fired perpendicular to the heading. */
  private broadsideVolley(side: -1 | 1): ProjectileSpec[] {
    const cfg = this.config.player.broadside;
    const sideAngle = this.heading + (side * Math.PI) / 2;
    const half = (cfg.count - 1) / 2;
    const volley: ProjectileSpec[] = [];

    for (let i = 0; i < cfg.count; i++) {
      // Spread along the ship's length so the shots travel in parallel.
      const along = (i - half) * cfg.spacing;
      volley.push({
        weapon: "broadside",
        x:
          this.x +
          Math.cos(this.heading) * along +
          Math.cos(sideAngle) * (this.radius - 4),
        y:
          this.y +
          Math.sin(this.heading) * along +
          Math.sin(sideAngle) * (this.radius - 4),
        angle: sideAngle,
        speed: cfg.speed,
        damage: cfg.damage,
        lifetime: cfg.lifetime,
        owner: "player",
      });
    }
    return volley;
  }

  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    this.visual.flash();
  }

  /** Pushes the simulation state into the Pixi view. */
  public syncView(dt: number) {
    this.visual.setPose(this.x, this.y, this.heading);
    this.visual.setHealth(this.health, this.maxHealth);
    this.visual.update(dt);
  }

  public destroy() {
    this.visual.destroy();
  }
}
