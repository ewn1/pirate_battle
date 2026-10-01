import { Graphics } from "pixi.js";

export class Projectile {
  public container: Graphics;
  private speed: number = 12;
  private vx: number;
  private vy: number;
  public isDead: boolean = false;

  constructor(startX: number, startY: number, angle: number) {
    this.container = new Graphics();
    // Desenha uma esfera escura para representar a bala de canhão
    this.container.circle(0, 0, 5);
    this.container.fill(0x222222);

    this.container.x = startX;
    this.container.y = startY;

    // Calcula a velocidade vetorial baseada na rotação em que o navio atirou
    // Ajustado com o mesmo offset de rotação da proa (+ Math.PI / 2)
    const fireAngle = angle + Math.PI / 2;
    this.vx = Math.cos(fireAngle) * this.speed;
    this.vy = Math.sin(fireAngle) * this.speed;
  }

  public update(delta: number, screenWidth: number, screenHeight: number) {
    this.container.x += this.vx * delta;
    this.container.y += this.vy * delta;

    // despedaçar o projétil se ele sair dos limites da tela para economizar memória
    if (
      this.container.x < 0 ||
      this.container.x > screenWidth ||
      this.container.y < 0 ||
      this.container.y > screenHeight
    ) {
      this.isDead = true;
    }
  }
}
