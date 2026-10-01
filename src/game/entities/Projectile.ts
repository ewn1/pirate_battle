import { Container, Sprite, Graphics, Assets } from "pixi.js";

export class Projectile {
  public container: Container;
  private speed: number = 12;
  private vx: number;
  private vy: number;
  public isDead: boolean = false;

  constructor(startX: number, startY: number, angle: number) {
    this.container = new Container();
    this.container.x = startX;
    this.container.y = startY;

    // Tenta carregar o sprite da bala de canhão original
    const ballTexture =
      Assets.get("cannon_ball") ||
      Assets.get("/assets/png/default/ship_parts/cannon_ball.png");

    if (ballTexture) {
      const sprite = new Sprite(ballTexture);
      sprite.anchor.set(0.5);
      sprite.scale.set(0.8);
      this.container.addChild(sprite);
    } else {
      // Fallback em Graphics
      const gfx = new Graphics();
      gfx.circle(0, 0, 5).fill(0x1e293b);
      this.container.addChild(gfx);
    }

    const fireAngle = angle + Math.PI / 2;
    this.vx = Math.cos(fireAngle) * this.speed;
    this.vy = Math.sin(fireAngle) * this.speed;
  }

  public update(delta: number, screenWidth: number, screenHeight: number) {
    this.container.x += this.vx * delta;
    this.container.y += this.vy * delta;

    if (
      this.container.x < -20 ||
      this.container.x > screenWidth + 20 ||
      this.container.y < -20 ||
      this.container.y > screenHeight + 20
    ) {
      this.isDead = true;
    }
  }
}
