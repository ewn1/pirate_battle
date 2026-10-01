import { Container, Sprite, Graphics, Texture } from "pixi.js";
import { getGameTexture } from "../utils/textureUtils";

export type EnemyType = "chaser" | "shooter";

export class Enemy {
  public container: Container;
  public sprite: Sprite;
  public type: EnemyType;
  public health: number;
  public maxHealth: number;
  public isDying = false;
  public isDead = false;

  private healthBar: Container;
  private healthFill: Graphics;
  private attackCooldown = 0;

  constructor(
    type: EnemyType,
    textureAlias: string,
    x: number,
    y: number,
    health: number = 30,
  ) {
    this.type = type;
    this.health = health;
    this.maxHealth = health;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Busca de textura segura para o navio inimigo
    const texture = getGameTexture(textureAlias);

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(0.55);
    this.container.addChild(this.sprite);

    // Barra de vida flutuante
    this.healthBar = new Container();
    this.healthBar.y = -40;

    const bg = new Graphics();
    bg.rect(-20, -3, 40, 6).fill(0x222222);
    this.healthBar.addChild(bg);

    this.healthFill = new Graphics();
    this.healthBar.addChild(this.healthFill);
    this.updateHealthBar();

    this.container.addChild(this.healthBar);
  }

  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    this.updateHealthBar();
    if (this.health <= 0 && !this.isDying) {
      this.triggerDeath();
    }
  }

  private updateHealthBar() {
    const ratio = this.health / this.maxHealth;
    this.healthFill.clear();
    const color = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
    this.healthFill.rect(-19, -2, 38 * ratio, 4).fill(color);
  }

  public update(
    playerX: number,
    playerY: number,
    delta: number,
    onShoot?: (x: number, y: number, rotation: number) => void,
  ) {
    if (this.isDying || this.isDead) return;

    const dx = playerX - this.container.x;
    const dy = playerY - this.container.y;
    const distance = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx) - Math.PI / 2;

    this.container.rotation = targetAngle;

    if (this.type === "chaser") {
      const speed = 2.2;
      this.container.x += Math.cos(targetAngle + Math.PI / 2) * speed * delta;
      this.container.y += Math.sin(targetAngle + Math.PI / 2) * speed * delta;
    } else if (this.type === "shooter") {
      if (distance > 220) {
        const speed = 1.5;
        this.container.x += Math.cos(targetAngle + Math.PI / 2) * speed * delta;
        this.container.y += Math.sin(targetAngle + Math.PI / 2) * speed * delta;
      } else {
        if (this.attackCooldown <= 0) {
          if (onShoot) {
            onShoot(
              this.container.x,
              this.container.y,
              this.container.rotation,
            );
          }
          this.attackCooldown = 90;
        }
      }
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  public triggerDeath() {
    this.isDying = true;

    // Troca a textura para o navio destruído (ship_21.png)
    const destroyedTexture = getGameTexture("ship_21");
    if (destroyedTexture && destroyedTexture !== Texture.EMPTY) {
      this.sprite.texture = destroyedTexture;
    }

    this.healthBar.visible = false;

    setTimeout(() => {
      this.isDead = true;
    }, 600);
  }
}
