import { Sprite } from "pixi.js";

export class Player {
  public container: Sprite;

  private speed: number = 0;
  private maxSpeed: number = 5;
  private acceleration: number = 0.1;
  private friction: number = 0.98;
  private rotationSpeed: number = 0.05;
  private currentRotation: number = 0;

  constructor(textureName: string, startX: number, startY: number) {
    this.container = Sprite.from(textureName);
    this.container.anchor.set(0.5);
    this.container.scale.set(0.4);
    this.container.x = startX;
    this.container.y = startY;
  }

  public update(
    input: { forward: boolean; left: boolean; right: boolean },
    screenWidth: number,
    screenHeight: number,
    delta: number,
  ) {
    // Rotação (Girar para os lados)
    if (input.left) {
      this.currentRotation -= this.rotationSpeed * delta;
    }
    if (input.right) {
      this.currentRotation += this.rotationSpeed * delta;
    }
    this.container.rotation = this.currentRotation;

    // Aceleração para frente
    if (input.forward) {
      this.speed += this.acceleration * delta;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    } else {
      this.speed *= Math.pow(this.friction, delta);
      if (this.speed < 0.01) this.speed = 0;
    }

    // Como a proa do asset original aponta para baixo (oposto ao eixo padrão de cálculo -Math.PI/2),
    // invertemos o vetor trigonométrico somando Math.PI. Desta forma, a proa do navio
    // passará a liderar o movimento visualmente para frente.
    const movementAngle = this.currentRotation + Math.PI / 2;

    this.container.x += Math.cos(movementAngle) * this.speed * delta;
    this.container.y += Math.sin(movementAngle) * this.speed * delta;

    // Limites da tela (Colisão com as bordas)
    const margin = 30;
    if (this.container.x < margin) this.container.x = margin;
    if (this.container.x > screenWidth - margin)
      this.container.x = screenWidth - margin;
    if (this.container.y < margin) this.container.y = margin;
    if (this.container.y > screenHeight - margin)
      this.container.y = screenHeight - margin;
  }
}
