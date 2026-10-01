import { Container, Sprite } from "pixi.js";
import { getGameTexture } from "../utils/textureUtils";

export class Player {
  public container: Container;
  public sprite: Sprite;
  public health: number = 100;
  public maxHealth: number = 100;

  private speed: number = 0;
  private maxSpeed: number = 5;
  private acceleration: number = 0.1;
  private friction: number = 0.98;
  private rotationSpeed: number = 0.05;
  private currentRotation: number = 0;

  constructor(textureAlias: string = "ship_1", startX: number, startY: number) {
    this.container = new Container();
    this.container.x = startX;
    this.container.y = startY;

    // Obtém a textura validada
    const texture = getGameTexture(textureAlias);

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(0.6);

    this.container.addChild(this.sprite);
  }

  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
  }

  public update(
    input: { forward: boolean; left: boolean; right: boolean },
    screenWidth: number,
    screenHeight: number,
    delta: number,
  ) {
    if (input.left) this.currentRotation -= this.rotationSpeed * delta;
    if (input.right) this.currentRotation += this.rotationSpeed * delta;
    this.container.rotation = this.currentRotation;

    if (input.forward) {
      this.speed += this.acceleration * delta;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    } else {
      this.speed *= Math.pow(this.friction, delta);
      if (this.speed < 0.01) this.speed = 0;
    }

    const movementAngle = this.currentRotation + Math.PI / 2;
    this.container.x += Math.cos(movementAngle) * this.speed * delta;
    this.container.y += Math.sin(movementAngle) * this.speed * delta;

    const margin = 30;
    if (this.container.x < margin) this.container.x = margin;
    if (this.container.x > screenWidth - margin)
      this.container.x = screenWidth - margin;
    if (this.container.y < margin) this.container.y = margin;
    if (this.container.y > screenHeight - margin)
      this.container.y = screenHeight - margin;
  }
}
