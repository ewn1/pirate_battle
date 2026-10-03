/**
 * [HEALTH BAR]
 * Small Pixi bar drawn above a ship. It is NOT a child of the rotating ship
 * body, so it always stays horizontal and readable.
 */
import { Container, Graphics } from "pixi.js";

export interface HealthBarOptions {
  /** Enemy bars are red, the player bar is green. */
  isEnemy?: boolean;
  /** Vertical offset from the ship centre (negative = above). */
  offsetY?: number;
  width?: number;
}

const BAR_HEIGHT = 8;

export class SpriteHealthBar extends Container {
  private readonly background = new Graphics();
  private readonly fill = new Graphics();
  private readonly isEnemy: boolean;
  private readonly barWidth: number;
  private lastRatio = -1;

  constructor(options: HealthBarOptions = {}) {
    super();
    const { isEnemy = true, offsetY = -42, width = 46 } = options;
    this.isEnemy = isEnemy;
    this.barWidth = width;
    this.y = offsetY;
    this.addChild(this.background, this.fill);
    this.drawBackground();
    this.update(1, 1);
  }

  /** Redraws only when the ratio actually changed. */
  public update(current: number, max: number): void {
    if (max <= 0) return;
    const ratio = Math.max(0, Math.min(1, current / max));
    if (ratio === this.lastRatio) return;
    this.lastRatio = ratio;

    let color = this.isEnemy ? 0xcc2222 : 0x2ecc40;
    if (!this.isEnemy && ratio <= 0.5) color = 0xf1c40f;
    if (ratio <= 0.3) color = 0xff2a2a;

    const innerWidth = (this.barWidth - 4) * ratio;
    this.fill.clear();
    if (innerWidth > 0) {
      this.fill
        .roundRect(-this.barWidth / 2 + 2, -BAR_HEIGHT / 2 + 2, innerWidth, BAR_HEIGHT - 4, 1)
        .fill({ color });
    }
  }

  private drawBackground() {
    this.background
      .roundRect(-this.barWidth / 2, -BAR_HEIGHT / 2, this.barWidth, BAR_HEIGHT, 2)
      .fill({ color: 0x111111, alpha: 0.85 })
      .stroke({ width: 1.5, color: 0x000000 });
  }
}
