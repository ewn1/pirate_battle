/**
 * [ASSET MANIFEST]
 * Single list of every texture the match needs, plus the loader.
 * Textures live in Pixi's global `Assets` cache, so restarting a match reuses
 * them instead of downloading/decoding again.
 */
import { Assets, Texture } from "pixi.js";

const BASE = "/assets/png/default";

/** Ship colour slots: 1 = player (white), 2 = chaser (black), 3 = shooter (red). */
const SHIP_COLORS = [1, 2, 3];

/**
 * The ship sheet has 6 colours x 4 damage states:
 *   ship_N      healthy
 *   ship_N+6    slightly damaged
 *   ship_N+12   heavily damaged
 *   ship_N+18   destroyed (sunk)
 */
const shipAssets = SHIP_COLORS.flatMap((color) =>
  [0, 6, 12, 18].map((offset) => ({
    alias: `ship_${color + offset}`,
    src: `${BASE}/ships/ship_${color + offset}.png`,
  })),
);

const ISLAND_TILE_IDS = [1, 2, 3, 33, 34, 35, 6, 7, 9, 22, 24, 25, 54, 55, 57, 77, 78, 93, 94];

const islandAssets = ISLAND_TILE_IDS.map((id) => ({
  alias: `tile_${id}`,
  src: `${BASE}/tiles/tile_${id}.png`,
}));

export const GAME_ASSETS = [
  ...shipAssets,
  ...islandAssets,
  { alias: "water_tile", src: `${BASE}/tiles/tile_73.png` },
  { alias: "cannon_ball", src: `${BASE}/ship_parts/cannon_ball.png` },
  { alias: "explosion_1", src: `${BASE}/effects/explosion_1.png` },
  { alias: "explosion_2", src: `${BASE}/effects/explosion_2.png` },
  { alias: "explosion_3", src: `${BASE}/effects/explosion_3.png` },
  { alias: "fire_1", src: `${BASE}/effects/fire_1.png` },
  { alias: "fire_2", src: `${BASE}/effects/fire_2.png` },
];

const BUNDLE_ID = "game-assets";
let bundleRegistered = false;
/** True after a failed load: the next attempt must start from a clean state. */
let lastLoadFailed = false;

export class AssetLoadError extends Error {
  public readonly missing: string[];

  constructor(message: string, missing: string[]) {
    super(message);
    this.name = "AssetLoadError";
    this.missing = missing;
  }
}

/**
 * Loads every texture of the match. Rejects with AssetLoadError if anything
 * is missing so the UI can show a retry button BEFORE combat starts.
 */
export async function loadGameAssets(
  onProgress?: (ratio: number) => void,
): Promise<void> {
  if (!bundleRegistered) {
    Assets.addBundle(BUNDLE_ID, GAME_ASSETS);
    bundleRegistered = true;
  }

  if (lastLoadFailed) {
    // Drop partially loaded textures so a retry really re-requests them.
    try {
      await Assets.unloadBundle(BUNDLE_ID);
    } catch {
      /* nothing to unload */
    }
  }

  try {
    await Assets.loadBundle(BUNDLE_ID, (progress: number) =>
      onProgress?.(progress),
    );
  } catch (error) {
    lastLoadFailed = true;
    throw new AssetLoadError(
      error instanceof Error ? error.message : "Failed to load game assets.",
      GAME_ASSETS.filter((a) => !Assets.cache.has(a.alias)).map((a) => a.alias),
    );
  }

  // Some Pixi versions resolve even if a single file failed: verify explicitly.
  const missing = GAME_ASSETS.filter((a) => !Assets.cache.has(a.alias)).map(
    (a) => a.alias,
  );
  if (missing.length > 0) {
    lastLoadFailed = true;
    throw new AssetLoadError(
      `Missing textures: ${missing.join(", ")}`,
      missing,
    );
  }
  lastLoadFailed = false;
  onProgress?.(1);
}

/** Safe texture lookup: never throws, falls back to an empty texture. */
export function getTexture(alias: string): Texture {
  return Assets.cache.has(alias) ? (Assets.get(alias) as Texture) : Texture.EMPTY;
}
