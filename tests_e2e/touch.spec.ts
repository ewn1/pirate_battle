/** [E2E: TOUCH] Mobile controls (runs only in the "mobile" project). */
import { expect, openGame, snapshot, step, test } from "./helpers/fixtures";

test.describe("Touch controls", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile project only");

  test("controls are visible and inside the viewport", async ({ page }) => {
    await openGame(page, { manual: 1, seed: 7, touch: 1 });
    const viewport = page.viewportSize()!;
    for (const id of [
      "forward",
      "left",
      "right",
      "fire-front",
      "fire-left",
      "fire-right",
    ]) {
      const box = await page.getByTestId(`touch-${id}`).boundingBox();
      expect(box, id).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test("holding forward while firing works simultaneously", async ({
    page,
  }) => {
    await openGame(page, { manual: 1, seed: 7, touch: 1 });
    const before = await snapshot(page);
    const fire = page.getByTestId("touch-fire-front");
    const forward = page.getByTestId("touch-forward");

    await forward.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
    });
    await fire.dispatchEvent("pointerdown", {
      pointerId: 2,
      pointerType: "touch",
      isPrimary: false,
    });
    await step(page, 300);
    const during = await snapshot(page);
    expect(during.player.speed).toBeGreaterThan(0);
    expect(during.projectiles.player).toBeGreaterThanOrEqual(1);
    await fire.dispatchEvent("pointerup", {
      pointerId: 2,
      pointerType: "touch",
    });
    await forward.dispatchEvent("pointerup", {
      pointerId: 1,
      pointerType: "touch",
    });
    expect(
      Math.hypot(
        during.player.x - before.player.x,
        during.player.y - before.player.y,
      ),
    ).toBeGreaterThan(1);
  });

  test("portrait orientation shows a notice and pauses", async ({ page }) => {
    await openGame(page, { manual: 1, seed: 7, touch: 1 });
    await page.setViewportSize({ width: 400, height: 800 });
    await expect(page.getByTestId("orientation-notice")).toBeVisible();
    expect((await snapshot(page)).status).toBe("paused");
  });
});
