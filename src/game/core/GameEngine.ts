/**
 * [GAME ENGINE]
 * Owns one match from asset loading to game over.
 *
 * Responsibilities (kept deliberately separate):
 *   - SIMULATION : fixed 1/60 s steps -> movement, combat, spawns, scoring.
 *                  Time-based, so results do not depend on the frame rate.
 *   - RENDERING  : entities push their state into Pixi views once per frame.
 *   - INPUT      : InputManager (keyboard + touch) -> ActionState.
 *   - UI SYNC    : discrete callbacks (only when a value changes) so React
 *                  never re-renders on every frame.
 *
 * Lifecycle: `new GameEngine()` -> `init(container)` -> (running/paused) ->
 * `destroy()`. `destroy()` is safe at any point (React Strict Mode mounts,
 * unmounts and re-mounts effects) and releases ticker, listeners, entities
 * and the Pixi application. Textures stay in Pixi's shared cache.
 */
import {
  Application,
  Container,
  Graphics,
  Sprite,
  TilingSprite,
  type Ticker,
} from "pixi.js";
import type { ConfigSnapshot, GameConfig } from "../config/GameConfig";
import { Enemy, type EnemyType } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Projectile, type ProjectileSpec } from "../entities/Projectile";
import { EffectsSystem } from "../systems/EffectsSystem";
import { EnemySpawner } from "../systems/EnemySpawner";
import {
  circlesOverlap,
  resolveIslandCollision,
  type Circle,
} from "../utils/Collision";
import { InputManager, type GameAction } from "../utils/InputManager";
import { generateId, Rng } from "../utils/Random";
import { PerfProbe } from "../testing/perfProbe";
import { registerTestApi, unregisterTestApi } from "../testing/testHooks";
import { soundManager } from "../../services/audio/SoundManager";
import { runtimeParams } from "../../services/runtimeParams";
import { getTexture, loadGameAssets } from "./assetManifest";
import type {
  EndReason,
  EngineStatus,
  MatchResult,
  PauseReason,
} from "./types";

/* -------------------------------------------------------------------------- */
/* [CONSTANTS]                                                                */
/* -------------------------------------------------------------------------- */

/** Fixed simulation step (s). */
const FIXED_STEP = 1 / 60;
/** Frames longer than this are clamped (tab was throttled, debugger, etc.). */
const MAX_FRAME_DT = 0.25;
/** Safety valve against the "spiral of death". */
const MAX_STEPS_PER_FRAME = 8;
const LOW_HEALTH_RATIO = 0.25;
const TIME_WARNING_SECONDS = 10;
const AUDIO_PRELOAD_TIMEOUT_MS = 4000;

/** Islands in logical arena coordinates (the arena is 1280x720). */
interface IslandDefinition extends Circle {
  /** Tile aliases laid out in a grid, centred on the island. */
  grid: string[][];
}

const ISLANDS: IslandDefinition[] = [
  {
    x: 640,
    y: 210,
    radius: 78,
    grid: [
      ["tile_1", "tile_2", "tile_3"],
      ["tile_33", "tile_34", "tile_35"],
    ],
  },
  {
    x: 1000,
    y: 445,
    radius: 95,
    grid: [
      ["tile_6", "tile_7", "tile_9"],
      ["tile_22", "tile_24", "tile_25"],
      ["tile_54", "tile_55", "tile_57"],
    ],
  },
  {
    x: 486,
    y: 590,
    radius: 62,
    grid: [
      ["tile_77", "tile_78"],
      ["tile_93", "tile_94"],
    ],
  },
];

const TILE_SIZE = 64;
const PLAYER_START = { x: 240, y: 360 };

/* -------------------------------------------------------------------------- */
/* [PUBLIC TYPES]                                                             */
/* -------------------------------------------------------------------------- */

/** Discrete notifications for the React layer (never fired per frame). */
export interface GameCallbacks {
  onLoadProgress?: (ratio: number) => void;
  onHealthChange?: (health: number, maxHealth: number) => void;
  onScoreChange?: (score: number) => void;
  /** Whole seconds remaining; fires only when the displayed value changes. */
  onTimeChange?: (secondsRemaining: number) => void;
  onPauseChange?: (paused: boolean, reason: PauseReason | null) => void;
  onGameOver?: (result: MatchResult) => void;
}

export interface EngineOptions {
  /** Immutable snapshot of the configuration for THIS match. */
  config: GameConfig;
  seed: number;
  callbacks?: GameCallbacks;
  /** Disconnect the ticker from the simulation (tests drive time via step()). */
  manualClock?: boolean;
}

/** Plain-JSON view of the simulation, used by tests and debugging. */
export interface EngineSnapshot {
  status: EngineStatus;
  seed: number;
  matchId: string;
  timeRemaining: number;
  elapsed: number;
  score: number;
  arena: { width: number; height: number };
  islands: Circle[];
  player: {
    x: number;
    y: number;
    heading: number;
    speed: number;
    health: number;
    maxHealth: number;
    cooldowns: { front: number; left: number; right: number };
  };
  enemies: Array<{
    id: number;
    type: EnemyType;
    x: number;
    y: number;
    health: number;
    alive: boolean;
  }>;
  projectiles: { player: number; enemy: number };
  counts: { enemiesAlive: number; effects: number; spawned: number };
  result: MatchResult | null;
}

/* -------------------------------------------------------------------------- */
/* [ENGINE]                                                                   */
/* -------------------------------------------------------------------------- */

export class GameEngine {
  private readonly config: GameConfig;
  private readonly seed: number;
  private readonly callbacks: GameCallbacks;
  private readonly manualClock: boolean;
  private readonly matchId = generateId();
  private readonly rng: Rng;

  private readonly app = new Application();
  private appReady = false;
  private destroyed = false;
  private status: EngineStatus = "loading";

  /* Scene graph */
  private readonly world = new Container();
  private readonly shipLayer = new Container();
  private readonly projectileLayer = new Container();
  private readonly effects = new EffectsSystem();
  private worldOrigin = { x: 0, y: 0 };

  /* Simulation state */
  private readonly input = new InputManager();
  private spawner: EnemySpawner;
  private player: Player | null = null;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private islands: Circle[] = [];
  private nextEntityId = 1;
  private accumulator = 0;
  private stepCount = 0;
  private elapsed = 0;
  private timeRemaining: number;
  private score = 0;
  private kills = 0;
  private pendingEnd: EndReason | null = null;
  private result: MatchResult | null = null;

  /* UI sync bookkeeping */
  private lastEmittedSecond = -1;
  private timeWarningPlayed = false;
  private lowHealthPlayed = false;
  private cameraShake = 0;

  /* Optional profiling */
  private readonly perf = runtimeParams.perf ? new PerfProbe() : null;

  constructor(options: EngineOptions) {
    this.config = options.config;
    this.seed = options.seed;
    this.callbacks = options.callbacks ?? {};
    this.manualClock = options.manualClock ?? false;
    this.rng = new Rng(options.seed);
    this.spawner = new EnemySpawner(this.config, this.rng);
    this.timeRemaining = this.config.gameDuration;
  }

  /* ------------------------------------------------------------------------ */
  /* [LIFECYCLE]                                                              */
  /* ------------------------------------------------------------------------ */

  /**
   * Creates the Pixi app, loads every asset (reporting progress) and starts
   * the match. Rejects if assets fail so the UI can offer a retry; call
   * `destroy()` before creating a new engine.
   */
  public async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: container,
      background: 0x0a2a43,
      antialias: true,
      // Cap the density: 3x phones do not need 3x pixels for this art style.
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    // destroy() ran while Pixi was still initialising (Strict Mode).
    if (this.destroyed) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }
    this.appReady = true;

    const canvas = this.app.canvas;
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    // Textures are required; audio is best effort and never blocks the match.
    await Promise.all([
      loadGameAssets((ratio) => this.callbacks.onLoadProgress?.(ratio)),
      Promise.race([
        soundManager.preload(),
        new Promise<void>((resolve) =>
          setTimeout(resolve, AUDIO_PRELOAD_TIMEOUT_MS),
        ),
      ]),
    ]);
    if (this.destroyed) return;

    this.buildScene();
    this.layout();
    this.app.renderer.on("resize", this.layout);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("visibilitychange", this.handleVisibility);

    this.status = "running";
    this.input.setEnabled(true);
    this.app.ticker.add(this.onTick);

    soundManager.play("game_start");
    this.startAudioLoops();

    if (runtimeParams.e2e) registerTestApi(this);
    if (this.perf) {
      const probe = this.perf;
      window.__PIRATE_PERF__ = {
        reset: () => probe.reset(),
        getReport: () => probe.report(),
      };
    }

    this.emitInitialState();
  }

  /** Releases everything. Idempotent and safe at any lifecycle point. */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.status = "destroyed";

    unregisterTestApi();
    if (window.__PIRATE_PERF__) delete window.__PIRATE_PERF__;

    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.input.destroy();
    soundManager.stopAllLoops();

    if (this.appReady) {
      this.appReady = false;
      this.app.ticker.remove(this.onTick);
      this.app.renderer.off("resize", this.layout);
      this.effects.clear();
      this.enemies = [];
      this.projectiles = [];
      this.player = null;
      // Destroys the whole scene graph; shared textures stay cached.
      this.app.destroy({ removeView: true }, { children: true });
    }
  }

  /* ------------------------------------------------------------------------ */
  /* [PAUSE]                                                                  */
  /* ------------------------------------------------------------------------ */

  public pause(reason: PauseReason = "manual"): void {
    if (this.status !== "running") return;
    this.status = "paused";
    this.input.setEnabled(false); // clears held keys/buttons
    soundManager.stopAllLoops();
    soundManager.play("game_pause");
    this.callbacks.onPauseChange?.(true, reason);
  }

  /** Only called from an explicit player action (button / key). */
  public resume(): void {
    if (this.status !== "paused") return;
    this.status = "running";
    this.accumulator = 0; // never "catch up" the paused period
    this.input.reset();
    this.input.setEnabled(true);
    soundManager.play("game_resume");
    this.startAudioLoops();
    this.callbacks.onPauseChange?.(false, null);
  }

  public togglePause(): void {
    if (this.status === "paused") this.resume();
    else this.pause("manual");
  }

  /** Touch controls forward their presses here. */
  public setVirtualInput(action: GameAction, pressed: boolean): void {
    this.input.setVirtual(action, pressed);
  }

  public getStatus(): EngineStatus {
    return this.status;
  }

  private handleBlur = () => this.pause("blur");

  private handleVisibility = () => {
    if (document.hidden) this.pause("hidden");
  };

  /* ------------------------------------------------------------------------ */
  /* [SCENE]                                                                  */
  /* ------------------------------------------------------------------------ */

  private buildScene() {
    const { width, height } = this.config.arena;

    // Clip everything to the arena rectangle (letterboxing outside it).
    const mask = new Graphics().rect(0, 0, width, height).fill(0xffffff);
    this.world.addChild(mask);
    this.world.mask = mask;

    const water = new TilingSprite({
      texture: getTexture("water_tile"),
      width,
      height,
    });
    this.world.addChild(water);

    const islandLayer = new Container();
    this.world.addChild(islandLayer);
    for (const island of ISLANDS) {
      islandLayer.addChild(this.buildIsland(island));
      this.islands.push({ x: island.x, y: island.y, radius: island.radius });
    }

    this.world.addChild(this.shipLayer, this.projectileLayer, this.effects.layer);
    this.app.stage.addChild(this.world);

    this.player = new Player(
      this.nextEntityId++,
      this.config,
      PLAYER_START.x,
      PLAYER_START.y,
    );
    this.shipLayer.addChild(this.player.visual.view);
  }

  private buildIsland(def: IslandDefinition): Container {
    const group = new Container();
    group.position.set(def.x, def.y);

    const rows = def.grid.length;
    const cols = def.grid[0].length;
    const startX = -(cols * TILE_SIZE) / 2 + TILE_SIZE / 2;
    const startY = -(rows * TILE_SIZE) / 2 + TILE_SIZE / 2;

    def.grid.forEach((row, rowIndex) => {
      row.forEach((alias, colIndex) => {
        const tile = new Sprite(getTexture(alias));
        tile.anchor.set(0.5);
        tile.width = TILE_SIZE;
        tile.height = TILE_SIZE;
        tile.position.set(startX + colIndex * TILE_SIZE, startY + rowIndex * TILE_SIZE);
        group.addChild(tile);
      });
    });
    return group;
  }

  /** Scales the fixed arena to fit the screen, preserving its proportions. */
  private layout = () => {
    if (!this.appReady) return;
    const { width, height } = this.config.arena;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;
    const scale = Math.min(screenW / width, screenH / height);
    this.world.scale.set(scale);
    this.worldOrigin = {
      x: (screenW - width * scale) / 2,
      y: (screenH - height * scale) / 2,
    };
    this.world.position.set(this.worldOrigin.x, this.worldOrigin.y);
  };

  /* ------------------------------------------------------------------------ */
  /* [MAIN LOOP]                                                              */
  /* ------------------------------------------------------------------------ */

  private onTick = (ticker: Ticker) => {
    const frameSeconds = ticker.deltaMS / 1000;

    if (!this.manualClock) {
      this.advance(Math.min(frameSeconds, MAX_FRAME_DT));
    }
    this.render(this.manualClock ? 0 : frameSeconds);

    if (this.perf && this.status === "running") {
      this.perf.record(ticker.deltaMS, this.countEntities());
    }
  };

  /** Test hook: advances the simulation by `ms` in fixed steps. */
  public step(ms: number): void {
    this.advance(ms / 1000, Number.POSITIVE_INFINITY);
    this.render(ms / 1000);
  }

  public isManualClock(): boolean {
    return this.manualClock;
  }

  /** Consumes `dt` seconds using fixed simulation steps. */
  private advance(dt: number, maxSteps = MAX_STEPS_PER_FRAME) {
    if (this.status !== "running") return;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP - 1e-9 && steps < maxSteps) {
      this.simulate(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps++;
      if (this.status !== "running") break;
    }
    if (steps >= maxSteps) this.accumulator = 0;
  }

  /* ------------------------------------------------------------------------ */
  /* [SIMULATION STEP]                                                        */
  /* ------------------------------------------------------------------------ */

  private simulate(dt: number) {
    const player = this.player;
    if (!player) return;

    this.stepCount++;
    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.config.gameDuration - this.elapsed);

    /* 1. Player: movement, island/arena limits, weapons */
    const actions = this.input.getActions();
    player.update(dt, actions);
    this.resolveIslands(player);
    for (const spec of player.collectShots(actions)) this.spawnProjectile(spec);
    this.updateSailingSound(player);

    /* 2. Spawns */
    const alive = this.enemies.filter((e) => e.alive);
    const request = this.spawner.update(dt, {
      playerX: player.x,
      playerY: player.y,
      aliveEnemies: alive,
      islands: this.islands,
    });
    if (request) this.spawnEnemy(request.type, request.x, request.y);

    /* 3. Enemies: AI, island limits, shooting, Chaser impact */
    for (const enemy of this.enemies) {
      const shot = enemy.update(dt, {
        playerX: player.x,
        playerY: player.y,
        islands: this.islands,
        arena: this.config.arena,
      });
      if (shot) this.spawnProjectile(shot);
      if (!enemy.alive) continue;

      this.resolveIslands(enemy);
      if (enemy.type === "chaser" && circlesOverlap(enemy, player)) {
        this.chaserImpact(enemy);
      }
    }

    /* 4. Projectiles: movement and collisions */
    this.updateProjectiles(dt);

    /* 5. Cleanup of dead entities */
    this.cleanup();

    /* 6. Effects + camera shake (frozen while paused, driven by sim time) */
    this.effects.update(dt);
    this.cameraShake = Math.max(0, this.cameraShake - dt);

    /* 7. End conditions and UI notifications */
    this.emitTime();
    if (player.health <= 0) this.pendingEnd = "player_sunk";
    else if (this.timeRemaining <= 0) this.pendingEnd ??= "time_expired";
    if (this.pendingEnd) this.endMatch(this.pendingEnd);
  }

  private updateProjectiles(dt: number) {
    const player = this.player;
    if (!player) return;
    const { width, height } = this.config.arena;

    for (const projectile of this.projectiles) {
      projectile.update(dt);
      if (projectile.consumed) continue;

      // Islands block every projectile.
      const hitIsland = this.islands.some((island) =>
        circlesOverlap(projectile, island),
      );
      if (hitIsland) {
        projectile.consume();
        this.effects.splash(projectile.x, projectile.y);
        this.playWaterHit(projectile, 0.35);
        continue;
      }

      if (projectile.owner === "player") {
        for (const enemy of this.enemies) {
          if (!enemy.alive || !circlesOverlap(projectile, enemy)) continue;
          projectile.consume(); // damage is applied exactly once
          this.damageEnemy(enemy, projectile);
          break;
        }
      } else if (circlesOverlap(projectile, player)) {
        projectile.consume();
        this.effects.hit(projectile.x, projectile.y);
        soundManager.playRandom(["ship_wood_hit_1", "ship_wood_hit_2"]);
        this.damagePlayer(projectile.damage);
      }

      // Expired in the water (not consumed): small splash feedback.
      if (!projectile.consumed && projectile.expired) {
        if (!projectile.isOutside(width, height, 0)) {
          this.effects.splash(projectile.x, projectile.y);
        }
        this.playWaterHit(projectile, 0.2);
      }
    }
  }

  private damageEnemy(enemy: Enemy, projectile: Projectile) {
    if (this.pendingEnd) return;
    enemy.takeDamage(projectile.damage);
    this.effects.hit(projectile.x, projectile.y);
    this.effects.damageNumber(enemy.x, enemy.y, projectile.damage, 0xffd166);
    soundManager.playRandom(["ship_wood_hit_1", "ship_wood_hit_2"], {
      throttleMs: 40,
    });

    if (enemy.health <= 0) this.destroyEnemy(enemy, true);
  }

  /** A Chaser reached the player: damages it and explodes (no score). */
  private chaserImpact(enemy: Enemy) {
    this.destroyEnemy(enemy, false);
    soundManager.play("ship_collision");
    this.damagePlayer(this.config.chaser.contactDamage);
  }

  /**
   * Removes an enemy from the simulation immediately (no damage, shots or
   * collisions afterwards). Only enemies destroyed by the player's attacks
   * score; a Chaser blowing itself up on the player does not.
   */
  private destroyEnemy(enemy: Enemy, byPlayer: boolean) {
    if (!enemy.alive) return;
    enemy.destroyShip();
    this.effects.explosion(enemy.x, enemy.y, enemy.type === "shooter" ? 1.15 : 0.95);
    soundManager.playRandom(["ship_explosion_1", "ship_explosion_2"]);

    if (byPlayer && !this.pendingEnd) {
      this.kills++;
      this.score++;
      soundManager.play("score_point");
      this.callbacks.onScoreChange?.(this.score);
    }
  }

  private damagePlayer(amount: number) {
    const player = this.player;
    if (!player || this.pendingEnd) return;

    player.takeDamage(amount);
    this.effects.damageNumber(player.x, player.y, amount, 0xff6b6b);
    this.cameraShake = 0.22;
    this.callbacks.onHealthChange?.(player.health, player.maxHealth);

    const ratio = player.health / player.maxHealth;
    if (ratio <= LOW_HEALTH_RATIO && ratio > 0 && !this.lowHealthPlayed) {
      this.lowHealthPlayed = true;
      soundManager.play("health_low");
    }
    if (player.health <= 0) this.pendingEnd = "player_sunk";
  }

  /* ------------------------------------------------------------------------ */
  /* [ENTITY HELPERS]                                                         */
  /* ------------------------------------------------------------------------ */

  private spawnProjectile(spec: ProjectileSpec) {
    const projectile = new Projectile(this.nextEntityId++, spec);
    this.projectiles.push(projectile);
    this.projectileLayer.addChild(projectile.view);

    this.effects.muzzleFlash(spec.x, spec.y);
    if (spec.weapon === "front") {
      soundManager.playRandom(
        ["cannon_fire_1", "cannon_fire_2", "cannon_fire_3"],
        { throttleMs: 60 },
      );
    } else if (spec.weapon === "broadside") {
      soundManager.play("cannon_broadside", { throttleMs: 120 });
    } else {
      soundManager.play("cannon_fire_2", { volume: 0.4, throttleMs: 60 });
    }
  }

  private spawnEnemy(type: EnemyType, x: number, y: number): Enemy {
    const player = this.player;
    const heading = player ? Math.atan2(player.y - y, player.x - x) : 0;
    const enemy = new Enemy(this.nextEntityId++, type, this.config, x, y, heading);
    this.enemies.push(enemy);
    this.shipLayer.addChild(enemy.visual.view);
    return enemy;
  }

  private resolveIslands(entity: { x: number; y: number; radius: number }) {
    for (const island of this.islands) {
      if (resolveIslandCollision(entity, island) && entity instanceof Player) {
        entity.speed *= 0.3;
      }
    }
  }

  private cleanup() {
    const { width, height } = this.config.arena;

    this.projectiles = this.projectiles.filter((projectile) => {
      const remove =
        projectile.consumed ||
        projectile.expired ||
        projectile.isOutside(width, height);
      if (remove) projectile.destroy();
      return !remove;
    });

    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.removable) enemy.destroy();
      return !enemy.removable;
    });
  }

  /* ------------------------------------------------------------------------ */
  /* [RENDER]                                                                 */
  /* ------------------------------------------------------------------------ */

  /** Pushes the simulation state into Pixi. `dt` drives visual-only animation. */
  private render(dt: number) {
    const player = this.player;
    if (!player) return;

    player.syncView(dt);
    for (const enemy of this.enemies) enemy.syncView(dt);
    for (const projectile of this.projectiles) projectile.syncView();

    // Camera shake offsets the whole world for a few frames after a hit.
    const shake = this.cameraShake > 0 ? this.cameraShake * 30 : 0;
    this.world.position.set(
      this.worldOrigin.x + (shake ? (Math.random() - 0.5) * shake : 0),
      this.worldOrigin.y + (shake ? (Math.random() - 0.5) * shake : 0),
    );
  }

  /* ------------------------------------------------------------------------ */
  /* [UI NOTIFICATIONS & AUDIO CUES]                                          */
  /* ------------------------------------------------------------------------ */

  private emitInitialState() {
    const player = this.player;
    if (!player) return;
    this.callbacks.onHealthChange?.(player.health, player.maxHealth);
    this.callbacks.onScoreChange?.(this.score);
    this.emitTime();
  }

  /** Notifies React only when the displayed whole second changes. */
  private emitTime() {
    const seconds = Math.ceil(this.timeRemaining);
    if (seconds === this.lastEmittedSecond) return;
    this.lastEmittedSecond = seconds;
    this.callbacks.onTimeChange?.(seconds);

    if (
      seconds === TIME_WARNING_SECONDS &&
      !this.timeWarningPlayed &&
      this.config.gameDuration > TIME_WARNING_SECONDS
    ) {
      this.timeWarningPlayed = true;
      soundManager.play("time_warning");
    }
  }

  private startAudioLoops() {
    soundManager.startLoop("ocean_ambience_loop", 0.25);
    soundManager.startLoop("ship_sailing_loop", 0);
  }

  /** Sailing loop volume follows the ship speed (updated a few times/second). */
  private updateSailingSound(player: Player) {
    if (this.stepCount % 6 !== 0) return;
    const ratio = Math.min(1, Math.abs(player.speed) / this.config.player.maxSpeed);
    soundManager.setLoopVolume("ship_sailing_loop", ratio * 0.45);
  }

  private playWaterHit(projectile: Projectile, volume: number) {
    // Enemy shots that miss are frequent: only the player's feed back loudly.
    soundManager.playRandom(["cannonball_water_hit_1", "cannonball_water_hit_2"], {
      volume: projectile.owner === "player" ? volume : volume * 0.5,
      throttleMs: 80,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* [MATCH END]                                                              */
  /* ------------------------------------------------------------------------ */

  private endMatch(reason: EndReason) {
    if (this.status === "over" || this.status === "destroyed") return;
    this.status = "over";
    this.input.setEnabled(false);
    soundManager.stopAllLoops();

    if (reason === "player_sunk") {
      soundManager.play("ship_sinking");
      soundManager.play("game_over", { volume: 0.8 });
    } else {
      soundManager.play("game_complete");
    }

    const snapshot: ConfigSnapshot = {
      sessionTimeSec: this.config.gameDuration,
      spawnIntervalMs: Math.round(this.config.spawn.intervalSec * 1000),
    };
    this.result = {
      matchId: this.matchId,
      reason,
      score: this.score,
      durationSeconds:
        reason === "time_expired"
          ? this.config.gameDuration
          : Math.round(this.elapsed * 10) / 10,
      kills: this.kills,
      endedAt: new Date().toISOString(),
      config: snapshot,
    };
    this.callbacks.onGameOver?.(this.result);
  }

  /* ------------------------------------------------------------------------ */
  /* [TEST / DEBUG API]                                                       */
  /* ------------------------------------------------------------------------ */

  public getSnapshot(): EngineSnapshot {
    const player = this.player;
    const zeroPlayer = {
      x: 0,
      y: 0,
      heading: 0,
      speed: 0,
      health: 0,
      maxHealth: this.config.player.maxHealth,
      cooldowns: { front: 0, left: 0, right: 0 },
    };

    return {
      status: this.status,
      seed: this.seed,
      matchId: this.matchId,
      timeRemaining: Number(this.timeRemaining.toFixed(3)),
      elapsed: Number(this.elapsed.toFixed(3)),
      score: this.score,
      arena: { ...this.config.arena },
      islands: this.islands.map((island) => ({ ...island })),
      player: player
        ? {
            x: player.x,
            y: player.y,
            heading: player.heading,
            speed: player.speed,
            health: player.health,
            maxHealth: player.maxHealth,
            cooldowns: { ...player.cooldowns },
          }
        : zeroPlayer,
      enemies: this.enemies.map((enemy) => ({
        id: enemy.id,
        type: enemy.type,
        x: enemy.x,
        y: enemy.y,
        health: enemy.health,
        alive: enemy.alive,
      })),
      projectiles: {
        player: this.projectiles.filter((p) => p.owner === "player").length,
        enemy: this.projectiles.filter((p) => p.owner === "enemy").length,
      },
      counts: {
        enemiesAlive: this.enemies.filter((e) => e.alive).length,
        effects: this.effects.activeCount,
        spawned: this.spawner.totalSpawned,
      },
      result: this.result,
    };
  }

  public debugSpawnEnemy(type: EnemyType, x: number, y: number): number {
    return this.spawnEnemy(type, x, y).id;
  }

  public debugTeleportPlayer(x: number, y: number, heading?: number): void {
    if (!this.player) return;
    this.player.x = x;
    this.player.y = y;
    this.player.speed = 0;
    if (heading !== undefined) this.player.heading = heading;
  }

  public debugSetPlayerHealth(health: number): void {
    const player = this.player;
    if (!player) return;
    player.health = Math.max(0, Math.min(player.maxHealth, health));
    this.callbacks.onHealthChange?.(player.health, player.maxHealth);
  }

  private countEntities(): number {
    return (
      1 +
      this.enemies.length +
      this.projectiles.length +
      this.effects.activeCount
    );
  }
}
