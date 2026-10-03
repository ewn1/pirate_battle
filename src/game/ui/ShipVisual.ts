/**
 * [SHIP VISUAL]
 * Pixi representation shared by the player and every enemy. The simulation
 * entities own the state (position, heading, health) and push it here once
 * per frame; this class contains NO game rules.
 *
 * Structure:
 *   view            positioned at the ship centre (world space)
 *   ├─ body         rotated by the ship heading
 *   │   ├─ sprite   ship texture (changes with damage state)
 *   │   └─ fire     flame shown on damaged ships
 *   └─ bar          health bar (never rotates)
 */
import { Container, Sprite } from "pixi.js";
import { getTexture } from "../core/assetManifest";
import { SpriteHealthBar } from "./SpriteHealthBar";

export interface ShipVisualOptions {
  /** Ship colour slot in the ship sheet (1 = white, 2 = black, 3 = red). */
  colorSlot: number;
  scale: number;
  isEnemy: boolean;
}

/** Offsets inside the ship sheet: healthy, damaged, heavily damaged, sunk. */
const STATE_OFFSETS = [0, 6, 12, 18];
const FLASH_DURATION = 0.12;

export class ShipVisual {
  public readonly view = new Container();

  private readonly body = new Container();
  private readonly sprite = new Sprite();
  private readonly fire = new Sprite();
  private readonly bar: SpriteHealthBar;
  private readonly colorSlot: number;

  private stateIndex = -1;
  private flashTimer = 0;
  private time = Math.random() * 10;
  private sunk = false;

  constructor(options: ShipVisualOptions) {
    this.colorSlot = options.colorSlot;

    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(options.scale);

    this.fire.anchor.set(0.5, 0.8);
    this.fire.visible = false;

    this.body.addChild(this.sprite, this.fire);

    this.bar = new SpriteHealthBar({
      isEnemy: options.isEnemy,
      offsetY: -(56 * options.scale + 14),
    });

    this.view.addChild(this.body, this.bar);
    this.applyState(0);
  }

  /** Moves/rotates the ship. `heading` is the travel direction in radians. */
  public setPose(x: number, y: number, heading: number) {
    this.view.position.set(x, y);
    // The ship art points down at rotation 0, hence the -90 degrees offset.
    this.body.rotation = heading - Math.PI / 2;
  }

  /** Updates the health bar and the visual deterioration of the hull. */
  public setHealth(current: number, max: number) {
    if (this.sunk) return;
    this.bar.update(current, max);

    const ratio = max > 0 ? current / max : 0;
    const state = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
    if (state !== this.stateIndex) this.applyState(state);
  }

  /** Short red flash used as hit feedback. */
  public flash() {
    this.flashTimer = FLASH_DURATION;
  }

  /** Switches to the destroyed texture and hides bar and flames. */
  public markSunk() {
    this.sunk = true;
    this.sprite.texture = getTexture(`ship_${this.colorSlot + STATE_OFFSETS[3]}`);
    this.sprite.tint = 0xffffff;
    this.fire.visible = false;
    this.bar.visible = false;
  }

  public setAlpha(alpha: number) {
    this.view.alpha = alpha;
  }

  /** Visual-only animation (flash fade, flame flicker). Driven by sim time. */
  public update(dt: number) {
    this.time += dt;
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      this.sprite.tint = this.flashTimer > 0 ? 0xff7070 : 0xffffff;
    }
    if (this.fire.visible) {
      const pulse = 1 + 0.18 * Math.sin(this.time * 18);
      this.fire.scale.set(pulse);
    }
  }

  public destroy() {
    this.view.destroy({ children: true });
  }

  private applyState(state: number) {
    this.stateIndex = state;
    this.sprite.texture = getTexture(
      `ship_${this.colorSlot + STATE_OFFSETS[state]}`,
    );
    if (state === 0) {
      this.fire.visible = false;
    } else {
      this.fire.texture = getTexture(state === 1 ? "fire_2" : "fire_1");
      this.fire.visible = true;
    }
  }
}
