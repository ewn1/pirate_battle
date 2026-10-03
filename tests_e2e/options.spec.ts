/** [E2E: OPTIONS] Limits, persistence and applying values to a match. */
import {
  expect,
  openGame,
  presetOptions,
  runtimeQuery,
  snapshot,
  test,
} from "./helpers/fixtures";

test.describe("Options", () => {
  test("changes, validates and persists session time and spawn interval", async ({
    page,
  }) => {
    await page.goto(`/options?${runtimeQuery()}`);
    const time = page.locator("#session-time");
    const spawn = page.locator("#spawn-time");

    // Defaults
    await expect(time).toHaveValue(/90|1:30/);
    await page.getByTestId("session-time-plus").click();
    await page.getByTestId("spawn-time-minus").click();
    await page.getByTestId("save-options").click();
    await expect(page.getByTestId("options-saved")).toBeVisible();

    await page.reload();
    await expect(time).not.toHaveValue(/^90$/);
    await expect(spawn).not.toHaveValue(/^3$/);
  });

  test("does not exceed the allowed limits", async ({ page }) => {
    await page.goto(`/options?${runtimeQuery()}`);
    for (let i = 0; i < 30; i++)
      await page.getByTestId("session-time-plus").click();
    for (let i = 0; i < 30; i++)
      await page.getByTestId("spawn-time-minus").click();
    await page.getByTestId("save-options").click();
    const stored = await page.evaluate(
      () => JSON.parse(localStorage.getItem("pirate-battle:options:v1")!).state,
    );
    expect(stored.sessionTimeSec).toBeLessThanOrEqual(180);
    expect(stored.spawnIntervalMs).toBeGreaterThanOrEqual(500); // documented minimum: 0.5 s
    for (let i = 0; i < 40; i++)
      await page.getByTestId("session-time-minus").click();
    for (let i = 0; i < 40; i++)
      await page.getByTestId("spawn-time-plus").click();
    await page.getByTestId("save-options").click();
    const low = await page.evaluate(
      () => JSON.parse(localStorage.getItem("pirate-battle:options:v1")!).state,
    );
    expect(low.sessionTimeSec).toBeGreaterThanOrEqual(60);
    expect(low.spawnIntervalMs).toBeLessThanOrEqual(10000);
  });

  test("the configured duration is used by the next match", async ({
    page,
  }) => {
    await presetOptions(page, { sessionTimeSec: 60, spawnIntervalMs: 3000 });
    await openGame(page);
    const snap = await snapshot(page);
    expect(Math.round(snap.timeRemaining)).toBe(60);
  });
});
