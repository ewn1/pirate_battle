/** [E2E: PAUSE] Manual and automatic pause; nothing advances while paused. */
import { expect, openGame, snapshot, step, test, waitForStatus } from "./helpers/fixtures";

test.describe("Pause", () => {
  test.beforeEach(async ({ page }) => {
    await openGame(page);
    await step(page, 1000);
  });

  test("manual pause freezes everything and resume continues", async ({ page }) => {
    await page.getByTestId("pause-button").click();
    await waitForStatus(page, "paused");
    await expect(page.getByTestId("pause-dialog")).toBeVisible();
    const before = await snapshot(page);
    await step(page, 3000);
    const during = await snapshot(page);
    expect(during.timeRemaining).toBe(before.timeRemaining);
    expect(during.counts.spawned).toBe(before.counts.spawned);
    expect(during.player.x).toBe(before.player.x);

    await page.getByTestId("resume-button").click();
    await waitForStatus(page, "running");
    await step(page, 1000);
    expect((await snapshot(page)).timeRemaining).toBeLessThan(before.timeRemaining);
  });

  test("Escape and P toggle the pause", async ({ page }) => {
    await page.keyboard.press("Escape");
    await waitForStatus(page, "paused");
    await page.getByTestId("resume-button").click();
    await waitForStatus(page, "running");
    await page.keyboard.press("KeyP");
    await waitForStatus(page, "paused");
  });

  test("losing window focus pauses automatically", async ({ page }) => {
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await waitForStatus(page, "paused");
    await expect(page.getByTestId("pause-dialog")).toContainText(/focus/i);
  });

  test("hiding the tab pauses automatically", async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitForStatus(page, "paused");
    await expect(page.getByTestId("pause-dialog")).toContainText(/hidden/i);
  });

  test("repeated pauses do not accumulate time or listeners", async ({ page }) => {
    const before = await snapshot(page);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Escape");
      await waitForStatus(page, "paused");
      await page.getByTestId("resume-button").click();
      await waitForStatus(page, "running");
    }
    const after = await snapshot(page);
    expect(after.elapsed).toBeCloseTo(before.elapsed, 1);
  });
});
