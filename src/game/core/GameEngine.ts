import {
  Application,
  Assets,
  Ticker,
  Sprite,
  TilingSprite,
  Container,
} from "pixi.js";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { Enemy, type EnemyType } from "../entities/Enemy";
import { EnemySpawner } from "../systems/EnemySpawner";
import { InputManager } from "../utils/InputManager";
import { checkCollision } from "../utils/Collision";
import { DEFAULT_GAME_CONFIG, type GameConfig } from "../config/GameConfig";
import { soundManager } from "../../services/audio/SoundManager";

export interface GameCallbacks {
  onHealthChange?: (health: number, maxHealth: number) => void;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (timeRemaining: number) => void;
  onPauseChange?: (isPaused: boolean) => void;
  onGameOver?: (finalScore: number, survived: boolean) => void;
}

export interface Island {
  x: number;
  y: number;
  radius: number;
}

interface EntityWithSpeed {
  speed?: number;
}

export function checkIslandCollision(
  entityX: number,
  entityY: number,
  entityRadius: number,
  island: Island,
): boolean {
  const dx = entityX - island.x;
  const dy = entityY - island.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < entityRadius + island.radius;
}

export function resolveIslandCollision(
  ship: { x: number; y: number; speed?: number; radius: number },
  island: Island,
) {
  const dx = ship.x - island.x;
  const dy = ship.y - island.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = ship.radius + island.radius;

  if (distance < minDistance && distance > 0) {
    const overlap = minDistance - distance;
    const nx = dx / distance;
    const ny = dy / distance;

    ship.x += nx * overlap;
    ship.y += ny * overlap;
    if (ship.speed !== undefined) {
      ship.speed = 0;
    }
  }
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
  private islandsData: Island[] = [];
  private islandContainer: Container | null = null;

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
    soundManager.playBGM();
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
    soundManager.stopBGM();
    this.callbacks.onPauseChange?.(true);
  }

  public resumeGame() {
    if (this.isGameOver || !this.isPaused) return;
    this.isPaused = false;
    soundManager.playBGM();
    this.callbacks.onPauseChange?.(false);
  }

  public togglePause() {
    if (this.isPaused) this.resumeGame();
    else this.pauseGame();
  }

  private async loadAssets() {
    try {
      const islandTileIds = [
        1,
        2,
        3,
        33,
        34,
        35, // Ilha Superior (6 tiles)
        6,
        7,
        9,
        22,
        24,
        25,
        54,
        55,
        57, // Ilha Direita (9 tiles)
        77,
        78,
        93,
        94, // Ilha Inferior Esquerda (4 tiles)
      ];

      const islandAssets = islandTileIds.map((id) => ({
        alias: `tile_${id}`,
        src: `/assets/png/default/tiles/tile_${id}.png`,
      }));

      const assetsToLoad = [
        { alias: "ship_1", src: "/assets/png/default/ships/ship_1.png" },
        { alias: "ship_2", src: "/assets/png/default/ships/ship_2.png" },
        { alias: "ship_3", src: "/assets/png/default/ships/ship_3.png" },
        { alias: "ship_4", src: "/assets/png/default/ships/ship_4.png" },
        { alias: "ship_5", src: "/assets/png/default/ships/ship_5.png" },
        { alias: "ship_21", src: "/assets/png/default/ships/ship_21.png" },
        {
          alias: "cannon_ball",
          src: "/assets/png/default/ship_parts/cannon_ball.png",
        },
        {
          alias: "explosion_effect",
          src: "/assets/png/default/effects/explosion_1.png",
        },
        { alias: "water_tile", src: "/assets/png/default/tiles/tile_73.png" },
        ...islandAssets,
      ];

      Assets.addBundle("game-assets", assetsToLoad);
      await Assets.loadBundle("game-assets");
    } catch (error) {
      console.warn("Aviso: Falha ao carregar assets do jogo.", error);
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

    this.islandsData = [];
    this.islandContainer = new Container();
    this.app.stage.addChild(this.islandContainer);

    const sw = this.app.screen.width;
    const sh = this.app.screen.height;

    const tileSize = 64;

    const islandsLayout = [
      {
        x: sw * 0.5,
        y: sh * 0.28,
        radius: 70,
        grid: [
          ["tile_1", "tile_2", "tile_3"],
          ["tile_33", "tile_34", "tile_35"],
        ],
      },
      {
        x: sw * 0.78,
        y: sh * 0.62,
        radius: 95,
        grid: [
          ["tile_6", "tile_7", "tile_9"],
          ["tile_22", "tile_24", "tile_25"],
          ["tile_54", "tile_55", "tile_57"],
        ],
      },
      {
        x: sw * 0.38,
        y: sh * 0.82,
        radius: 55,
        grid: [
          ["tile_77", "tile_78"],
          ["tile_93", "tile_94"],
        ],
      },
    ];

    islandsLayout.forEach((islandDef) => {
      const singleIslandGroup = new Container();
      singleIslandGroup.x = islandDef.x;
      singleIslandGroup.y = islandDef.y;

      const rows = islandDef.grid.length;
      const cols = islandDef.grid[0].length;

      const totalWidth = cols * tileSize;
      const totalHeight = rows * tileSize;

      const startX = -totalWidth / 2 + tileSize / 2;
      const startY = -totalHeight / 2 + tileSize / 2;

      islandDef.grid.forEach((row, rowIndex) => {
        row.forEach((tileAlias, colIndex) => {
          try {
            const texture = Assets.get(tileAlias);
            if (texture) {
              const sprite = Sprite.from(texture);
              sprite.anchor.set(0.5);
              sprite.x = startX + colIndex * tileSize;
              sprite.y = startY + rowIndex * tileSize;
              sprite.width = tileSize;
              sprite.height = tileSize;
              singleIslandGroup.addChild(sprite);
            }
          } catch (e) {
            console.warn(`Erro ao carregar tile: ${tileAlias}`, e);
          }
        });
      });

      this.islandContainer!.addChild(singleIslandGroup);
      this.islandsData.push({
        x: islandDef.x,
        y: islandDef.y,
        radius: islandDef.radius,
      });
    });

    this.player = new Player("ship_1", sw * 0.2, sh * 0.5);
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

    const actions = this.inputManager.getActions();

    this.player.update(
      {
        forward: actions.forward,
        backward: actions.backward,
        left: actions.left,
        right: actions.right,
        fire: false,
        fireLeft: false,
        fireRight: false,
      },
      this.app.screen.width,
      this.app.screen.height,
      delta,
    );

    const playerObj = {
      x: this.player.container.x,
      y: this.player.container.y,
      speed: (this.player as unknown as EntityWithSpeed).speed || 0,
      radius: 22,
    };

    for (const island of this.islandsData) {
      if (
        checkIslandCollision(playerObj.x, playerObj.y, playerObj.radius, island)
      ) {
        resolveIslandCollision(playerObj, island);
        this.player.container.x = playerObj.x;
        this.player.container.y = playerObj.y;
      }
    }

    if (this.backgroundTile) {
      this.backgroundTile.width = this.app.screen.width;
      this.backgroundTile.height = this.app.screen.height;
    }

    const deltaMs = delta * (1000 / 60);

    if (this.frontalCooldown > 0) this.frontalCooldown -= deltaMs;
    if (this.broadsideLeftCooldown > 0) this.broadsideLeftCooldown -= deltaMs;
    if (this.broadsideRightCooldown > 0) this.broadsideRightCooldown -= deltaMs;

    if (actions.fireFrontal && this.frontalCooldown <= 0) {
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

    // [CORREÇÃO DO SPAWN] Passagem de delta em segundos e checagem de limite máximo
    const deltaSeconds = delta / 60;

    this.enemySpawner.update(
      deltaSeconds,
      this.app.screen.width,
      this.app.screen.height,
      this.enemies.length,
      this.config.maxEnemies,
      (x, y) => {
        const isChaser = Math.random() > 0.4;
        const type: EnemyType = isChaser ? "chaser" : "shooter";
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

      const enemyObj = {
        x: enemy.container.x,
        y: enemy.container.y,
        speed: (enemy as unknown as EntityWithSpeed).speed || 0,
        radius: 22,
      };

      for (const island of this.islandsData) {
        if (
          checkIslandCollision(enemyObj.x, enemyObj.y, enemyObj.radius, island)
        ) {
          resolveIslandCollision(enemyObj, island);
          enemy.container.x = enemyObj.x;
          enemy.container.y = enemyObj.y;
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      for (const island of this.islandsData) {
        if (checkIslandCollision(p.container.x, p.container.y, 4, island)) {
          p.isDead = true;
          this.createHitEffect(p.container.x, p.container.y);
          break;
        }
      }
    }

    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      for (const island of this.islandsData) {
        if (checkIslandCollision(ep.container.x, ep.container.y, 4, island)) {
          ep.isDead = true;
          this.createHitEffect(ep.container.x, ep.container.y);
          break;
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (!e.isDying && checkCollision(p.container, e.container, 32)) {
          p.isDead = true;
          e.takeDamage(25);
          soundManager.playSFX("hit");
          this.createHitEffect(p.container.x, p.container.y);

          if (e.health <= 0) {
            soundManager.playSFX("explosion");
            if (e.type === "shooter") {
              this.addScore(100);
            }
          }
          break;
        }
      }
    }

    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      if (checkCollision(ep.container, this.player.container, 28)) {
        ep.isDead = true;
        soundManager.playSFX("hit");
        this.damagePlayer(this.config.shooterDamage);
        this.createHitEffect(ep.container.x, ep.container.y);
      }
    }

    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      if (
        !e.isDying &&
        checkCollision(e.container, this.player.container, 35)
      ) {
        if (e.type === "chaser") {
          e.triggerDeath();
          soundManager.playSFX("explosion");
          this.damagePlayer(this.config.chaserDamage);
          this.createHitEffect(e.container.x, e.container.y);
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta, this.app.screen.width, this.app.screen.height);
      if (p.isDead) {
        this.app.stage.removeChild(p.container);
        p.container.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.update(delta, this.app.screen.width, this.app.screen.height);
      if (ep.isDead) {
        this.app.stage.removeChild(ep.container);
        ep.container.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }

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
    soundManager.stopBGM();
    this.callbacks.onGameOver?.(this.score, survived);
  }

  private fireFrontalCannon() {
    if (!this.player) return;
    soundManager.playSFX("shoot");

    const shipRot = this.player.container.rotation;
    const forwardAngle = shipRot + Math.PI / 2;

    const spawnX = this.player.container.x + Math.cos(forwardAngle) * 25;
    const spawnY = this.player.container.y + Math.sin(forwardAngle) * 25;

    const projectile = new Projectile(spawnX, spawnY, forwardAngle, 10);
    this.projectiles.push(projectile);
    this.app.stage.addChild(projectile.container);
  }

  private fireBroadsideCannon(side: "left" | "right") {
    if (!this.player) return;
    soundManager.playSFX("shoot");

    const shipRot = this.player.container.rotation;
    const forwardAngle = shipRot + Math.PI / 2;

    const sideAngle =
      side === "left" ? forwardAngle - Math.PI / 2 : forwardAngle + Math.PI / 2;

    const sideDistance = 18;
    const sideX = Math.cos(sideAngle) * sideDistance;
    const sideY = Math.sin(sideAngle) * sideDistance;

    const offsets = [-16, 0, 16];

    offsets.forEach((offset) => {
      const spawnX =
        this.player!.container.x + sideX + Math.cos(forwardAngle) * offset;
      const spawnY =
        this.player!.container.y + sideY + Math.sin(forwardAngle) * offset;

      const projectile = new Projectile(spawnX, spawnY, sideAngle, 8.5);
      this.projectiles.push(projectile);
      this.app.stage.addChild(projectile.container);
    });
  }

  private spawnEnemyProjectile(x: number, y: number, angle: number) {
    soundManager.playSFX("shoot");
    const projectile = new Projectile(x, y, angle, 7.5);
    projectile.isEnemy = true;
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
    soundManager.stopBGM();
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
