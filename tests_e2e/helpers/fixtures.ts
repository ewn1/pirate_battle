/**
 * [E2E FIXTURES & HELPERS]
 * Shared by every Playwright spec.
 *
 *  - `test` extends Playwright's test with a console guard: any unexpected
 *    console error / page error fails the test (allow-list via `allowedConsole`).
 *  - Helpers start the game with deterministic flags (manual clock + seed) and
 *    wrap the `window.__PIRATE_TEST__` hook (observe state, advance time, place
 *    entities). Inputs are always real keyboard / pointer events.
 */
import { expect, test as base, type Page } from "@playwright/test";

/* ---------------------------- [STORAGE KEYS] ----------------------------- */
export const KEYS = {
  options: "pirate-battle:options:v1",
  matches: "pirate-battle:matches:v1",
  scenario: "pirate-battle:scenario",
  mockDb: "pirate-battle:mock-db:v1",
  failAssets: "pirate-battle:fail-assets",
} as const;

/* ---------------------------- [CONSOLE GUARD] ---------------------------- */
interface Fixtures {
  /** Regexes of console errors that are EXPECTED in the current test. */
  allowedConsole: RegExp[];
}

export const test = base.extend<Fixtures>({
  allowedConsole: [[], { option: true }],
  page: async ({ page, allowedConsole }, use) => {
    const problems: string[] = [];
    const isAllowed = (text: string) =>
      allowedConsole.some((re) => re.test(text));
    page.on("console", (message) => {
      if (message.type() === "error" && !isAllowed(message.text())) {
        problems.push(`console.error: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      if (!isAllowed(error.message))
        problems.push(`pageerror: ${error.message}`);
    });
    await use(page);
    expect(problems, "unexpected console/page errors").toEqual([]);
  },
});

export { expect };

/* ---------------------------- [TYPES] ------------------------------------ */
export type Snapshot = {
  status: "loading" | "running" | "paused" | "over" | "destroyed";
  timeRemaining: number;
  elapsed: number;
  score: number;
  arena: { width: number; height: number };
  islands: Array<{ x: number; y: number; radius: number }>;
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
    type: string;
    x: number;
    y: number;
    health: number;
    alive: boolean;
  }>;
  projectiles: { player: number; enemy: number };
  counts: { enemiesAlive: number; effects: number; spawned: number };
  result: { reason: string; score: number; durationSeconds: number } | null;
};

declare global {
  interface Window {
    __PIRATE_TEST__?: {
      getSnapshot: () => Snapshot;
      step: (ms: number) => void;
      spawnEnemy: (type: "chaser" | "shooter", x: number, y: number) => number;
      teleportPlayer: (x: number, y: number, heading: number) => void;
      setPlayerHealth: (health: number) => void;
    };
  }
}

/* ---------------------------- [URL / STARTUP] ---------------------------- */
export const FAST_FLAGS = "e2e=1&latencyScale=0&retryDelay=50&apiTimeout=2500";

export function runtimeQuery(
  extra: Record<string, string | number> = {},
): string {
  const extras = Object.entries(extra)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${FAST_FLAGS}${extras ? `&${extras}` : ""}`;
}

/** Writes options into localStorage BEFORE the app loads (first navigation only). */
export async function presetOptions(
  page: Page,
  options: { sessionTimeSec?: number; spawnIntervalMs?: number },
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("__preset_done")) return;
      sessionStorage.setItem("__preset_done", "1");
      localStorage.setItem(
        key as string,
        JSON.stringify({
          state: {
            playerId: "e2e-player",
            playerName: "E2E Captain",
            ...(value as object),
          },
          version: 1,
        }),
      );
    },
    [KEYS.options, options] as const,
  );
}

/** Opens the menu with deterministic flags, clicks Play and waits for "running". */
export async function openGame(
  page: Page,
  extra: Record<string, string | number> = { manual: 1, seed: 7 },
): Promise<void> {
  await page.goto(`/?${runtimeQuery(extra)}`);
  await page.getByTestId("play-button").click();
  await waitForStatus(page, "running");
}

export async function waitForStatus(
  page: Page,
  status: Snapshot["status"],
): Promise<void> {
  await page.waitForFunction(
    (expected) => window.__PIRATE_TEST__?.getSnapshot().status === expected,
    status,
  );
}

/* ---------------------------- [TEST HOOK WRAPPERS] ----------------------- */
export const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(
    () => window.__PIRATE_TEST__!.getSnapshot() as unknown as Snapshot,
  );

export const step = (page: Page, ms: number): Promise<void> =>
  page.evaluate((value) => window.__PIRATE_TEST__!.step(value), ms);

export const spawnEnemy = (
  page: Page,
  type: "chaser" | "shooter",
  x: number,
  y: number,
): Promise<number> =>
  page.evaluate(
    ([t, px, py]) =>
      window.__PIRATE_TEST__!.spawnEnemy(
        t as "chaser" | "shooter",
        px as number,
        py as number,
      ),
    [type, x, y] as const,
  );

export const teleport = (
  page: Page,
  x: number,
  y: number,
  heading = 0,
): Promise<void> =>
  page.evaluate(
    ([px, py, h]) => window.__PIRATE_TEST__!.teleportPlayer(px, py, h),
    [x, y, heading] as const,
  );

export const setHealth = (page: Page, health: number): Promise<void> =>
  page.evaluate(
    (value) => window.__PIRATE_TEST__!.setPlayerHealth(value),
    health,
  );

/** Finds an open-water point (no island within `margin`). */
export async function openWater(
  page: Page,
  margin = 160,
): Promise<{ x: number; y: number }> {
  const snap = await snapshot(page);
  const { width, height } = snap.arena;
  for (let gy = 120; gy < height - 100; gy += 40) {
    for (let gx = 160; gx < width - 160; gx += 40) {
      if (
        snap.islands.every(
          (i) => Math.hypot(i.x - gx, i.y - gy) > i.radius + margin,
        )
      ) {
        return { x: gx, y: gy };
      }
    }
  }
  throw new Error("no open water found");
}

/** Holds a key for `ms` of SIMULATED time (manual clock). */
export async function holdKey(
  page: Page,
  key: string,
  ms: number,
): Promise<void> {
  await page.keyboard.down(key);
  await step(page, ms);
  await page.keyboard.up(key);
}

/**
 * Plays until the time ends, topping the player's health up between chunks.
 * The whole loop runs INSIDE the page (one round trip), which keeps the test
 * fast even with software rendering.
 */
export async function runToTimeEnd(page: Page): Promise<void> {
  const finished = await page.evaluate(() => {
    const api = window.__PIRATE_TEST__!;
    for (let i = 0; i < 600; i++) {
      const snap = api.getSnapshot();
      if (snap.status === "over") return true;
      if (snap.player.health < 60) api.setPlayerHealth(snap.player.maxHealth);
      api.step(1000);
    }
    return false;
  });
  if (!finished) throw new Error("match did not end");
}

/** Advances `totalMs` in `chunkMs` pieces (in the page) and returns the peak enemy projectile count. */
export function stepTrackEnemyShots(
  page: Page,
  totalMs: number,
  chunkMs = 100,
): Promise<number> {
  return page.evaluate(
    ([total, chunk]) => {
      const api = window.__PIRATE_TEST__!;
      let peak = 0;
      for (let t = 0; t < total; t += chunk) {
        api.step(chunk);
        peak = Math.max(peak, api.getSnapshot().projectiles.enemy);
      }
      return peak;
    },
    [totalMs, chunkMs] as const,
  );
}

/** Finds a spot with a free horizontal lane of `length` px to its right (for shooting tests). */
export async function openLane(
  page: Page,
  length: number,
): Promise<{ x: number; y: number }> {
  const snap = await snapshot(page);
  const { width, height } = snap.arena;
  const clear = (x: number, y: number) =>
    snap.islands.every((i) => Math.hypot(i.x - x, i.y - y) > i.radius + 70);
  for (let gy = 120; gy < height - 100; gy += 30) {
    for (let gx = 120; gx + length < width - 100; gx += 30) {
      let ok = true;
      for (let d = 0; d <= length && ok; d += 25) ok = clear(gx + d, gy);
      if (ok) return { x: gx, y: gy };
    }
  }
  throw new Error("no open lane found");
}

/** Opens the "Network simulation" panel and selects a scenario. */
export async function selectScenario(page: Page, id: string): Promise<void> {
  const details = page.getByTestId("network-panel");
  if ((await details.getAttribute("open")) === null) {
    await details.locator("summary").click();
  }
  await page.getByTestId("scenario-select").selectOption(id);
}

export async function openLog(
  page: Page,
  tab: "ranking" | "history" = "ranking",
): Promise<void> {
  await page.goto(`/log?tab=${tab}&${runtimeQuery()}`);
}
