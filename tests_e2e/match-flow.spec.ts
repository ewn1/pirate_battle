/** [E2E: MATCH FLOW] End conditions, restart, persistence and cleanup. */
import {
  expect,
  openGame,
  presetOptions,
  runToTimeEnd,
  setHealth,
  snapshot,
  spawnEnemy,
  step,
  teleport,
  openWater,
  test,
  waitForStatus,
  KEYS,
} from "./helpers/fixtures";

test.describe("Match flow", () => {
  test("ends when the time runs out and registers the match", async ({
    page,
  }) => {
    await presetOptions(page, { sessionTimeSec: 60, spawnIntervalMs: 10000 });
    await openGame(page);
    await runToTimeEnd(page);
    await expect(page.getByTestId("result-panel")).toBeVisible();
    await expect(page.getByTestId("result-summary")).toContainText(/time/i);
    await expect(page.getByTestId("registration-status")).toHaveAttribute(
      "data-status",
      "saved",
    );
  });

  test("ends when the player is sunk", async ({ page }) => {
    await openGame(page);
    const spot = await openWater(page, 200);
    await teleport(page, spot.x, spot.y, 0);
    await setHealth(page, 10);
    await spawnEnemy(page, "chaser", spot.x + 100, spot.y);
    await step(page, 3000);
    await waitForStatus(page, "over");
    expect((await snapshot(page)).result?.reason).toBe("player_sunk");
    await expect(page.getByTestId("result-panel")).toBeVisible();
  });

  test("the simulation is frozen after the end", async ({ page }) => {
    await openGame(page);
    const spot = await openWater(page, 200);
    await teleport(page, spot.x, spot.y, 0);
    await setHealth(page, 1);
    await spawnEnemy(page, "chaser", spot.x + 90, spot.y);
    await step(page, 3000);
    await waitForStatus(page, "over");
    const frozen = await snapshot(page);
    await step(page, 2000);
    const later = await snapshot(page);
    expect(later.score).toBe(frozen.score);
    expect(later.elapsed).toBe(frozen.elapsed);
    expect(later.counts.spawned).toBe(frozen.counts.spawned);
  });

  test("Play again starts a clean match and keeps a single canvas", async ({
    page,
  }) => {
    await openGame(page);
    const spot = await openWater(page, 200);
    await teleport(page, spot.x, spot.y, 0);
    await setHealth(page, 1);
    await spawnEnemy(page, "chaser", spot.x + 90, spot.y);
    await step(page, 3000);
    await expect(page.getByTestId("result-panel")).toBeVisible();

    await page.getByTestId("play-again").click();
    await waitForStatus(page, "running");
    const snap = await snapshot(page);
    expect(snap.score).toBe(0);
    expect(snap.player.health).toBe(snap.player.maxHealth);
    expect(snap.elapsed).toBeLessThan(1);
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  test("the result survives a page reload", async ({ page }) => {
    await openGame(page);
    const spot = await openWater(page, 200);
    await teleport(page, spot.x, spot.y, 0);
    await setHealth(page, 1);
    await spawnEnemy(page, "chaser", spot.x + 90, spot.y);
    await step(page, 3000);
    const score = await page.getByTestId("result-score").textContent();
    await expect(page).toHaveURL(/\/game\/result/);
    await page.reload();
    await expect(page.getByTestId("result-panel")).toBeVisible();
    await expect(page.getByTestId("result-score")).toHaveText(score ?? "");
  });

  test("abandoning a match does not register it", async ({ page }) => {
    await openGame(page);
    await step(page, 2000);
    await page.getByTestId("pause-button").click();
    await page.getByTestId("menu-button").click();
    await expect(page.getByTestId("play-button")).toBeVisible();
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      KEYS.matches,
    );
    const parsed = stored ? JSON.parse(stored).state : { queue: [], saved: [] };
    expect(parsed.queue ?? []).toHaveLength(0);
    expect(parsed.saved ?? []).toHaveLength(0);
  });

  test("repeated navigation does not leak canvases or break the game", async ({
    page,
  }) => {
    await openGame(page);
    for (let i = 0; i < 3; i++) {
      await page.getByTestId("pause-button").click();
      await page.getByTestId("menu-button").click();
      await expect(page.locator("canvas")).toHaveCount(0);
      await page.getByTestId("play-button").click();
      await waitForStatus(page, "running");
      await expect(page.locator("canvas")).toHaveCount(1);
    }
  });
});
