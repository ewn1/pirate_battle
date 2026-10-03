/**
 * [GAME CONFIG]
 * Every gameplay parameter lives here. Systems read values from a GameConfig
 * instance and never contain balance numbers, so tuning never requires
 * touching the game logic.
 *
 * Units: distances in px (logical arena units), time in seconds,
 * speeds in px/s, angular speeds in rad/s.
 */

/** Documented limits for the two user-facing options. */
export const LIMITS = {
  sessionTimeSec: { min: 60, max: 180 },
  /** Enemy spawn interval limits (stored in ms, shown in seconds). */
  spawnIntervalMs: { min: 500, max: 10000 },
} as const;

export const DEFAULT_SESSION_TIME_SEC = 90;
export const DEFAULT_SPAWN_INTERVAL_MS = 3000;

export interface WeaponConfig {
  damage: number;
  /** Projectile speed (px/s). */
  speed: number;
  /** Projectile lifetime (s). Range = speed * lifetime. */
  lifetime: number;
  /** Minimum time between two shots of this weapon (s). */
  cooldown: number;
}

export interface GameConfig {
  /** Fixed logical arena. The renderer scales it to fit the screen. */
  arena: { width: number; height: number };
  /** Active match duration (s). */
  gameDuration: number;

  spawn: {
    /** Seconds between spawns. */
    intervalSec: number;
    /** Safety cap of simultaneously alive enemies. */
    maxAlive: number;
    /** Relative probability of each enemy type (after the guaranteed first two). */
    weights: { chaser: number; shooter: number };
    /** Minimum distance between a spawn point and the player (px). */
    minDistanceFromPlayer: number;
    /** Margin kept from the arena border (px). */
    edgeMargin: number;
  };

  player: {
    maxHealth: number;
    radius: number;
    maxSpeed: number;
    reverseMaxSpeed: number;
    acceleration: number;
    /** Fraction of speed kept after one second without throttle. */
    dragPerSecond: number;
    rotationSpeed: number;
    frontal: WeaponConfig;
    broadside: WeaponConfig & {
      /** Projectiles per broadside volley (parallel shots). */
      count: number;
      /** Distance between parallel projectiles (px). */
      spacing: number;
    };
  };

  chaser: {
    health: number;
    radius: number;
    speed: number;
    turnRate: number;
    /** Damage dealt to the player on impact (the Chaser then explodes). */
    contactDamage: number;
  };

  shooter: {
    health: number;
    radius: number;
    speed: number;
    turnRate: number;
    /** The Shooter fires when the player is inside this distance. */
    attackRange: number;
    /** The Shooter stops approaching inside this distance. */
    preferredRange: number;
    fireCooldown: number;
    projectile: { damage: number; speed: number; lifetime: number };
  };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  arena: { width: 1280, height: 720 },
  gameDuration: DEFAULT_SESSION_TIME_SEC,

  spawn: {
    intervalSec: DEFAULT_SPAWN_INTERVAL_MS / 1000,
    maxAlive: 12,
    weights: { chaser: 0.5, shooter: 0.5 },
    minDistanceFromPlayer: 380,
    edgeMargin: 60,
  },

  player: {
    maxHealth: 100,
    radius: 22,
    maxSpeed: 270,
    reverseMaxSpeed: 120,
    acceleration: 430,
    dragPerSecond: 0.16,
    rotationSpeed: 2.7,
    frontal: { damage: 25, speed: 540, lifetime: 1.6, cooldown: 0.5 },
    broadside: {
      damage: 20,
      speed: 480,
      lifetime: 1.2,
      cooldown: 1.4,
      count: 3,
      spacing: 16,
    },
  },

  chaser: {
    health: 30,
    radius: 20,
    speed: 135,
    turnRate: 2.2,
    contactDamage: 25,
  },

  shooter: {
    health: 50,
    radius: 22,
    speed: 90,
    turnRate: 1.8,
    attackRange: 300,
    preferredRange: 240,
    fireCooldown: 1.6,
    projectile: { damage: 15, speed: 330, lifetime: 1.8 },
  },
};

/** The two values the player can change in the Options screen. */
export interface ConfigSnapshot {
  sessionTimeSec: number;
  spawnIntervalMs: number;
}

/**
 * Builds the immutable configuration used by ONE match.
 * Called when the match starts, so later option changes only affect new matches.
 */
export function createGameConfig(options: ConfigSnapshot): GameConfig {
  const config = structuredClone(DEFAULT_GAME_CONFIG);
  config.gameDuration = options.sessionTimeSec;
  config.spawn.intervalSec = options.spawnIntervalMs / 1000;
  return deepFreeze(config);
}

function deepFreeze<T extends object>(value: T): T {
  Object.values(value).forEach((child) => {
    if (child && typeof child === "object") deepFreeze(child as object);
  });
  return Object.freeze(value);
}

/** Stable key used to compare ranking entries of the same configuration. */
export function configKey(config: ConfigSnapshot): string {
  return `${config.sessionTimeSec}s-${config.spawnIntervalMs}ms`;
}

export function clampSessionTime(value: number): number {
  return Math.min(
    LIMITS.sessionTimeSec.max,
    Math.max(LIMITS.sessionTimeSec.min, Math.round(value)),
  );
}

export function clampSpawnInterval(valueMs: number): number {
  return Math.min(
    LIMITS.spawnIntervalMs.max,
    Math.max(LIMITS.spawnIntervalMs.min, Math.round(valueMs)),
  );
}
