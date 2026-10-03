/** [E2E: VISUAL REGRESSION] Desktop only. Baselines: `npm run test:e2e:update`. */
import { expect, holdKey, openGame, openWater, presetOptions, runtimeQuery, spawnEnemy, step, teleport, test, waitForStatus } from "./helpers/fixtures";
import { playAndLose } from "./helpers/matches";

test.describe("Visual regression", () => {
  test("main menu", async ({ page }) => {
    await page.goto(`/?${runtimeQuery()}`);
    await expect(page).toHaveScreenshot("menu.png", { animations: "disabled" });
  });

  test("stable arena scene", async ({ page }) => {
    await presetOptions(page, { sessionTimeSec: 90, spawnIntervalMs: 10000 });
    await openGame(page, { manual: 1, seed: 7 });
    const spot = await openWater(page, 200);
    await teleport(page, spot.x, spot.y, 0);
    await spawnEnemy(page, "shooter", spot.x + 250, spot.y - 60);
    await holdKey(page, "KeyW", 100);
    await step(page, 100);
    await expect(page.locator("canvas")).toHaveScreenshot("arena.png", { maxDiffPixelRatio: 0.02, animations: "disabled" });
  });

  test("result panel", async ({ page }) => {
    await page.goto(`/?${runtimeQuery({ manual: 1, seed: 7 })}`);
    await playAndLose(page);
    await waitForStatus(page, "over");
    await expect(page.getByTestId("registration-status")).toHaveAttribute("data-status", "saved");
    await expect(page.getByTestId("result-panel")).toHaveScreenshot("result.png", { animations: "disabled" });
  });
});
