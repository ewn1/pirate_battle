import { Sprite, Assets } from "pixi.js";

export class Enemy {
  public container: Sprite;
  private speed: number = 2;
  public isDead: boolean = false;
  public isDying: boolean = false;
  private deathTimer: number = 30; // Duração do estado destruído em frames antes de sumir

  constructor(textureName: string, startX: number, startY: number) {
    this.container = Sprite.from(textureName);
    this.container.anchor.set(0.5);
    this.container.scale.set(0.35);
    this.container.x = startX;
    this.container.y = startY;
  }

  public triggerDeath() {
    if (this.isDying) return;
    this.isDying = true;
    this.speed = 0; // Para de se mover imediatamente

    // Substitui a textura pelo navio destruído/cinza (ship_21)
    try {
      this.container.texture = Assets.get("ship_destroyed");
    } catch {
      // Fallback caso a textura demore um instante
    }
  }

  public update(playerX: number, playerY: number, delta: number) {
    if (this.isDying) {
      // Conta o tempo do navio afundando/destruído na tela antes de removê-lo
      this.deathTimer -= delta;
      if (this.deathTimer <= 0) {
        this.isDead = true;
      }
      return;
    }

    const dx = playerX - this.container.x;
    const dy = playerY - this.container.y;

    const targetAngle = Math.atan2(dy, dx);

    this.container.x += Math.cos(targetAngle) * this.speed * delta;
    this.container.y += Math.sin(targetAngle) * this.speed * delta;

    this.container.rotation = targetAngle + Math.PI / 2 + Math.PI;
  }
}
