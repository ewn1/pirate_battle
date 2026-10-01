import { Application, Assets, Ticker, Sprite } from "pixi.js";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { Enemy } from "../entities/Enemy";
import { EnemySpawner } from "../systems/EnemySpawner";
import { InputManager } from "../utils/InputManager";
import { checkCollision } from "../utils/Collision";

export class GameEngine {
  private app: Application;
  private player: Player | null = null;
  private projectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private enemySpawner: EnemySpawner;
  private inputManager: InputManager;

  private fireCooldown: number = 0;
  private isInitialized = false;
  private isDestroyed = false;

  constructor() {
    this.app = new Application();
    this.inputManager = new InputManager();
    this.enemySpawner = new EnemySpawner(2000);
  }

  public async init(container: HTMLDivElement) {
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x1099bb,
    });

    this.isInitialized = true;

    if (this.isDestroyed) {
      this.app.destroy({ removeView: true });
      return;
    }

    container.appendChild(this.app.canvas);

    await this.loadAssets();

    if (this.isDestroyed) return;

    this.setupScene();
    this.startGameLoop();
  }

  private async loadAssets() {
    try {
      // Carregando navios, navio destruído (ship_21) e efeito oficial de explosão (explosion_1)
      await Assets.load([
        { alias: "player_ship", src: "/assets/png/default/ships/ship_1.png" },
        { alias: "enemy_1", src: "/assets/png/default/ships/ship_2.png" },
        { alias: "enemy_2", src: "/assets/png/default/ships/ship_3.png" },
        { alias: "enemy_3", src: "/assets/png/default/ships/ship_4.png" },
        { alias: "enemy_4", src: "/assets/png/default/ships/ship_5.png" },
        {
          alias: "ship_destroyed",
          src: "/assets/png/default/ships/ship_21.png",
        }, //
        {
          alias: "explosion_effect",
          src: "/assets/png/default/effects/explosion_1.png",
        }, //
      ]);
    } catch (error) {
      console.warn(
        "Aviso: Falha ao carregar assets de navios ou efeitos.",
        error,
      );
    }
  }

  private setupScene() {
    this.player = new Player(
      "player_ship",
      this.app.screen.width / 2,
      this.app.screen.height / 2,
    );

    this.app.stage.addChild(this.player.container);
  }

  private startGameLoop() {
    this.app.ticker.add((time: Ticker) => {
      this.update(time.deltaTime);
    });
  }

  private update(delta: number) {
    if (!this.player) return;

    const actions = this.inputManager.getActions();

    // 1. Atualiza o jogador
    this.player.update(
      {
        forward: actions.forward,
        left: actions.left,
        right: actions.right,
      },
      this.app.screen.width,
      this.app.screen.height,
      delta,
    );

    // 2. Disparos do Player
    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }

    if (actions.fire && this.fireCooldown <= 0) {
      this.fireCannon();
      this.fireCooldown = 30;
    }

    // 3. Spawner de Inimigos
    this.enemySpawner.update(
      delta,
      this.app.screen.width,
      this.app.screen.height,
      (x, y) => {
        const enemyModels = ["enemy_1", "enemy_2", "enemy_3", "enemy_4"];
        const randomModel =
          enemyModels[Math.floor(Math.random() * enemyModels.length)];

        const enemy = new Enemy(randomModel, x, y);
        this.enemies.push(enemy);
        this.app.stage.addChild(enemy.container);
      },
    );

    // 4. Atualiza Movimentação dos Inimigos
    for (const enemy of this.enemies) {
      enemy.update(this.player.container.x, this.player.container.y, delta);
    }

    // 5. SISTEMA DE COLISÕES (Projéteis vs Inimigos)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];

        if (!e.isDying && checkCollision(p.container, e.container, 35)) {
          p.isDead = true;
          e.triggerDeath(); // Ativa a troca para o navio cinza/destruído (ship_21)

          // Instancia o sprite oficial de explosão na colisão
          this.createHitEffect(p.container.x, p.container.y);
          break;
        }
      }
    }

    // 6. Atualiza e Limpa Projéteis mortos
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta, this.app.screen.width, this.app.screen.height);

      if (p.isDead) {
        this.app.stage.removeChild(p.container);
        p.container.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // 7. Atualiza e Limpa Inimigos mortos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.isDead) {
        this.app.stage.removeChild(e.container);
        e.container.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  private fireCannon() {
    if (!this.player) return;

    const projectile = new Projectile(
      this.player.container.x,
      this.player.container.y,
      this.player.container.rotation,
    );

    this.projectiles.push(projectile);
    this.app.stage.addChild(projectile.container);
  }

  // Gera o efeito visual utilizando o Sprite oficial da pasta effects
  private createHitEffect(x: number, y: number) {
    const effect = Sprite.from("explosion_effect"); //[cite: 1]
    effect.anchor.set(0.5);
    effect.scale.set(0.4);
    effect.x = x;
    effect.y = y;

    this.app.stage.addChild(effect);

    let life = 15;
    const tickerCallback = (time: Ticker) => {
      life -= time.deltaTime;
      effect.scale.set(0.4 + (15 - life) * 0.02);
      effect.alpha = life / 15;

      if (life <= 0) {
        this.app.stage.removeChild(effect);
        effect.destroy();
        this.app.ticker.remove(tickerCallback);
      }
    };

    this.app.ticker.add(tickerCallback);
  }

  public destroy() {
    this.isDestroyed = true;
    this.inputManager.destroy();

    this.projectiles.forEach((p) => p.container.destroy());
    this.projectiles = [];

    this.enemies.forEach((e) => e.container.destroy());
    this.enemies = [];

    if (this.isInitialized) {
      this.app.destroy({ removeView: true });
    }
  }
}
