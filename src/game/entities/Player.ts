import { Container, Sprite, Graphics } from "pixi.js";
import { getGameTexture } from "../utils/textureUtils";

export interface FiredProjectileData {
  x: number;
  y: number;
  angle: number;
  isPlayer: boolean;
  damage: number;
  speed: number;
  lifetime: number;
}

export class Player {
  public container: Container;
  public sprite: Sprite;
  public health: number = 100;
  public maxHealth: number = 100;
  public radius: number = 22;

  private speed: number = 0;
  private maxSpeed: number = 4.5;
  private reverseMaxSpeed: number = -2.0;
  private acceleration: number = 0.12;
  private friction: number = 0.97;
  private rotationSpeed: number = 0.045;
  private currentRotation: number = 0;

  // Cooldowns de disparo (em milissegundos)
  private frontCooldownTimer: number = 0;
  private sideCooldownTimer: number = 0;
  private readonly FRONT_COOLDOWN: number = 350; // ms
  private readonly SIDE_COOLDOWN: number = 900; // ms

  // UI - Barra de vida acima do navio
  private healthBarContainer: Container;
  private healthBarFill: Graphics;

  constructor(textureAlias: string = "ship_1", startX: number, startY: number) {
    this.container = new Container();
    this.container.x = startX;
    this.container.y = startY;

    const texture = getGameTexture(textureAlias);
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(0.65);

    this.container.addChild(this.sprite);

    // Inicializa a barra de vida acima do navio
    this.healthBarContainer = new Container();
    this.healthBarContainer.y = -42;
    this.healthBarFill = new Graphics();
    this.healthBarContainer.addChild(this.healthBarFill);
    this.container.addChild(this.healthBarContainer);

    this.updateHealthBar();
  }

  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    this.updateHealthBar();
    this.applyVisualDegradation();
  }

  public repair(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateHealthBar();
    this.applyVisualDegradation();
  }

  private applyVisualDegradation() {
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent < 0.3) {
      this.sprite.tint = 0xff6666; // Vermelho escuro/Avariado
    } else if (healthPercent < 0.6) {
      this.sprite.tint = 0xffcc88; // Levemente danificado
    } else {
      this.sprite.tint = 0xffffff; // Normal
    }
  }

  private updateHealthBar() {
    this.healthBarFill.clear();
    const barWidth = 40;
    const barHeight = 5;
    const healthRatio = this.health / this.maxHealth;

    // Fundo escuro
    this.healthBarFill.rect(-barWidth / 2, 0, barWidth, barHeight);
    this.healthBarFill.fill({ color: 0x111111, alpha: 0.8 });

    // Cor dinâmica da barra (Verde > Amarelo > Vermelho)
    let fillColor = 0x22c55e;
    if (healthRatio < 0.3) fillColor = 0xef4444;
    else if (healthRatio < 0.6) fillColor = 0xeab308;

    if (healthRatio > 0) {
      this.healthBarFill.rect(
        -barWidth / 2,
        0,
        barWidth * healthRatio,
        barHeight,
      );
      this.healthBarFill.fill({ color: fillColor });
    }
  }

  public update(
    input: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      fire: boolean;
      fireLeft: boolean;
      fireRight: boolean;
    },
    screenWidth: number,
    screenHeight: number,
    delta: number,
    deltaTimeMs: number = 16.66,
  ): FiredProjectileData[] {
    const firedProjectiles: FiredProjectileData[] = [];

    // Atualização de Cooldowns
    if (this.frontCooldownTimer > 0) this.frontCooldownTimer -= deltaTimeMs;
    if (this.sideCooldownTimer > 0) this.sideCooldownTimer -= deltaTimeMs;

    // Rotação
    if (input.left) this.currentRotation -= this.rotationSpeed * delta;
    if (input.right) this.currentRotation += this.rotationSpeed * delta;
    this.container.rotation = this.currentRotation;

    // Aceleração / Ré
    if (input.forward) {
      this.speed += this.acceleration * delta;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    } else if (input.backward) {
      this.speed -= this.acceleration * 0.6 * delta;
      if (this.speed < this.reverseMaxSpeed) this.speed = this.reverseMaxSpeed;
    } else {
      this.speed *= Math.pow(this.friction, delta);
      if (Math.abs(this.speed) < 0.01) this.speed = 0;
    }

    // Movimentação do navio na direção da rotação
    const movementAngle = this.currentRotation + Math.PI / 2;
    this.container.x += Math.cos(movementAngle) * this.speed * delta;
    this.container.y += Math.sin(movementAngle) * this.speed * delta;

    // Restrição aos limites da Arena
    const margin = 32;
    if (this.container.x < margin) this.container.x = margin;
    if (this.container.x > screenWidth - margin)
      this.container.x = screenWidth - margin;
    if (this.container.y < margin) this.container.y = margin;
    if (this.container.y > screenHeight - margin)
      this.container.y = screenHeight - margin;

    // --- Disparo Frontal ---
    if (input.fire && this.frontCooldownTimer <= 0) {
      this.frontCooldownTimer = this.FRONT_COOLDOWN;
      const frontOffset = 25;
      firedProjectiles.push({
        x: this.container.x + Math.cos(movementAngle) * frontOffset,
        y: this.container.y + Math.sin(movementAngle) * frontOffset,
        angle: movementAngle,
        isPlayer: true,
        damage: 25,
        speed: 9,
        lifetime: 120,
      });
    }

    // --- Disparo Lateral Esquerdo (Q) ---
    if (input.fireLeft && this.sideCooldownTimer <= 0) {
      this.sideCooldownTimer = this.SIDE_COOLDOWN;
      const sideAngle = movementAngle - Math.PI / 2;
      const offsets = [-15, 0, 15]; // 3 disparos paralelos ao longo do casco
      offsets.forEach((offset) => {
        firedProjectiles.push({
          x:
            this.container.x +
            Math.cos(movementAngle) * offset +
            Math.cos(sideAngle) * 15,
          y:
            this.container.y +
            Math.sin(movementAngle) * offset +
            Math.sin(sideAngle) * 15,
          angle: sideAngle,
          isPlayer: true,
          damage: 20,
          speed: 8,
          lifetime: 100,
        });
      });
    }

    // --- Disparo Lateral Direito (E) ---
    if (input.fireRight && this.sideCooldownTimer <= 0) {
      this.sideCooldownTimer = this.SIDE_COOLDOWN;
      const sideAngle = movementAngle + Math.PI / 2;
      const offsets = [-15, 0, 15]; // 3 disparos paralelos ao longo do casco
      offsets.forEach((offset) => {
        firedProjectiles.push({
          x:
            this.container.x +
            Math.cos(movementAngle) * offset +
            Math.cos(sideAngle) * 15,
          y:
            this.container.y +
            Math.sin(movementAngle) * offset +
            Math.sin(sideAngle) * 15,
          angle: sideAngle,
          isPlayer: true,
          damage: 20,
          speed: 8,
          lifetime: 100,
        });
      });
    }

    return firedProjectiles;
  }
}
