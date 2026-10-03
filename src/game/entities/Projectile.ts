/**
 * [PROJECTILE]
 * Simulation state (position, velocity, damage, lifetime) plus a tiny Pixi
 * view. A projectile applies damage exactly once: `consume()` marks it as
 * spent and the engine removes it at the end of the step.
 */
import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { getTexture } from "../core/assetManifest";

export type ProjectileOwner = "player" | "enemy";

export interface ProjectileSpec {
  /** Which weapon produced it (used for sound/visual feedback). */
  weapon: "front" | "broadside" | "enemy";
  x: number;
  y: number;
  /** Travel direction in radians. */
  angle: number;
  speed: number;
  damage: number;
  /** Seconds before the projectile expires. */
  lifetime: number;
  owner: ProjectileOwner;
}

export class Projectile {
  public readonly id: number;
  public readonly view = new Container();
  public readonly radius = 5;
  public readonly weapon: ProjectileSpec["weapon"];

  public x: number;
  public y: number;
  public readonly damage: number;
  public readonly owner: ProjectileOwner;
  /** True once the projectile hit something (damage already applied). */
  public consumed = false;

  private vx: number;
  private vy: number;
  private ttl: number;

  constructor(id: number, spec: ProjectileSpec) {
    this.id = id;
    this.weapon = spec.weapon;
    this.x = spec.x;
    this.y = spec.y;
    this.vx = Math.cos(spec.angle) * spec.speed;
    this.vy = Math.sin(spec.angle) * spec.speed;
    this.damage = spec.damage;
    this.ttl = spec.lifetime;
    this.owner = spec.owner;

    const texture = getTexture("cannon_ball");
    if (texture !== Texture.EMPTY) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(0.75);
      this.view.addChild(sprite);
    } else {
      this.view.addChild(new Graphics().circle(0, 0, this.radius).fill(0x1e293b));
    }
    this.syncView();
  }

  public update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
  }

  public get expired(): boolean {
    return this.ttl <= 0;
  }

  public isOutside(width: number, height: number, margin = 30): boolean {
    return (
      this.x < -margin ||
      this.x > width + margin ||
      this.y < -margin ||
      this.y > height + margin
    );
  }

  public consume() {
    this.consumed = true;
  }

  public syncView() {
    this.view.position.set(this.x, this.y);
  }

  public destroy() {
    this.view.destroy({ children: true });
  }
}
