import { Application, Assets, Ticker, Sprite, TilingSprite } from "pixi.js";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { Enemy, type EnemyType } from "../entities/Enemy";
import { EnemySpawner } from "../systems/EnemySpawner";
import { InputManager } from "../utils/InputManager";
import { checkCollision } from "../utils/Collision";
import { DEFAULT_GAME_CONFIG, type GameConfig } from "../config/GameConfig";

export interface GameCallbacks {
  onHealthChange?: (health: number, maxHealth: number) => void;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (timeRemaining: number) => void;
  onPauseChange?: (isPaused: boolean) => void;
  onGameOver?: (finalScore: number, survived: boolean) => void;
}

interface InputActions {
  forward: boolean;
  left: boolean;
  right: boolean;
  fire?: boolean;
  fireFrontal?: boolean;
  fireBroadsideLeft?: boolean;
  fireBroadsideRight?: boolean;
}

export class GameEngine {
  private app: Application;
  private player: Player | null = null;
  private playerHealth: number = 100;
  private projectiles: Projectile[] = [];
  private enemyProjectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private enemySpawner: EnemySpawner;
  private inputManager: InputManager;
  private config: GameConfig;
  private callbacks: GameCallbacks;

  private backgroundTile: TilingSprite | null = null;
  private islandSprite: Sprite | null = null;

  private frontalCooldown: number = 0;
  private broadsideLeftCooldown: number = 0;
  private broadsideRightCooldown: number = 0;

  private isInitialized = false;
  private isDestroyed = false;
  private isPaused = false;
  private isGameOver = false;

  private score = 0;
  private timeRemaining = 0;

  private handleBlur: () => void;
  private handleVisibilityChange: () => void;

  constructor(
    config: GameConfig = DEFAULT_GAME_CONFIG,
    callbacks: GameCallbacks = {},
  ) {
    this.app = new Application();
    this.config = config;
    this.callbacks = callbacks;
    this.inputManager = new InputManager();
    this.enemySpawner = new EnemySpawner(config.enemySpawnInterval);
    this.timeRemaining = config.gameDuration;
    this.playerHealth = config.playerMaxHealth;

    this.handleBlur = () => this.pauseGame();
    this.handleVisibilityChange = () => {
      if (document.hidden) this.pauseGame();
    };
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
    this.setupEventListeners();
    this.startGameLoop();

    this.callbacks.onHealthChange?.(
      this.playerHealth,
      this.config.playerMaxHealth,
    );
    this.callbacks.onScoreChange?.(this.score);
    this.callbacks.onTimeChange?.(this.timeRemaining);
  }

  private setupEventListeners() {
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private removeEventListeners() {
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  public pauseGame() {
    if (this.isGameOver || this.isPaused) return;
    this.isPaused = true;
    this.callbacks.onPauseChange?.(true);
  }

  public resumeGame() {
    if (this.isGameOver || !this.isPaused) return;
    this.isPaused = false;
    this.callbacks.onPauseChange?.(false);
  }

  public togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  /**
   * Mapeamento e pré-carregamento dos Assets via Bundle no PixiJS
   */
  private async loadAssets() {
    try {
      const assetsToLoad = [
        // Navios
        { alias: "ship_1", src: "/assets/png/default/ships/ship_1.png" },
        { alias: "ship_2", src: "/assets/png/default/ships/ship_2.png" },
        { alias: "ship_3", src: "/assets/png/default/ships/ship_3.png" },
        { alias: "ship_4", src: "/assets/png/default/ships/ship_4.png" },
        { alias: "ship_5", src: "/assets/png/default/ships/ship_5.png" },
        { alias: "ship_21", src: "/assets/png/default/ships/ship_21.png" },

        // Partes e Efeitos
        {
          alias: "cannon_ball",
          src: "/assets/png/default/ship_parts/cannon_ball.png",
        },
        {
          alias: "explosion_effect",
          src: "/assets/png/default/effects/explosion_1.png",
        },

        // Cenário / Tiles
        { alias: "water_tile", src: "/assets/png/default/tiles/tile_73.png" },
        { alias: "island", src: "/assets/png/default/tiles/tile_16.png" },
      ];

      Assets.addBundle("game-assets", assetsToLoad);
      await Assets.loadBundle("game-assets");
    } catch (error) {
      console.warn(
        "Aviso: Falha ao carregar assets de navios, tiles ou efeitos.",
        error,
      );
    }
  }

  private setupScene() {
    try {
      const waterTexture = Assets.get("water_tile");
      if (waterTexture) {
        this.backgroundTile = new TilingSprite({
          texture: waterTexture,
          width: this.app.screen.width,
          height: this.app.screen.height,
        });
        this.app.stage.addChild(this.backgroundTile);
      }
    } catch (e) {
      console.warn("Textura de fundo não carregada.", e);
    }

    try {
      const islandTexture = Assets.get("island");
      if (islandTexture) {
        this.islandSprite = Sprite.from(islandTexture);
        this.islandSprite.anchor.set(0.5);
        this.islandSprite.x = this.app.screen.width / 2;
        this.islandSprite.y = this.app.screen.height / 2;
        this.app.stage.addChild(this.islandSprite);
      }
    } catch (e) {
      console.warn("Textura de ilha não encontrada.", e);
    }

    // Corrigido: Usando o alias "ship_1" carregado no bundle
    this.player = new Player(
      "ship_1",
      this.app.screen.width / 4,
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
    if (this.isPaused || this.isGameOver || !this.player) return;

    this.updateTimer(delta);

    const actions = this.inputManager.getActions() as InputActions;

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

    if (this.backgroundTile) {
      this.backgroundTile.width = this.app.screen.width;
      this.backgroundTile.height = this.app.screen.height;
    }

    if (this.frontalCooldown > 0) this.frontalCooldown -= delta;
    if (this.broadsideLeftCooldown > 0) this.broadsideLeftCooldown -= delta;
    if (this.broadsideRightCooldown > 0) this.broadsideRightCooldown -= delta;

    const shouldFireFrontal = actions.fireFrontal ?? actions.fire ?? false;
    if (shouldFireFrontal && this.frontalCooldown <= 0) {
      this.fireFrontalCannon();
      this.frontalCooldown = this.config.frontalCooldown;
    }

    if (actions.fireBroadsideLeft && this.broadsideLeftCooldown <= 0) {
      this.fireBroadsideCannon("left");
      this.broadsideLeftCooldown = this.config.broadsideCooldown;
    }

    if (actions.fireBroadsideRight && this.broadsideRightCooldown <= 0) {
      this.fireBroadsideCannon("right");
      this.broadsideRightCooldown = this.config.broadsideCooldown;
    }

    this.enemySpawner.update(
      delta,
      this.app.screen.width,
      this.app.screen.height,
      (x, y) => {
        const isChaser = Math.random() > 0.4;
        const type: EnemyType = isChaser ? "chaser" : "shooter";
        // Corrigido: Mapeado para utilizar os aliases de navios pré-carregados
        const model = isChaser ? "ship_2" : "ship_3";
        const hp = isChaser
          ? this.config.chaserHealth
          : this.config.shooterHealth;

        const enemy = new Enemy(type, model, x, y, hp);
        this.enemies.push(enemy);
        this.app.stage.addChild(enemy.container);
      },
    );

    for (const enemy of this.enemies) {
      enemy.update(
        this.player.container.x,
        this.player.container.y,
        delta,
        (x, y, angle) => this.spawnEnemyProjectile(x, y, angle),
      );
    }

    // Colisão: Projéteis do Jogador vs Inimigos
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];

        if (!e.isDying && checkCollision(p.container, e.container, 35)) {
          p.isDead = true;
          e.takeDamage(25);
          this.createHitEffect(p.container.x, p.container.y);

          if (e.health <= 0 && e.type === "shooter") {
            this.addScore(100);
          }
          break;
        }
      }
    }

    // Colisão: Projéteis dos Inimigos vs Jogador
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];

      if (checkCollision(ep.container, this.player.container, 30)) {
        ep.isDead = true;
        this.damagePlayer(this.config.shooterDamage);
        this.createHitEffect(ep.container.x, ep.container.y);
      }
    }

    // Colisão: Inimigos Chaser vs Jogador
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];

      if (
        !e.isDying &&
        checkCollision(e.container, this.player.container, 40)
      ) {
        if (e.type === "chaser") {
          e.triggerDeath();
          this.damagePlayer(this.config.chaserDamage);
          this.createHitEffect(e.container.x, e.container.y);
        }
      }
    }

    // Limpeza de Projéteis do Jogador
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta, this.app.screen.width, this.app.screen.height);

      if (p.isDead) {
        this.app.stage.removeChild(p.container);
        p.container.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // Limpeza de Projéteis Inimigos
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.update(delta, this.app.screen.width, this.app.screen.height);

      if (ep.isDead) {
        this.app.stage.removeChild(ep.container);
        ep.container.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }

    // Limpeza de Inimigos Mortos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.isDead) {
        this.app.stage.removeChild(e.container);
        e.container.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateTimer(delta: number) {
    const secondsPassed = delta / 60;
    this.timeRemaining -= secondsPassed;

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.callbacks.onTimeChange?.(0);
      this.endGame(true);
      return;
    }

    this.callbacks.onTimeChange?.(Math.ceil(this.timeRemaining));
  }

  private addScore(points: number) {
    this.score += points;
    this.callbacks.onScoreChange?.(this.score);
  }

  private damagePlayer(amount: number) {
    if (!this.player) return;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.callbacks.onHealthChange?.(
      this.playerHealth,
      this.config.playerMaxHealth,
    );

    if (this.playerHealth <= 0) {
      this.endGame(false);
    }
  }

  private endGame(survived: boolean) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.callbacks.onGameOver?.(this.score, survived);
  }

  private createProjectileInstance(
    x: number,
    y: number,
    angle: number,
    isEnemy: boolean = false,
  ): Projectile {
    const projectile = new Projectile(x, y, angle);
    (projectile as unknown as { isEnemy: boolean }).isEnemy = isEnemy;
    return projectile;
  }

  private fireFrontalCannon() {
    if (!this.player) return;
    const projectile = this.createProjectileInstance(
      this.player.container.x,
      this.player.container.y,
      this.player.container.rotation,
      false,
    );
    this.projectiles.push(projectile);
    this.app.stage.addChild(projectile.container);
  }

  private fireBroadsideCannon(side: "left" | "right") {
    if (!this.player) return;

    const baseAngle =
      this.player.container.rotation +
      (side === "left" ? -Math.PI / 2 : Math.PI / 2);
    const offsets = [-15, 0, 15];

    offsets.forEach((offset) => {
      const spawnX =
        this.player!.container.x +
        Math.cos(this.player!.container.rotation) * offset;
      const spawnY =
        this.player!.container.y +
        Math.sin(this.player!.container.rotation) * offset;

      const projectile = this.createProjectileInstance(
        spawnX,
        spawnY,
        baseAngle,
        false,
      );
      this.projectiles.push(projectile);
      this.app.stage.addChild(projectile.container);
    });
  }

  private spawnEnemyProjectile(x: number, y: number, angle: number) {
    const projectile = this.createProjectileInstance(x, y, angle, true);
    this.enemyProjectiles.push(projectile);
    this.app.stage.addChild(projectile.container);
  }

  private createHitEffect(x: number, y: number) {
    try {
      const effect = Sprite.from("explosion_effect");
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
    } catch (e) {
      console.warn("Efeito de explosão indisponível.", e);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.removeEventListeners();
    this.inputManager.destroy();

    this.projectiles.forEach((p) => p.container.destroy());
    this.projectiles = [];

    this.enemyProjectiles.forEach((ep) => ep.container.destroy());
    this.enemyProjectiles = [];

    this.enemies.forEach((e) => e.container.destroy());
    this.enemies = [];

    if (this.isInitialized) {
      this.app.destroy({ removeView: true });
    }
  }
}
