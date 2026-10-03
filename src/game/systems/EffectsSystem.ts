/**
 * [EFFECTS SYSTEM]
 * Short-lived visual effects. Advanced by the simulation step, so they freeze
 * with the game when it is paused. Effects never influence gameplay.
 */
import { Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { getTexture } from "../core/assetManifest";

interface Effect {
  display: Container;
  age: number;
  life: number;
  startScale: number;
  endScale: number;
  /** Vertical drift in px/s (used by floating damage numbers). */
  driftY: number;
  /** Fade out over the whole life (true) or only the second half (false). */
  linearFade: boolean;
}

const DAMAGE_STYLE = new TextStyle({
  fontFamily: "Arial, sans-serif",
  fontSize: 18,
  fontWeight: "bold",
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 4 },
});

export class EffectsSystem {
  public readonly layer = new Container();
  private effects: Effect[] = [];

  public get activeCount(): number {
    return this.effects.length;
  }

  /** Muzzle flash when a cannon fires. */
  public muzzleFlash(x: number, y: number) {
    this.spawnSprite("explosion_3", x, y, 0.35, 0.65, 0.12);
  }

  /** Small burst where a projectile hits a ship. */
  public hit(x: number, y: number) {
    this.spawnSprite("explosion_2", x, y, 0.4, 0.85, 0.22);
  }

  /** Big explosion when a ship is destroyed. */
  public explosion(x: number, y: number, size = 1) {
    this.spawnSprite("explosion_1", x, y, 0.5 * size, 1.5 * size, 0.55);
  }

  /** Expanding ring where a projectile lands in the water or on an island. */
  public splash(x: number, y: number) {
    const ring = new Graphics().circle(0, 0, 8).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
    ring.position.set(x, y);
    this.add({
      display: ring,
      age: 0,
      life: 0.35,
      startScale: 0.5,
      endScale: 1.6,
      driftY: 0,
      linearFade: true,
    });
  }

  /** Floating "-15" style indicator. */
  public damageNumber(x: number, y: number, amount: number, color = 0xffffff) {
    const text = new Text({
      text: `-${Math.round(amount)}`,
      style: DAMAGE_STYLE,
    });
    text.anchor.set(0.5);
    text.tint = color;
    text.position.set(x, y - 26);
    this.add({
      display: text,
      age: 0,
      life: 0.8,
      startScale: 1,
      endScale: 1,
      driftY: -34,
      linearFade: false,
    });
  }

  public update(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.age += dt;
      const t = Math.min(1, effect.age / effect.life);

      const scale = effect.startScale + (effect.endScale - effect.startScale) * t;
      effect.display.scale.set(scale);
      effect.display.y += effect.driftY * dt;
      effect.display.alpha = effect.linearFade ? 1 - t : t < 0.5 ? 1 : 1 - (t - 0.5) * 2;

      if (t >= 1) {
        effect.display.destroy({ children: true });
        this.effects.splice(i, 1);
      }
    }
  }

  /** Removes every effect (match restart / destroy). */
  public clear() {
    for (const effect of this.effects) effect.display.destroy({ children: true });
    this.effects = [];
  }

  private spawnSprite(
    alias: string,
    x: number,
    y: number,
    startScale: number,
    endScale: number,
    life: number,
  ) {
    const sprite = new Sprite(getTexture(alias));
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    this.add({
      display: sprite,
      age: 0,
      life,
      startScale,
      endScale,
      driftY: 0,
      linearFade: true,
    });
  }

  private add(effect: Effect) {
    effect.display.scale.set(effect.startScale);
    this.layer.addChild(effect.display);
    this.effects.push(effect);
  }
}
