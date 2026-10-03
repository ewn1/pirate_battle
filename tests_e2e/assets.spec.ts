/** [E2E: ASSETS] Loading screen, success path and failure + retry path. */
import { expect, KEYS, runtimeQuery, test, waitForStatus } from "./helpers/fixtures";

test.describe("Asset loading", () => {
  test("loads the assets and starts the match", async ({ page }) => {
    await page.goto(`/?${runtimeQuery({ manual: 1, seed: 1 })}`);
    await page.getByTestId("play-button").click();
    await waitForStatus(page, "running");
    await expect(page.getByTestId("loading-screen")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  test.describe("failure", () => {
    // The browser logs the failed texture request; that is the expected failure.
    test.use({ allowedConsole: [/Failed to load resource|ship_1|net::ERR|asset/i] });

    test("shows an error, then recovers with Retry", async ({ page }) => {
      await page.addInitScript((key) => localStorage.setItem(key, "1"), KEYS.failAssets);
      await page.goto(`/?${runtimeQuery({ manual: 1, seed: 1 })}`);
      await page.getByTestId("play-button").click();
      await expect(page.getByTestId("loading-error")).toBeVisible();

      await page.evaluate((key) => localStorage.removeItem(key), KEYS.failAssets);
      await page.getByTestId("retry-load").click();
      await waitForStatus(page, "running");
      await expect(page.getByTestId("loading-screen")).toHaveCount(0);
    });
  });
});
