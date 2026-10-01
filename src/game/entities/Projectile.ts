import { Container, Sprite, Graphics, Assets } from "pixi.js";

export class Projectile {
  public container: Container;
  private speed: number;
  private vx: number;
  private vy: number;
  public isDead: boolean = false;
  public isEnemy: boolean = false;

  constructor(
    startX: number,
    startY: number,
    trajectoryAngle: number,
    speed: number = 10,
  ) {
    this.container = new Container();
    this.container.x = startX;
    this.container.y = startY;
    this.speed = speed;

    const ballTexture =
      Assets.get("cannon_ball") ||
      Assets.get("/assets/png/default/ship_parts/cannon_ball.png");

    if (ballTexture) {
      const sprite = new Sprite(ballTexture);
      sprite.anchor.set(0.5);
      sprite.scale.set(0.75);
      this.container.addChild(sprite);
    } else {
      const gfx = new Graphics();
      gfx.circle(0, 0, 5).fill(0x1e293b);
      this.container.addChild(gfx);
    }

    this.vx = Math.cos(trajectoryAngle) * this.speed;
    this.vy = Math.sin(trajectoryAngle) * this.speed;
  }

  public update(delta: number, screenWidth: number, screenHeight: number) {
    this.container.x += this.vx * delta;
    this.container.y += this.vy * delta;

    if (
      this.container.x < -30 ||
      this.container.x > screenWidth + 30 ||
      this.container.y < -30 ||
      this.container.y > screenHeight + 30
    ) {
      this.isDead = true;
    }
  }
}
